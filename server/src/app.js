// Aquí viven todas las "puertas" (rutas) de la API de FrescoTrack.
// El celular del técnico toca estas puertas para guardar y leer datos.
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { today, addMonths, addDays, daysBetween, isValidISODate } from './dates.js';

export const DEFAULT_TEMPLATE =
  'Hola {cliente} 👋, soy {tecnico} de {negocio}. Ya pasaron {meses} meses desde el último ' +
  'mantenimiento de tu minisplit {equipo} ({ubicacion}). ¿Te agendo una limpieza esta semana ' +
  'para que siga enfriando como nuevo? 🧊';

const SERVICE_TYPES = ['Mantenimiento preventivo', 'Instalación', 'Carga de gas', 'Reparación', 'Diagnóstico'];
const TRIAL_DAYS = 14;

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
    data[key] !== undefined && data[key] !== null ? String(data[key]) : all);
}

export function createApp({ db, jwtSecret, publicUrl = '', evolution, mercadopago, supportPhone = '', sendGapMs = 1500 }) {
  const app = express();
  app.use(express.json({ limit: '200kb' }));

  // Envuelve rutas async para que los errores lleguen al manejador final.
  const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // ---------- Ayudantes de datos ----------
  const getUser = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  // Crea un código nuevo y lo aparta para este técnico. Si por casualidad ya
  // existe, la base de datos lo rechaza (es llave única) y probamos otro.
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
      messageTemplate: u.message_template || DEFAULT_TEMPLATE,
      autoSend: Boolean(u.auto_send), autoSendHour: u.auto_send_hour,
      plan: u.plan, planStatus: u.plan_status || null, trialEndsAt: u.trial_ends_at, trialDaysLeft,
      active: u.plan === 'pro' || trialDaysLeft > 0,
    };
  }

  const signToken = (user) => jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '30d' });

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

  function reminderMessage(user, e) {
    return buildMessage(user.message_template, {
      cliente: e.client_name.split(' ')[0],
      tecnico: user.name.split(' ')[0],
      negocio: user.business_name || user.name,
      meses: e.interval_months,
      equipo: [e.brand, e.tons].filter(Boolean).join(' ') || 'minisplit',
      ubicacion: e.location || 'tu casa',
      fecha: e.next_service_date,
    });
  }

  // ---------- Rutas públicas ----------
  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.get('/api/config', (req, res) => res.json({
    whatsappApi: Boolean(evolution?.enabled), payments: Boolean(mercadopago?.enabled),
    price: mercadopago?.price ?? 299, supportPhone, serviceTypes: SERVICE_TYPES,
  }));

  app.post('/api/auth/register', h(async (req, res) => {
    const email = requireText(req.body.email, 'correo').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Correo no válido');
    const password = String(req.body.password || '');
    if (password.length < 8) fail(400, 'La contraseña debe tener al menos 8 caracteres');
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

  app.post('/api/auth/login', h(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const ok = user && await bcrypt.compare(String(req.body.password || ''), user.password_hash);
    if (!ok) fail(401, 'Correo o contraseña incorrectos');
    res.json({ token: signToken(user), user: publicUser(user) });
  }));

  // Lo que ve el cliente final al escanear el sticker (sin cuenta, sin precios ni su teléfono).
  app.get('/api/public/equipment/:code', (req, res) => {
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
  app.post('/api/billing/webhook', h(async (req, res) => {
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

  // Guarda en la base de datos lo que Mercado Pago dice de la suscripción.
  function applySubscription(sub) {
    const userId = Number(sub?.external_reference);
    if (!userId || !getUser(userId)) return null;
    const plan = sub.status === 'authorized' ? 'pro' : 'trial';
    db.prepare('UPDATE users SET plan = ?, plan_status = ?, mp_preapproval_id = ? WHERE id = ?')
      .run(plan, sub.status, sub.id, userId);
    return getUser(userId);
  }

  // ---------- A partir de aquí, solo con sesión iniciada ----------
  const auth = (req, res, next) => {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    try {
      const payload = jwt.verify(token, jwtSecret);
      const user = getUser(payload.sub);
      if (!user) throw new Error('no user');
      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: 'Tu sesión expiró, vuelve a entrar' });
    }
  };
  const api = express.Router();
  api.use(auth);

  // Si la prueba gratis terminó y no ha pagado, puede ver sus datos pero no agregar ni cambiar.
  api.use((req, res, next) => {
    const free = req.method === 'GET' || req.path.startsWith('/me') || req.path.startsWith('/billing');
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
      b.defaultPrice !== undefined ? toInt(b.defaultPrice, u.default_price) : u.default_price,
      b.messageTemplate !== undefined ? (optText(b.messageTemplate, 1000) || null) : u.message_template,
      b.autoSend !== undefined ? (b.autoSend ? 1 : 0) : u.auto_send,
      b.autoSendHour !== undefined ? Math.min(23, Math.max(0, toInt(b.autoSendHour, u.auto_send_hour))) : u.auto_send_hour,
      u.id);
    res.json({ user: publicUser(getUser(u.id)) });
  });

  api.put('/me/password', h(async (req, res) => {
    const ok = await bcrypt.compare(String(req.body.currentPassword || ''), req.user.password_hash);
    if (!ok) fail(400, 'La contraseña actual no es correcta');
    const next = String(req.body.newPassword || '');
    if (next.length < 8) fail(400, 'La contraseña nueva debe tener al menos 8 caracteres');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await bcrypt.hash(next, 10), req.user.id);
    res.json({ ok: true });
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
    const price = toInt(b.price, req.user.default_price);

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
        equipmentId, serviceDate, serviceType, optText(b.notes, 1000), toInt(b.cost, price));
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
    db.prepare(`UPDATE equipment SET brand = ?, tons = ?, refrigerant = ?, inverter = ?, location = ?, interval_months = ?,
        price = ?, next_service_date = ? WHERE id = ?`).run(
      b.brand !== undefined ? optText(b.brand, 60) : e.brand,
      b.tons !== undefined ? optText(b.tons, 20) : e.tons,
      b.refrigerant !== undefined ? optText(b.refrigerant, 20) : e.refrigerant,
      b.inverter !== undefined ? (b.inverter ? 1 : 0) : e.inverter,
      b.location !== undefined ? optText(b.location, 80) : e.location,
      interval, b.price !== undefined ? toInt(b.price, e.price) : e.price,
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
      e.id, date, type, optText(req.body.notes, 1000), toInt(req.body.cost, e.price), rescued);
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
  api.get('/qr/sheet', h(async (req, res) => {
    const count = Math.min(48, Math.max(1, toInt(req.query.count, 12)));
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
    const queue = rows.filter((e) => daysBetween(today(), e.next_service_date) <= 7 && !e.last_reminder_at)
      .map((e) => ({ ...equipmentRow(e), message: reminderMessage(req.user, e) }));
    const sent = db.prepare(`SELECT r.*, c.name AS client_name, e.brand, e.location FROM reminders r
        JOIN equipment e ON e.id = r.equipment_id JOIN clients c ON c.id = e.client_id
        WHERE e.user_id = ? ORDER BY r.sent_at DESC LIMIT 30`).all(req.user.id)
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
  async function sendReminder(user, e, connected) {
    const message = reminderMessage(user, e);
    let channel = 'link';
    if (connected) {
      await evolution.sendText(user.id, `52${e.client_phone}`, message);
      channel = 'api';
    }
    db.prepare("INSERT INTO reminders (equipment_id, channel, status, message) VALUES (?, ?, 'sent', ?)").run(e.id, channel, message);
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
    res.json(await sendReminder(req.user, e, connected));
  }));

  // "Disparar lote de hoy": solo funciona con WhatsApp conectado.
  api.post('/whatsapp/send-batch', h(async (req, res) => {
    if (!(await evolutionConnected(req.user.id))) fail(400, 'Primero conecta tu WhatsApp en la pestaña WhatsApp');
    const rows = db.prepare(`${EQUIPMENT_SELECT} WHERE e.user_id = ? ORDER BY e.next_service_date`).all(req.user.id)
      .filter((e) => daysBetween(today(), e.next_service_date) <= 7 && !e.last_reminder_at).slice(0, 30);
    let sent = 0;
    const errors = [];
    for (const e of rows) {
      try {
        await sendReminder(req.user, e, true);
        sent++;
        // Pausa corta entre mensajes para que WhatsApp no lo vea como spam.
        await pause(sendGapMs);
      } catch (err) {
        errors.push({ equipmentId: e.id, error: err.message });
      }
    }
    res.json({ sent, errors });
  }));

  api.put('/whatsapp/reminders/:id', (req, res) => {
    const r = db.prepare(`SELECT r.id FROM reminders r JOIN equipment e ON e.id = r.equipment_id
      WHERE r.id = ? AND e.user_id = ?`).get(req.params.id, req.user.id);
    if (!r) fail(404, 'Recordatorio no encontrado');
    const status = ['sent', 'confirmed', 'no_answer'].includes(req.body.status) ? req.body.status : 'sent';
    db.prepare('UPDATE reminders SET status = ? WHERE id = ?').run(status, r.id);
    res.json({ ok: true });
  });

  api.get('/whatsapp/status', h(async (req, res) => {
    if (!evolution?.enabled) return res.json({ available: false, state: 'disabled' });
    try {
      res.json({ available: true, state: await evolution.state(req.user.id) });
    } catch (err) {
      res.json({ available: true, state: 'error', error: err.message });
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
    const email = optText(req.body?.payerEmail, 200).toLowerCase() || req.user.email;
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
        for (const e of due) {
          try {
            await sendReminder(user, e, true);
            sent++;
            await pause(sendGapMs);
          } catch (err) {
            errors++;
            console.error(`Recordatorio automático falló (técnico ${user.id}, equipo ${e.id}): ${err.message}`);
          }
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
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Algo falló en el servidor' : err.message });
  });

  return app;
}
