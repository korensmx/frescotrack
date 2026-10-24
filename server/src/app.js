// Aquí viven todas las "puertas" (rutas) de la API de FrescoTrack.
// El celular del técnico toca estas puertas para guardar y leer datos.
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import QRCode from 'qrcode';
import { today, addMonths, addDays, daysBetween, isValidISODate } from './dates.js';
import { securityHeaders, rateLimit, createUserLock } from './security.js';
import { tempCopy } from './backup.js';

// Mensaje de antes: quien lo tenga guardado tal cual recibe el nuevo (con {precio}).
const OLD_DEFAULT_TEMPLATE =
  'Hola {cliente} 👋, soy {tecnico} de {negocio}. Ya pasaron {meses} meses desde el último ' +
  'mantenimiento de tu minisplit {equipo} ({ubicacion}). ¿Te agendo una limpieza esta semana ' +
  'para que siga enfriando como nuevo? 🧊';
export const DEFAULT_TEMPLATE =
  'Hola {cliente} 👋, soy {tecnico} de {negocio}. Ya pasaron {meses} meses desde el último ' +
  'mantenimiento de tu minisplit {equipo} ({ubicacion}). El mantenimiento te queda en {precio}. ' +
  '¿Te agendo una limpieza esta semana para que siga enfriando como nuevo? 🧊';
const userTemplate = (u) => (!u.message_template || u.message_template === OLD_DEFAULT_TEMPLATE
  ? DEFAULT_TEMPLATE : u.message_template);

// 1500 -> "$1,500"
export const formatMoney = (n) => '$' + Math.round(n).toLocaleString('en-US');

const SERVICE_TYPES = ['Mantenimiento preventivo', 'Instalación', 'Carga de gas', 'Reparación', 'Diagnóstico'];
const TRIAL_DAYS = 14;
const MAX_MONEY = 1_000_000;       // tope para precios y costos (evita números absurdos)
const MAX_UNUSED_QR = 500;         // stickers apartados sin usar por técnico
const MAX_SENDS_PER_DAY = 300;     // mensajes de WhatsApp por técnico al día

// Límites de los "porteros". Las pruebas los suben para no estorbar.
export const DEFAULT_LIMITS = {
  login:    { windowMs: 15 * 60_000, max: 10 },   // 10 intentos cada 15 min por IP + correo
  loginIp:  { windowMs: 15 * 60_000, max: 50 },   // 50 intentos cada 15 min por IP
  register: { windowMs: 60 * 60_000, max: 5 },    // 5 cuentas por hora por IP
  public:   { windowMs: 60_000, max: 60 },        // 60 consultas de stickers por minuto por IP
  webhook:  { windowMs: 60_000, max: 120 },
  api:      { windowMs: 60_000, max: 300 },       // por técnico
  qrSheet:  { windowMs: 60 * 60_000, max: 20 },   // 20 hojas de stickers por hora por técnico
};

// Hash de mentira para que "correo no existe" tarde lo mismo que "contraseña mala".
const DUMMY_HASH = bcrypt.hashSync('frescotrack-dummy-password', 10);

// Error con código HTTP, para responder bonito.
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Deja solo los 10 dígitos de un teléfono mexicano.
function cleanPhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('52')) digits = digits.slice(2);
  if (digits.length === 13 && digits.startsWith('521')) digits = digits.slice(3);
  if (digits.length !== 10) fail(400, 'El teléfono debe tener 10 dígitos');
  return digits;
}

function requireText(value, field, max = 200) {
  const v = String(value ?? '').trim();
  if (!v) fail(400, `Falta: ${field}`);
  return v.slice(0, max);
}
const optText = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const toMoney = (value, fallback) => Math.min(MAX_MONEY, toInt(value, fallback));

// Tabla de precios del mantenimiento: cambia según si el minisplit es normal
// o inverter y según cuántas toneladas tiene. Se guarda como texto JSON.
export const PRICE_KINDS = ['normal', 'inverter'];
export const PRICE_TONS = ['1', '1.5', '2', '2.5', '3'];

// "1.5 Ton" -> "1.5". Si no es una de las medidas de la tabla, regresa null.
export function tonsKey(tons) {
  const n = Number.parseFloat(String(tons ?? '').replace(',', '.'));
  return Number.isFinite(n) && PRICE_TONS.includes(String(n)) ? String(n) : null;
}

// Lee la tabla guardada y rellena los huecos con el precio normal del técnico.
export function readPriceTable(raw, fallback) {
  let saved = {};
  try { saved = raw ? JSON.parse(raw) : {}; } catch { saved = {}; }
  return Object.fromEntries(PRICE_KINDS.map((kind) => [kind, Object.fromEntries(PRICE_TONS.map((t) => {
    const v = saved?.[kind]?.[t];
    return [t, Number.isInteger(v) && v >= 0 ? v : fallback];
  }))]));
}

// Precio sugerido para un equipo según su tipo y tonelaje.
export function priceFor(user, tons, inverter) {
  const key = tonsKey(tons);
  if (!key) return user.default_price;
  return readPriceTable(user.price_table, user.default_price)[inverter ? 'inverter' : 'normal'][key];
}

// Limpia lo que manda el celular: solo números válidos en las 10 casillas.
function cleanPriceTable(input, current) {
  if (!input || typeof input !== 'object') fail(400, 'La tabla de precios no es válida');
  return Object.fromEntries(PRICE_KINDS.map((kind) => [kind, Object.fromEntries(PRICE_TONS.map((t) =>
    [t, toMoney(input?.[kind]?.[t], current[kind][t])]))]));
}

function randomQrCode() {
  // 8 caracteres fáciles de leer (sin 0/O ni 1/I para no confundirse).
  // Son más de un billón de combinaciones, y además la base de datos revisa que no se repita.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  return 'FT-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

// El QR puede traer la liga completa (https://.../e/FT-ABC123) o solo el código.
export function extractQrCode(text) {
  const match = String(text || '').toUpperCase().match(/FT-[A-Z0-9]{4,12}/);
  return match ? match[0] : null;
}

export function buildMessage(template, data) {
  return (template || DEFAULT_TEMPLATE).replace(/\{(\w+)\}/g, (all, key) =>
    Object.hasOwn(data, key) && data[key] !== undefined && data[key] !== null ? String(data[key]) : all);
}

export function createApp({
  db, jwtSecret, publicUrl = '', evolution, mercadopago, supportPhone = '', sendGapMs = 1500,
  trustProxy = false, limits = DEFAULT_LIMITS, adminToken = '',
}) {
  const app = express();
  app.disable('x-powered-by');
  // Detrás de Dokploy (Traefik) la IP real viene en X-Forwarded-For.
  app.set('trust proxy', trustProxy);
  app.use(securityHeaders);
  app.use(express.json({ limit: '200kb' }));

  const lim = { ...DEFAULT_LIMITS, ...limits };

  // Libreta de fallas: cuántos errores del servidor van y cuál fue el último.
  // n8n la lee cada rato para avisarle a Jerry si algo se está rompiendo.
  const startedAt = new Date();
  const problems = { count: 0, last: null, recent: [] };
  const recordProblem = (where, err) => {
    problems.count++;
    problems.last = { at: new Date().toISOString(), where, message: String(err?.message || err).slice(0, 300) };
    problems.recent = [problems.last, ...problems.recent].slice(0, 10);
  };
  app.locals.recordProblem = recordProblem;
  const sendLock = createUserLock();

  // Envuelve rutas async para que los errores lleguen al manejador final.
  const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // ---------- Ayudantes de datos ----------
  const getUser = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  // Crea un código nuevo y lo aparta para este técnico. Si por casualidad ya
  // existe, la base de datos lo rechaza (es llave única) y probamos otro.
  const unusedQrCount = (userId) => db.prepare(`SELECT COUNT(*) AS n FROM qr_codes q
    WHERE q.user_id = ? AND NOT EXISTS (SELECT 1 FROM equipment e WHERE e.qr_code = q.code)`).get(userId).n;

  function reserveNewQrCode(userId) {
    for (let i = 0; i < 10; i++) {
      const code = randomQrCode();
      const r = db.prepare('INSERT OR IGNORE INTO qr_codes (code, user_id) VALUES (?, ?)').run(code, userId);
      if (r.changes === 1) return code;
    }
    throw new Error('No se pudo generar un código único');
  }

  // Revisa que el sticker se pueda usar: si ya está apartado, debe ser de este técnico.
  // Si no estaba apartado (por ejemplo, un sticker escrito a mano), se aparta ahora.
  function claimQrCode(userId, code) {
    const owner = db.prepare('SELECT user_id FROM qr_codes WHERE code = ?').get(code);
    if (owner && owner.user_id !== userId) fail(409, 'Este sticker pertenece a otro técnico');
    if (!owner) db.prepare('INSERT INTO qr_codes (code, user_id) VALUES (?, ?)').run(code, userId);
  }

  function publicUser(u) {
    const trialDaysLeft = Math.max(0, daysBetween(today(), u.trial_ends_at));
    return {
      id: u.id, email: u.email, name: u.name, businessName: u.business_name,
      phone: u.phone, city: u.city, defaultPrice: u.default_price,
      priceTable: readPriceTable(u.price_table, u.default_price),
      messageTemplate: userTemplate(u),
      autoSend: Boolean(u.auto_send), autoSendHour: u.auto_send_hour,
      plan: u.plan, planStatus: u.plan_status || null, trialEndsAt: u.trial_ends_at, trialDaysLeft,
      active: u.plan === 'pro' || trialDaysLeft > 0,
    };
  }

  // "v" es la versión de las llaves del técnico: al cambiar la contraseña sube y
  // todas las sesiones viejas (otros celulares, una robada) dejan de servir.
  const signToken = (user) => jwt.sign({ sub: user.id, v: user.token_version }, jwtSecret,
    { expiresIn: '30d', algorithm: 'HS256' });

  function equipmentRow(e) {
    const daysLeft = daysBetween(today(), e.next_service_date);
    return {
      id: e.id, clientId: e.client_id, qrCode: e.qr_code, brand: e.brand, tons: e.tons,
      refrigerant: e.refrigerant, inverter: Boolean(e.inverter), location: e.location,
      intervalMonths: e.interval_months, price: e.price,
      lastServiceDate: e.last_service_date, nextServiceDate: e.next_service_date,
      daysLeft,
      status: daysLeft < 0 ? 'overdue' : daysLeft <= 7 ? 'due' : daysLeft <= 30 ? 'soon' : 'ok',
      clientName: e.client_name, clientPhone: e.client_phone,
      lastReminderAt: e.last_reminder_at || null,
    };
  }

  // Trae equipos del técnico con datos del cliente y el último recordatorio
  // enviado DESPUÉS del último servicio (si ya le escribimos, no vuelve a la cola).
  const EQUIPMENT_SELECT = `
    SELECT e.*, c.name AS client_name, c.phone AS client_phone,
      (SELECT MAX(r.sent_at) FROM reminders r
        WHERE r.equipment_id = e.id AND date(r.sent_at) >= e.last_service_date) AS last_reminder_at
    FROM equipment e JOIN clients c ON c.id = e.client_id`;

  function ownedEquipment(userId, id) {
    const e = db.prepare(`${EQUIPMENT_SELECT} WHERE e.id = ? AND e.user_id = ?`).get(id, userId);
    if (!e) fail(404, 'Equipo no encontrado');
    return e;
  }

  function ownedClient(userId, id) {
    const c = db.prepare('SELECT * FROM clients WHERE id = ? AND user_id = ?').get(id, userId);
    if (!c) fail(404, 'Cliente no encontrado');
    return c;
  }

  const clientRow = (c) => ({
    id: c.id, name: c.name, phone: c.phone, address: c.address, notes: c.notes,
    equipmentCount: c.equipment_count ?? undefined, nextServiceDate: c.next_service_date ?? undefined,
  });

  // ¿Este equipo ya toca recordatorio? (vence en 7 días o menos y no le hemos escrito)
  const needsReminder = (e) => daysBetween(today(), e.next_service_date) <= 7 && !e.last_reminder_at;

  // Todos los equipos de ese cliente que tocan recordatorio, para mandarle UN solo
  // mensaje con el precio sumado. Siempre incluye el equipo que se pidió.
  function reminderGroup(user, e) {
    const others = db.prepare(`${EQUIPMENT_SELECT} WHERE e.user_id = ? AND e.client_id = ? AND e.id != ?
        ORDER BY e.next_service_date, e.id`).all(user.id, e.client_id, e.id).filter(needsReminder);
    return [e, ...others];
  }

  // El precio sale de la tabla del técnico (Normal/Inverter y toneladas).
  // Si el equipo no tiene una medida de la tabla, se usa el precio base.
  const reminderTotal = (user, group) => group.reduce((sum, e) => sum + priceFor(user, e.tons, e.inverter), 0);

  function reminderMessage(user, e, group = reminderGroup(user, e)) {
    const andJoin = (list) => list.length > 1 ? `${list.slice(0, -1).join(', ')} y ${list.at(-1)}` : list[0];
    return buildMessage(userTemplate(user), {
      cliente: e.client_name.split(' ')[0],
      tecnico: user.name.split(' ')[0],
      negocio: user.business_name || user.name,
      meses: e.interval_months,
      equipo: andJoin(group.map((g) => [g.brand, g.tons].filter(Boolean).join(' ') || 'minisplit')),
      ubicacion: andJoin([...new Set(group.map((g) => g.location || 'tu casa'))]),
      fecha: e.next_service_date,
      precio: formatMoney(reminderTotal(user, group)),
    });
  }

  // ---------- Rutas públicas ----------
  // Además de contestar, revisa que la base de datos responda.
  app.get('/api/health', (req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({ ok: true });
    } catch (err) {
      recordProblem('health', err);
      res.status(503).json({ ok: false, error: 'La base de datos no responde' });
    }
  });

  app.get('/api/config', (req, res) => res.json({
    whatsappApi: Boolean(evolution?.enabled), payments: Boolean(mercadopago?.enabled),
    price: mercadopago?.price ?? 299, supportPhone, serviceTypes: SERVICE_TYPES,
  }));

  const loginLimit = rateLimit({ ...lim.login, key: (req) => `${req.ip}|${String(req.body?.email || '').trim().toLowerCase()}` });
  const loginIpLimit = rateLimit(lim.loginIp);
  const registerLimit = rateLimit({ ...lim.register, message: 'Se crearon muchas cuentas desde esta conexión. Intenta más tarde.' });

  app.post('/api/auth/register', registerLimit, h(async (req, res) => {
    const email = requireText(req.body.email, 'correo').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Correo no válido');
    const password = String(req.body.password || '');
    if (password.length < 8) fail(400, 'La contraseña debe tener al menos 8 caracteres');
    if (password.length > 128) fail(400, 'La contraseña es demasiado larga');
    const name = requireText(req.body.name, 'nombre', 100);
    const phone = cleanPhone(req.body.phone);
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) fail(409, 'Ese correo ya tiene cuenta');

    const hash = await bcrypt.hash(password, 10);
    const r = db.prepare(`INSERT INTO users (email, password_hash, name, business_name, phone, city, trial_ends_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      email, hash, name, optText(req.body.businessName, 100), phone, optText(req.body.city, 100),
      addDays(today(), TRIAL_DAYS));
    const user = getUser(Number(r.lastInsertRowid));
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }));

  app.post('/api/auth/login', loginIpLimit, loginLimit, h(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    // Siempre comparamos contra algo, para no delatar qué correos existen por el tiempo de respuesta.
    const ok = await bcrypt.compare(String(req.body.password || '').slice(0, 128), user ? user.password_hash : DUMMY_HASH);
    if (!ok || !user) fail(401, 'Correo o contraseña incorrectos');
    res.json({ token: signToken(user), user: publicUser(user) });
  }));

  // Lo que ve el cliente final al escanear el sticker (sin cuenta, sin precios ni su teléfono).
  app.get('/api/public/equipment/:code', rateLimit(lim.public), (req, res) => {
    const code = extractQrCode(req.params.code);
    const e = code && db.prepare(`SELECT e.*, c.name AS client_name, u.name AS tech_name,
        u.business_name, u.phone AS tech_phone, u.city
      FROM equipment e JOIN clients c ON c.id = e.client_id JOIN users u ON u.id = e.user_id
      WHERE e.qr_code = ?`).get(code);
    if (!e) return res.status(404).json({ error: 'Este sticker todavía no está registrado' });
    const services = db.prepare('SELECT date, type, notes FROM services WHERE equipment_id = ? ORDER BY date DESC, id DESC LIMIT 20').all(e.id);
    const daysLeft = daysBetween(today(), e.next_service_date);
    res.json({
      qrCode: e.qr_code, brand: e.brand, tons: e.tons, location: e.location,
      clientFirstName: e.client_name.split(' ')[0],
      lastServiceDate: e.last_service_date, nextServiceDate: e.next_service_date,
      status: daysLeft < 0 ? 'overdue' : 'ok',
      technician: { name: e.tech_name, businessName: e.business_name, phone: e.tech_phone, city: e.city },
      services,
    });
  });

  // Aviso de Mercado Pago cuando una suscripción cambia (pagó, pausó, canceló).
  // Nunca confiamos en lo que dice el aviso: volvemos a preguntarle a Mercado Pago.
  app.post('/api/billing/webhook', rateLimit(lim.webhook), h(async (req, res) => {
    const type = req.body?.type || req.query.type || req.query.topic;
    const dataId = req.body?.data?.id || req.query['data.id'] || req.query.id;
    if (!mercadopago?.enabled || type !== 'subscription_preapproval' || !dataId) return res.sendStatus(200);
    if (!mercadopago.isValidSignature({ signature: req.get('x-signature'), requestId: req.get('x-request-id'), dataId })) {
      return res.sendStatus(401);
    }
    const sub = await mercadopago.getSubscription(dataId);
    applySubscription(sub);
    res.sendStatus(200);
  }));

  // ¿Esta suscripción es de verdad "FrescoTrack Pro" por el precio correcto?
  // (Así otra suscripción de la misma cuenta de Mercado Pago, o una más barata, no regala Pro.)
  const isProSubscription = (sub) => sub?.reason === 'FrescoTrack Pro' &&
    sub?.auto_recurring?.currency_id === 'MXN' &&
    Number(sub?.auto_recurring?.transaction_amount) >= (mercadopago?.price ?? 299);

  // Guarda en la base de datos lo que Mercado Pago dice de la suscripción.
  function applySubscription(sub) {
    const userId = Number(sub?.external_reference);
    const user = userId ? getUser(userId) : null;
    if (!user || !isProSubscription(sub)) return null;
    // Un aviso de una suscripción vieja (ya reemplazada) no debe quitarle Pro a quien sí pagó la nueva.
    if (sub.status !== 'authorized' && user.mp_preapproval_id && user.mp_preapproval_id !== sub.id) return user;
    const plan = sub.status === 'authorized' ? 'pro' : 'trial';
    db.prepare('UPDATE users SET plan = ?, plan_status = ?, mp_preapproval_id = ? WHERE id = ?')
      .run(plan, sub.status, sub.id, userId);
    // Apuntamos cuándo empezó o dejó de pagar, para contar ventas por semana.
    if (plan === 'pro' && user.plan !== 'pro') {
      db.prepare("UPDATE users SET pro_since = datetime('now'), pro_ended_at = NULL WHERE id = ?").run(userId);
    } else if (plan !== 'pro' && user.plan === 'pro') {
      db.prepare("UPDATE users SET pro_ended_at = datetime('now') WHERE id = ?").run(userId);
    }
    return getUser(userId);
  }

  // ---------- Reporte para el dueño (Jerry) ----------
  // Solo con la llave ADMIN_TOKEN. Si no hay llave configurada, la puerta ni existe.
  const isAdmin = (req) => {
    const header = req.get('authorization') || '';
    const given = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
    const expected = Buffer.from(adminToken);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  };

  app.get('/api/admin/stats', rateLimit(lim.webhook), (req, res) => {
    if (!adminToken) return res.status(404).json({ error: 'Ruta no encontrada' });
    if (!isAdmin(req)) return res.status(401).json({ error: 'Llave incorrecta' });
    const days = Math.min(90, Math.max(1, toInt(req.query.days, 7)));
    const since = `-${days} days`;
    const count = (sql, ...args) => db.prepare(sql).get(...args).n;
    const price = mercadopago?.price ?? 299;
    const proActive = count("SELECT COUNT(*) AS n FROM users WHERE plan = 'pro'");
    res.json({
      generatedAt: new Date().toISOString(),
      periodDays: days,
      price,
      users: {
        total: count('SELECT COUNT(*) AS n FROM users'),
        newInPeriod: count("SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now', ?)", since),
        trialActive: count("SELECT COUNT(*) AS n FROM users WHERE plan = 'trial' AND trial_ends_at >= ?", today()),
        trialEndingSoon: count("SELECT COUNT(*) AS n FROM users WHERE plan = 'trial' AND trial_ends_at BETWEEN ? AND ?", today(), addDays(today(), 3)),
      },
      sales: {
        proActive,
        mrr: proActive * price,
        newProInPeriod: count("SELECT COUNT(*) AS n FROM users WHERE pro_since >= datetime('now', ?)", since),
        cancelledInPeriod: count("SELECT COUNT(*) AS n FROM users WHERE plan <> 'pro' AND pro_ended_at >= datetime('now', ?)", since),
        newProList: db.prepare(`SELECT name, business_name AS businessName, city, email, pro_since AS proSince
          FROM users WHERE pro_since >= datetime('now', ?) ORDER BY pro_since DESC LIMIT 20`).all(since),
      },
      usage: {
        equipmentTotal: count('SELECT COUNT(*) AS n FROM equipment'),
        equipmentNewInPeriod: count("SELECT COUNT(*) AS n FROM equipment WHERE created_at >= datetime('now', ?)", since),
        servicesInPeriod: count("SELECT COUNT(*) AS n FROM services WHERE created_at >= datetime('now', ?)", since),
        rescuedInPeriod: count("SELECT COUNT(*) AS n FROM services WHERE rescued = 1 AND created_at >= datetime('now', ?)", since),
        remindersInPeriod: count("SELECT COUNT(*) AS n FROM reminders WHERE sent_at >= datetime('now', ?)", since),
        activeTechsInPeriod: count(`SELECT COUNT(DISTINCT e.user_id) AS n FROM services s JOIN equipment e ON e.id = s.equipment_id
          WHERE s.created_at >= datetime('now', ?)`, since),
      },
      server: {
        startedAt: startedAt.toISOString(),
        uptimeHours: Math.round((Date.now() - startedAt) / 36e5 * 10) / 10,
        whatsappApi: Boolean(evolution?.enabled),
        payments: Boolean(mercadopago?.enabled),
        errorsSinceStart: problems.count,
        lastError: problems.last,
        recentErrors: problems.recent,
      },
    });
  });

  // Descarga una copia completa de la base de datos (para guardarla fuera del servidor).
  // n8n la baja cada noche con la misma llave ADMIN_TOKEN.
  app.get('/api/admin/backup', rateLimit(lim.webhook), (req, res, next) => {
    if (!adminToken) return res.status(404).json({ error: 'Ruta no encontrada' });
    if (!isAdmin(req)) return res.status(401).json({ error: 'Llave incorrecta' });
    let file;
    try { file = tempCopy(db); } catch (err) { return next(err); }
    const name = `frescotrack-${today()}.db`;
    res.set('Cache-Control', 'no-store');
    res.download(file, name, () => fs.rm(file, { force: true }, () => {}));
  });

  // ---------- A partir de aquí, solo con sesión iniciada ----------
  const auth = (req, res, next) => {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    try {
      const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      const user = getUser(payload.sub);
      if (!user || (payload.v ?? 0) !== user.token_version) throw new Error('no user');
      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: 'Tu sesión expiró, vuelve a entrar' });
    }
  };
  const api = express.Router();
  api.use(auth);
  api.use(rateLimit({ ...lim.api, key: (req) => `u${req.user.id}` }));

  // Si la prueba gratis terminó y no ha pagado, puede ver sus datos pero no agregar ni cambiar.
  // Ojo: /qr/sheet es GET pero aparta stickers nuevos, así que también cuenta como "cambiar".
  api.use((req, res, next) => {
    const free = (req.method === 'GET' && !req.path.startsWith('/qr/')) ||
      req.path.startsWith('/me') || req.path.startsWith('/billing');
    if (free || publicUser(req.user).active) return next();
    res.status(402).json({ error: 'Tu prueba gratis terminó. Activa FrescoTrack Pro para seguir.', code: 'subscription_required' });
  });

  api.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

  api.put('/me', (req, res) => {
    const u = req.user;
    const b = req.body;
    db.prepare(`UPDATE users SET name = ?, business_name = ?, phone = ?, city = ?, default_price = ?, message_template = ?,
      auto_send = ?, auto_send_hour = ? WHERE id = ?`).run(
      b.name !== undefined ? requireText(b.name, 'nombre', 100) : u.name,
      b.businessName !== undefined ? optText(b.businessName, 100) : u.business_name,
      b.phone !== undefined ? cleanPhone(b.phone) : u.phone,
      b.city !== undefined ? optText(b.city, 100) : u.city,
      b.defaultPrice !== undefined ? toMoney(b.defaultPrice, u.default_price) : u.default_price,
      b.messageTemplate !== undefined ? (optText(b.messageTemplate, 1000) || null) : u.message_template,
      b.autoSend !== undefined ? (b.autoSend ? 1 : 0) : u.auto_send,
      b.autoSendHour !== undefined ? Math.min(23, Math.max(0, toInt(b.autoSendHour, u.auto_send_hour))) : u.auto_send_hour,
      u.id);
    res.json({ user: publicUser(getUser(u.id)) });
  });

  // Guardar la tabla de precios. Si applyToEquipment viene en true, también se
  // actualiza el precio sugerido de los equipos que ya estaban registrados.
  api.put('/me/prices', (req, res) => {
    const u = req.user;
    const table = cleanPriceTable(req.body.priceTable, readPriceTable(u.price_table, u.default_price));
    let updated = 0;
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE users SET price_table = ? WHERE id = ?').run(JSON.stringify(table), u.id);
      if (req.body.applyToEquipment) {
        const setPrice = db.prepare('UPDATE equipment SET price = ? WHERE id = ?');
        for (const e of db.prepare('SELECT id, tons, inverter FROM equipment WHERE user_id = ?').all(u.id)) {
          const key = tonsKey(e.tons);
          if (key) updated += setPrice.run(table[e.inverter ? 'inverter' : 'normal'][key], e.id).changes;
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    res.json({ user: publicUser(getUser(u.id)), updatedEquipment: updated });
  });

  api.put('/me/password', h(async (req, res) => {
    const ok = await bcrypt.compare(String(req.body.currentPassword || ''), req.user.password_hash);
    if (!ok) fail(400, 'La contraseña actual no es correcta');
    const next = String(req.body.newPassword || '');
    if (next.length < 8) fail(400, 'La contraseña nueva debe tener al menos 8 caracteres');
    if (next.length > 128) fail(400, 'La contraseña es demasiado larga');
    // Subir token_version cierra la sesión en todos los demás celulares.
    db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?')
      .run(await bcrypt.hash(next, 10), req.user.id);
    res.json({ ok: true, token: signToken(getUser(req.user.id)) });
  }));

  // ----- Clientes -----
  api.get('/clients', (req, res) => {
    const rows = db.prepare(`SELECT c.*, COUNT(e.id) AS equipment_count, MIN(e.next_service_date) AS next_service_date
      FROM clients c LEFT JOIN equipment e ON e.client_id = c.id
      WHERE c.user_id = ? GROUP BY c.id ORDER BY c.name COLLATE NOCASE`).all(req.user.id);
    res.json({ clients: rows.map(clientRow) });
  });

  api.post('/clients', (req, res) => {
    const r = db.prepare('INSERT INTO clients (user_id, name, phone, address, notes) VALUES (?, ?, ?, ?, ?)').run(
      req.user.id, requireText(req.body.name, 'nombre del cliente', 120), cleanPhone(req.body.phone),
      optText(req.body.address), optText(req.body.notes, 1000));
    res.status(201).json({ client: clientRow(ownedClient(req.user.id, Number(r.lastInsertRowid))) });
  });

  api.get('/clients/:id', (req, res) => {
    const c = ownedClient(req.user.id, req.params.id);
    const equipment = db.prepare(`${EQUIPMENT_SELECT} WHERE e.client_id = ? ORDER BY e.next_service_date`).all(c.id);
    res.json({ client: clientRow(c), equipment: equipment.map(equipmentRow) });
  });

  api.put('/clients/:id', (req, res) => {
    const c = ownedClient(req.user.id, req.params.id);
    const b = req.body;
    db.prepare('UPDATE clients SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?').run(
      b.name !== undefined ? requireText(b.name, 'nombre del cliente', 120) : c.name,
      b.phone !== undefined ? cleanPhone(b.phone) : c.phone,
      b.address !== undefined ? optText(b.address) : c.address,
      b.notes !== undefined ? optText(b.notes, 1000) : c.notes, c.id);
    res.json({ client: clientRow(ownedClient(req.user.id, c.id)) });
  });

  api.delete('/clients/:id', (req, res) => {
    const c = ownedClient(req.user.id, req.params.id);
    db.prepare('DELETE FROM clients WHERE id = ?').run(c.id);
    res.json({ ok: true });
  });

  // ----- Equipos (minisplits) -----
  api.get('/equipment', (req, res) => {
    const rows = db.prepare(`${EQUIPMENT_SELECT} WHERE e.user_id = ? ORDER BY e.next_service_date`).all(req.user.id);
    res.json({ equipment: rows.map(equipmentRow) });
  });

  // Al escanear: ¿este sticker ya es de un equipo mío?
  api.get('/equipment/by-qr/:code', (req, res) => {
    const code = extractQrCode(req.params.code);
    if (!code) fail(400, 'Ese QR no es de FrescoTrack');
    const e = db.prepare(`${EQUIPMENT_SELECT} WHERE e.qr_code = ?`).get(code);
    if (!e) {
      const owner = db.prepare('SELECT user_id FROM qr_codes WHERE code = ?').get(code);
      if (owner && owner.user_id !== req.user.id) fail(409, 'Este sticker pertenece a otro técnico');
      return res.json({ code, equipment: null });
    }
    if (e.user_id !== req.user.id) fail(409, 'Este sticker ya pertenece a otro técnico');
    res.json({ code, equipment: equipmentRow(e) });
  });

  // Registrar un equipo nuevo. Se puede mandar clientId (cliente existente)
  // o los datos de un cliente nuevo (clientName + clientPhone).
  api.post('/equipment', (req, res) => {
    const b = req.body;
    const scanned = extractQrCode(b.qrCode);
    if (scanned && db.prepare('SELECT 1 FROM equipment WHERE qr_code = ?').get(scanned)) fail(409, 'Ese sticker ya está registrado');
    const serviceDate = b.serviceDate || today();
    if (!isValidISODate(serviceDate)) fail(400, 'Fecha de servicio no válida');
    const interval = Math.min(24, Math.max(1, toInt(b.intervalMonths, 6)));
    // Si el celular no manda precio, lo sacamos de la tabla según tipo y tonelaje.
    const price = toMoney(b.price, priceFor(req.user, b.tons, b.inverter));

    db.exec('BEGIN');
    try {
      let code = scanned;
      if (code) claimQrCode(req.user.id, code);
      else code = reserveNewQrCode(req.user.id);
      let clientId;
      if (b.clientId) {
        clientId = ownedClient(req.user.id, b.clientId).id;
      } else {
        clientId = Number(db.prepare('INSERT INTO clients (user_id, name, phone, address) VALUES (?, ?, ?, ?)').run(
          req.user.id, requireText(b.clientName, 'nombre del cliente', 120), cleanPhone(b.clientPhone),
          optText(b.clientAddress)).lastInsertRowid);
      }
      const r = db.prepare(`INSERT INTO equipment (user_id, client_id, qr_code, brand, tons, refrigerant, inverter, location,
          interval_months, price, last_service_date, next_service_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        req.user.id, clientId, code, optText(b.brand, 60), optText(b.tons, 20), optText(b.refrigerant, 20),
        b.inverter ? 1 : 0, optText(b.location, 80), interval, price, serviceDate, addMonths(serviceDate, interval));
      const equipmentId = Number(r.lastInsertRowid);
      const serviceType = SERVICE_TYPES.includes(b.serviceType) ? b.serviceType : 'Mantenimiento preventivo';
      db.prepare('INSERT INTO services (equipment_id, date, type, notes, cost) VALUES (?, ?, ?, ?, ?)').run(
        equipmentId, serviceDate, serviceType, optText(b.notes, 1000), toMoney(b.cost, price));
      db.exec('COMMIT');
      res.status(201).json({ equipment: equipmentRow(ownedEquipment(req.user.id, equipmentId)) });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  });

  // Historial completo de un equipo.
  api.get('/equipment/:id', (req, res) => {
    const e = ownedEquipment(req.user.id, req.params.id);
    const services = db.prepare('SELECT * FROM services WHERE equipment_id = ? ORDER BY date DESC, id DESC').all(e.id);
    const reminders = db.prepare('SELECT * FROM reminders WHERE equipment_id = ? ORDER BY sent_at DESC LIMIT 20').all(e.id);
    res.json({
      equipment: equipmentRow(e),
      services: services.map((s) => ({ id: s.id, date: s.date, type: s.type, notes: s.notes, cost: s.cost, rescued: Boolean(s.rescued) })),
      reminders: reminders.map((r) => ({ id: r.id, channel: r.channel, status: r.status, sentAt: r.sent_at })),
    });
  });

  api.put('/equipment/:id', (req, res) => {
    const e = ownedEquipment(req.user.id, req.params.id);
    const b = req.body;
    const interval = b.intervalMonths !== undefined ? Math.min(24, Math.max(1, toInt(b.intervalMonths, e.interval_months))) : e.interval_months;
    const tons = b.tons !== undefined ? optText(b.tons, 20) : e.tons;
    const inverter = b.inverter !== undefined ? (b.inverter ? 1 : 0) : e.inverter;
    // Si cambió el tipo o el tonelaje y no mandaron precio, tomamos el de la tabla.
    const typeChanged = tons !== e.tons || inverter !== e.inverter;
    const price = b.price !== undefined ? toMoney(b.price, e.price) : typeChanged ? priceFor(req.user, tons, inverter) : e.price;
    db.prepare(`UPDATE equipment SET brand = ?, tons = ?, refrigerant = ?, inverter = ?, location = ?, interval_months = ?,
        price = ?, next_service_date = ? WHERE id = ?`).run(
      b.brand !== undefined ? optText(b.brand, 60) : e.brand,
      tons,
      b.refrigerant !== undefined ? optText(b.refrigerant, 20) : e.refrigerant,
      inverter,
      b.location !== undefined ? optText(b.location, 80) : e.location,
      interval, price,
      addMonths(e.last_service_date, interval), e.id);
    res.json({ equipment: equipmentRow(ownedEquipment(req.user.id, e.id)) });
  });

  api.delete('/equipment/:id', (req, res) => {
    const e = ownedEquipment(req.user.id, req.params.id);
    db.prepare('DELETE FROM equipment WHERE id = ?').run(e.id);
    res.json({ ok: true });
  });

  // "Hice el servicio": guarda en la bitácora y reinicia el reloj de 6 meses.
  api.post('/equipment/:id/services', (req, res) => {
    const e = ownedEquipment(req.user.id, req.params.id);
    const date = req.body.date || today();
    if (!isValidISODate(date)) fail(400, 'Fecha no válida');
    const type = SERVICE_TYPES.includes(req.body.type) ? req.body.type : 'Mantenimiento preventivo';
    // Si le mandamos recordatorio y regresó, ese dinero cuenta como "rescatado".
    const rescued = e.last_reminder_at ? 1 : 0;
    db.prepare('INSERT INTO services (equipment_id, date, type, notes, cost, rescued) VALUES (?, ?, ?, ?, ?, ?)').run(
      e.id, date, type, optText(req.body.notes, 1000), toMoney(req.body.cost, e.price), rescued);
    if (date >= e.last_service_date) {
      db.prepare('UPDATE equipment SET last_service_date = ?, next_service_date = ? WHERE id = ?').run(
        date, addMonths(date, e.interval_months), e.id);
    }
    res.status(201).json({ equipment: equipmentRow(ownedEquipment(req.user.id, e.id)) });
  });

  // ----- Radar: el tablero principal -----
  api.get('/radar', (req, res) => {
    const rows = db.prepare(`${EQUIPMENT_SELECT} WHERE e.user_id = ? ORDER BY e.next_service_date`).all(req.user.id).map(equipmentRow);
    const monthStart = today().slice(0, 8) + '01';
    const month = db.prepare(`SELECT COALESCE(SUM(s.cost), 0) AS income,
        COALESCE(SUM(CASE WHEN s.rescued = 1 THEN s.cost ELSE 0 END), 0) AS rescued,
        COUNT(*) AS services
      FROM services s JOIN equipment e ON e.id = s.equipment_id
      WHERE e.user_id = ? AND s.date >= ?`).get(req.user.id, monthStart);
    const needAction = rows.filter((e) => e.daysLeft <= 7);
    res.json({
      metrics: {
        equipmentCount: rows.length,
        clientCount: db.prepare('SELECT COUNT(*) AS n FROM clients WHERE user_id = ?').get(req.user.id).n,
        overdueCount: rows.filter((e) => e.status === 'overdue').length,
        dueCount: rows.filter((e) => e.status === 'due').length,
        potentialIncome: needAction.reduce((sum, e) => sum + e.price, 0),
        monthIncome: month.income,
        monthRescued: month.rescued,
        monthServices: month.services,
      },
      today: needAction,
      soon: rows.filter((e) => e.status === 'soon'),
    });
  });

  // ----- Stickers QR para imprimir -----
  api.get('/qr/sheet', rateLimit({ ...lim.qrSheet, key: (req) => `u${req.user.id}` }), h(async (req, res) => {
    const count = Math.min(48, Math.max(1, toInt(req.query.count, 12)));
    if (unusedQrCount(req.user.id) + count > MAX_UNUSED_QR) {
      fail(429, `Ya tienes muchos stickers sin usar (máximo ${MAX_UNUSED_QR}). Pega los que ya imprimiste antes de pedir más.`);
    }
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = reserveNewQrCode(req.user.id);
      const url = `${publicUrl}/e/${code}`;
      codes.push({ code, url, svg: await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }) });
    }
    res.json({ codes });
  }));

  // ----- WhatsApp -----
  api.get('/whatsapp/queue', (req, res) => {
    const rows = db.prepare(`${EQUIPMENT_SELECT} WHERE e.user_id = ? ORDER BY e.next_service_date`).all(req.user.id);
    // Un solo mensaje por cliente, aunque tenga varios equipos vencidos.
    const seen = new Set();
    const queue = rows.filter(needsReminder).filter((e) => !seen.has(e.client_id) && seen.add(e.client_id))
      .map((e) => {
        const group = reminderGroup(req.user, e);
        return { ...equipmentRow(e), message: reminderMessage(req.user, e, group),
          groupCount: group.length, groupTotal: reminderTotal(req.user, group) };
      });
    const sent = db.prepare(`SELECT r.*, c.name AS client_name, e.brand, e.location FROM reminders r
        JOIN equipment e ON e.id = r.equipment_id JOIN clients c ON c.id = e.client_id
        WHERE e.user_id = ? ORDER BY r.sent_at DESC, r.id LIMIT 60`).all(req.user.id)
      // Un mensaje que cubrió varios equipos del mismo cliente se muestra una sola vez.
      .filter((r, i, all) => all.findIndex((o) => o.sent_at === r.sent_at && o.message === r.message) === i).slice(0, 30)
      .map((r) => ({ id: r.id, equipmentId: r.equipment_id, clientName: r.client_name, brand: r.brand,
        location: r.location, channel: r.channel, status: r.status, sentAt: r.sent_at }));
    res.json({ queue, sent });
  });

  async function evolutionConnected(userId) {
    if (!evolution?.enabled) return false;
    try { return (await evolution.state(userId)) === 'open'; } catch { return false; }
  }

  // Manda (o prepara) el recordatorio de un equipo.
  // Si el WhatsApp del técnico está conectado a Evolution API, sale solito.
  // Si no, devolvemos una liga wa.me para que el técnico solo presione "enviar".
  const sentToday = (userId) => db.prepare(`SELECT COUNT(*) AS n FROM reminders r JOIN equipment e ON e.id = r.equipment_id
    WHERE e.user_id = ? AND r.channel = 'api' AND r.sent_at >= datetime('now', '-1 day')`).get(userId).n;

  // Si el cliente tiene varios equipos vencidos, va un solo mensaje y todos salen de la cola.
  async function sendReminder(user, e, connected) {
    const group = reminderGroup(user, e);
    const message = reminderMessage(user, e, group);
    let channel = 'link';
    if (connected) {
      if (sentToday(user.id) >= MAX_SENDS_PER_DAY) fail(429, `Llegaste al máximo de ${MAX_SENDS_PER_DAY} mensajes automáticos por día`);
      await evolution.sendText(user.id, `52${e.client_phone}`, message);
      channel = 'api';
    }
    const insert = db.prepare("INSERT INTO reminders (equipment_id, channel, status, message) VALUES (?, ?, 'sent', ?)");
    for (const g of group) insert.run(g.id, channel, message);
    return { channel, message, waUrl: `https://wa.me/52${e.client_phone}?text=${encodeURIComponent(message)}` };
  }

  // Vista previa del mensaje antes de mandarlo.
  api.get('/whatsapp/preview/:equipmentId', h(async (req, res) => {
    const e = ownedEquipment(req.user.id, req.params.equipmentId);
    const message = reminderMessage(req.user, e);
    res.json({
      message, connected: await evolutionConnected(req.user.id),
      waUrl: `https://wa.me/52${e.client_phone}?text=${encodeURIComponent(message)}`,
    });
  }));

  api.post('/whatsapp/send/:equipmentId', h(async (req, res) => {
    const e = ownedEquipment(req.user.id, req.params.equipmentId);
    const connected = req.body?.mode === 'link' ? false : await evolutionConnected(req.user.id);
    if (!connected) return res.json(await sendReminder(req.user, e, false));
    if (!sendLock.tryAcquire(req.user.id)) fail(409, 'Ya se están enviando mensajes, espera a que terminen');
    try {
      res.json(await sendReminder(req.user, e, true));
    } finally {
      sendLock.release(req.user.id);
    }
  }));

  // "Disparar lote de hoy": solo funciona con WhatsApp conectado.
  api.post('/whatsapp/send-batch', h(async (req, res) => {
    if (!(await evolutionConnected(req.user.id))) fail(400, 'Primero conecta tu WhatsApp en la pestaña WhatsApp');
    // Candado: si se pica dos veces el botón (o corre el envío automático), no se duplican mensajes.
    if (!sendLock.tryAcquire(req.user.id)) fail(409, 'Ya se están enviando mensajes, espera a que terminen');
    let sent = 0;
    const errors = [];
    try {
      const rows = db.prepare(`${EQUIPMENT_SELECT} WHERE e.user_id = ? ORDER BY e.next_service_date`).all(req.user.id)
        .filter(needsReminder).slice(0, 30);
      for (const e of rows) {
        try {
          // Pudo salir junto con otro equipo del mismo cliente.
          if (ownedEquipment(req.user.id, e.id).last_reminder_at) continue;
          await sendReminder(req.user, e, true);
          sent++;
          // Pausa corta entre mensajes para que WhatsApp no lo vea como spam.
          await pause(sendGapMs);
        } catch (err) {
          errors.push({ equipmentId: e.id, error: err.message });
        }
      }
    } finally {
      sendLock.release(req.user.id);
    }
    res.json({ sent, errors });
  }));

  api.put('/whatsapp/reminders/:id', (req, res) => {
    const r = db.prepare(`SELECT r.id, r.sent_at, r.message, e.client_id FROM reminders r JOIN equipment e ON e.id = r.equipment_id
      WHERE r.id = ? AND e.user_id = ?`).get(req.params.id, req.user.id);
    if (!r) fail(404, 'Recordatorio no encontrado');
    const status = ['sent', 'confirmed', 'no_answer'].includes(req.body.status) ? req.body.status : 'sent';
    // También a los demás equipos que iban en el mismo mensaje.
    db.prepare(`UPDATE reminders SET status = ? WHERE sent_at = ? AND message = ?
      AND equipment_id IN (SELECT id FROM equipment WHERE client_id = ?)`).run(status, r.sent_at, r.message, r.client_id);
    res.json({ ok: true });
  });

  api.get('/whatsapp/status', h(async (req, res) => {
    if (!evolution?.enabled) return res.json({ available: false, state: 'disabled' });
    try {
      res.json({ available: true, state: await evolution.state(req.user.id) });
    } catch (err) {
      console.error(`Evolution status (técnico ${req.user.id}): ${err.message}`);
      res.json({ available: true, state: 'error', error: 'No pudimos revisar tu WhatsApp, intenta en un momento' });
    }
  }));

  api.post('/whatsapp/connect', h(async (req, res) => {
    if (!evolution?.enabled) fail(400, 'El envío automático todavía no está activado en el servidor');
    // Con número, Evolution también regresa un código para vincular desde el mismo celular.
    const number = req.body?.phone ? `52${cleanPhone(req.body.phone)}` : null;
    res.json(await evolution.connect(req.user.id, number));
  }));

  api.post('/whatsapp/disconnect', h(async (req, res) => {
    if (evolution?.enabled) await evolution.logout(req.user.id);
    res.json({ ok: true });
  }));

  // ----- Suscripción Pro (Mercado Pago) -----
  api.post('/billing/subscribe', h(async (req, res) => {
    if (!mercadopago?.enabled) fail(400, 'Los pagos todavía no están activados en el servidor');
    if (req.user.plan === 'pro') fail(400, 'Ya tienes FrescoTrack Pro activo');
    // Mercado Pago solo deja pagar a quien use este mismo correo. Por eso el técnico
    // puede poner otro (por ejemplo, el de la persona dueña de la tarjeta).
    const email = optText(req.body?.payerEmail, 200).toLowerCase() || req.user.email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Correo de pago no válido');
    const sub = await mercadopago.createSubscription({
      userId: req.user.id, email, backUrl: `${publicUrl}/pro?pago=listo`,
    });
    db.prepare('UPDATE users SET mp_preapproval_id = ?, plan_status = ? WHERE id = ?').run(sub.id, sub.status, req.user.id);
    res.json({ url: sub.init_point });
  }));

  // Al regresar de Mercado Pago, la app pregunta "¿ya quedó?".
  api.post('/billing/refresh', h(async (req, res) => {
    let user = req.user;
    if (mercadopago?.enabled && user.mp_preapproval_id) {
      user = applySubscription(await mercadopago.getSubscription(user.mp_preapproval_id)) || user;
    }
    res.json({ user: publicUser(user) });
  }));

  api.post('/billing/cancel', h(async (req, res) => {
    if (!mercadopago?.enabled || !req.user.mp_preapproval_id) fail(400, 'No tienes una suscripción activa');
    const sub = await mercadopago.cancelSubscription(req.user.mp_preapproval_id);
    res.json({ user: publicUser(applySubscription(sub) || req.user) });
  }));

  app.use('/api', api);

  // ----- Envío automático -----
  // El servidor llama esto cada rato. A cada técnico que tenga el envío automático
  // prendido y su WhatsApp conectado, le manda los recordatorios de los equipos
  // que vencen hoy (o que vencieron hace poco y nadie avisó), a partir de su hora elegida.
  let autoRunning = false;
  async function runAutoReminders({ hour = new Date().getHours() } = {}) {
    if (!evolution?.enabled || autoRunning) return { sent: 0, errors: 0 };
    autoRunning = true;
    let sent = 0, errors = 0;
    try {
      const users = db.prepare('SELECT * FROM users WHERE auto_send = 1 AND auto_send_hour <= ?').all(hour);
      for (const user of users) {
        if (!publicUser(user).active) continue;
        // Solo lo de los últimos 30 días: un equipo viejo que apenas se registró no recibe mensaje sorpresa.
        const due = db.prepare(`${EQUIPMENT_SELECT} WHERE e.user_id = ? AND e.next_service_date BETWEEN ? AND ?
            ORDER BY e.next_service_date`).all(user.id, addDays(today(), -30), today())
          .filter((e) => !e.last_reminder_at).slice(0, 30);
        if (due.length === 0 || !(await evolutionConnected(user.id))) continue;
        if (!sendLock.tryAcquire(user.id)) continue; // el técnico está mandando a mano; lo intentamos en la siguiente vuelta
        try {
          for (const e of due) {
            try {
              // Volvemos a revisar: pudo haberse enviado a mano (o borrado) mientras esperábamos.
              if (ownedEquipment(user.id, e.id).last_reminder_at) continue;
              await sendReminder(user, e, true);
              sent++;
              await pause(sendGapMs);
            } catch (err) {
              errors++;
              console.error(`Recordatorio automático falló (técnico ${user.id}, equipo ${e.id}): ${err.message}`);
            }
          }
        } finally {
          sendLock.release(user.id);
        }
      }
    } finally {
      autoRunning = false;
    }
    return { sent, errors };
  }
  app.locals.runAutoReminders = runAutoReminders;

  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // Manejador final de errores.
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : err.type === 'entity.too.large' ? 413 : 500);
    if (status >= 500) { console.error(err); recordProblem(`${req.method} ${req.path}`, err); }
    res.status(status).json({ error: status >= 500 ? 'Algo falló en el servidor' : err.message });
  });

  return app;
}
