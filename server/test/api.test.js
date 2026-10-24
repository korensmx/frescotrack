import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db.js';
import { createApp, extractQrCode, buildMessage, tonsKey, DEFAULT_LIMITS } from '../src/app.js';
import { addMonths, addDays, today } from '../src/dates.js';
import { createMercadoPagoClient } from '../src/mercadopago.js';
import crypto from 'node:crypto';

let server, base, db, app;
const ADMIN = 'llave-de-prueba-del-dueno-0123456789';
const sentMessages = [];
const fakeEvolution = {
  enabled: true,
  state: async () => 'open',
  connect: async () => ({ qr: 'data:image/png;base64,xxx' }),
  logout: async () => {},
  sendText: async (userId, number, text) => { sentMessages.push({ userId, number, text }); },
};
const fakeMp = {
  enabled: true, price: 299,
  subs: {},
  async createSubscription({ userId, email }) { this.lastEmail = email; const s = { id: 'sub1', status: 'pending', reason: 'FrescoTrack Pro', auto_recurring: { transaction_amount: 299, currency_id: 'MXN' }, external_reference: String(userId), init_point: 'https://mp.test/pay' }; this.subs.sub1 = s; return s; },
  async getSubscription(id) { return this.subs[id]; },
  async cancelSubscription(id) { this.subs[id].status = 'cancelled'; return this.subs[id]; },
  isValidSignature: () => true,
};

before(async () => {
  db = openDatabase(':memory:');
  app = createApp({ db, jwtSecret: 'test', publicUrl: 'https://app.test', evolution: fakeEvolution, mercadopago: fakeMp, sendGapMs: 0, adminToken: ADMIN,
    limits: Object.fromEntries(Object.entries(DEFAULT_LIMITS).map(([k, v]) => [k, { ...v, max: 10_000 }])) });
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

async function req(method, path, body, token) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function register(email) {
  const r = await req('POST', '/auth/register', { email, password: 'secreto123', name: 'Juan Pérez', phone: '833 123 4567', businessName: 'Climas del Golfo' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.token;
}

test('helpers', () => {
  assert.equal(extractQrCode('https://x.com/e/ft-abc234'), 'FT-ABC234');
  assert.equal(extractQrCode('hola'), null);
  assert.equal(addMonths('2026-08-31', 6), '2027-02-28');
  assert.equal(buildMessage('Hola {cliente} {nada}', { cliente: 'Ana' }), 'Hola Ana {nada}');
});

test('registro, login y validaciones', async () => {
  await register('juan@test.com');
  assert.equal((await req('POST', '/auth/register', { email: 'juan@test.com', password: 'secreto123', name: 'X', phone: '8331234567' })).status, 409);
  assert.equal((await req('POST', '/auth/register', { email: 'otro@test.com', password: 'corta', name: 'X', phone: '8331234567' })).status, 400);
  assert.equal((await req('POST', '/auth/login', { email: 'juan@test.com', password: 'mala' })).status, 401);
  const ok = await req('POST', '/auth/login', { email: 'JUAN@test.com', password: 'secreto123' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.plan, 'trial');
  assert.equal(ok.body.user.trialDaysLeft, 14);
  assert.equal((await req('GET', '/me')).status, 401);
});

test('equipo: alta, radar, servicio, historial y vista pública', async () => {
  const t = await register('ana@test.com');
  const old = addMonths(addDays(today(), -10), -6); // vencido hace 10 días
  const created = await req('POST', '/equipment', {
    qrCode: 'https://app.test/e/FT-TEST01', clientName: 'Roberto Garza', clientPhone: '8339876543',
    brand: 'Mirage', tons: '1.5 Ton', location: 'Recámara', price: 800, serviceDate: old,
  }, t);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const eq = created.body.equipment;
  assert.equal(eq.qrCode, 'FT-TEST01');
  assert.equal(eq.status, 'overdue');

  // el mismo sticker no se puede usar dos veces
  assert.equal((await req('POST', '/equipment', { qrCode: 'FT-TEST01', clientName: 'X', clientPhone: '8331111111' }, t)).status, 409);

  const radar = await req('GET', '/radar', null, t);
  assert.equal(radar.body.metrics.overdueCount, 1);
  assert.equal(radar.body.metrics.potentialIncome, 800);
  assert.equal(radar.body.today[0].clientName, 'Roberto Garza');

  const byQr = await req('GET', '/equipment/by-qr/FT-TEST01', null, t);
  assert.equal(byQr.body.equipment.id, eq.id);

  // otro técnico no puede ver mi equipo
  const t2 = await register('pedro@test.com');
  assert.equal((await req('GET', `/equipment/${eq.id}`, null, t2)).status, 404);
  assert.equal((await req('GET', '/equipment/by-qr/FT-TEST01', null, t2)).status, 409);

  // WhatsApp: está en la cola, se manda por la API y sale de la cola
  const queue = await req('GET', '/whatsapp/queue', null, t);
  assert.equal(queue.body.queue.length, 1);
  assert.match(queue.body.queue[0].message, /Hola Roberto/);
  const preview = await req('GET', `/whatsapp/preview/${eq.id}`, null, t);
  assert.equal(preview.body.connected, true);
  assert.match(preview.body.waUrl, /^https:\/\/wa\.me\/528339876543\?text=/);
  const sent = await req('POST', `/whatsapp/send/${eq.id}`, {}, t);
  assert.equal(sent.body.channel, 'api');
  assert.equal(sentMessages.at(-1).number, '528339876543');
  assert.equal((await req('GET', '/whatsapp/queue', null, t)).body.queue.length, 0);

  // Hice el servicio: se reinicia el reloj y cuenta como rescatado
  const svc = await req('POST', `/equipment/${eq.id}/services`, { cost: 900 }, t);
  assert.equal(svc.status, 201);
  assert.equal(svc.body.equipment.nextServiceDate, addMonths(today(), 6));
  assert.equal(svc.body.equipment.status, 'ok');
  const radar2 = await req('GET', '/radar', null, t);
  assert.equal(radar2.body.metrics.monthRescued, 900);

  const hist = await req('GET', `/equipment/${eq.id}`, null, t);
  assert.equal(hist.body.services.length, 2);

  const pub = await req('GET', '/public/equipment/ft-test01');
  assert.equal(pub.status, 200);
  assert.equal(pub.body.clientFirstName, 'Roberto');
  assert.equal(pub.body.technician.businessName, 'Climas del Golfo');
  assert.equal(pub.body.clientPhone, undefined);
  assert.equal(pub.body.services[0].cost, undefined);
});

test('precios por tipo de minisplit y tonelaje', async () => {
  assert.equal(tonsKey('1.5 Ton'), '1.5');
  assert.equal(tonsKey('3 Ton'), '3');
  assert.equal(tonsKey('5 Ton'), null);
  assert.equal(tonsKey(''), null);

  const t = await register('precios@test.com');
  // Sin configurar, todas las casillas usan el precio normal (750)
  const me = await req('GET', '/me', null, t);
  assert.equal(me.body.user.priceTable.normal['1'], 750);
  assert.equal(me.body.user.priceTable.inverter['3'], 750);

  // Un equipo registrado antes de cambiar los precios
  const before = await req('POST', '/equipment', { clientName: 'Luisa', clientPhone: '8332223344', tons: '2 Ton', inverter: true }, t);
  assert.equal(before.body.equipment.price, 750);

  const table = {
    normal: { '1': 600, '1.5': 650, '2': 700, '2.5': 750, '3': 800 },
    inverter: { '1': 700, '1.5': 750, '2': 850, '2.5': 900, '3': 950 },
  };
  const saved = await req('PUT', '/me/prices', { priceTable: table, applyToEquipment: true }, t);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.deepEqual(saved.body.user.priceTable, table);
  assert.equal(saved.body.updatedEquipment, 1);
  assert.equal((await req('GET', `/equipment/${before.body.equipment.id}`, null, t)).body.equipment.price, 850);

  // Al dar de alta un equipo sin precio, se toma de la tabla
  const conv = await req('POST', '/equipment', { clientName: 'Mario', clientPhone: '8334445566', tons: '1.5 Ton', inverter: false }, t);
  assert.equal(conv.body.equipment.price, 650);
  const hist = await req('GET', `/equipment/${conv.body.equipment.id}`, null, t);
  assert.equal(hist.body.services[0].cost, 650);
  // Si el técnico escribe otro precio, se respeta
  const custom = await req('POST', '/equipment', { clientName: 'Sofía', clientPhone: '8335556677', tons: '3 Ton', inverter: true, price: 1200 }, t);
  assert.equal(custom.body.equipment.price, 1200);
  // Medida fuera de la tabla: usa el precio normal
  const other = await req('POST', '/equipment', { clientName: 'Iván', clientPhone: '8336667788', tons: '5 Ton' }, t);
  assert.equal(other.body.equipment.price, 750);

  // Si le cambio el tipo al equipo, el precio se ajusta a la tabla
  const edited = await req('PUT', `/equipment/${conv.body.equipment.id}`, { inverter: true }, t);
  assert.equal(edited.body.equipment.price, 750);

  // Valores raros se ignoran y se queda el anterior
  const bad = await req('PUT', '/me/prices', { priceTable: { normal: { '1': -5, '2': 'abc' } } }, t);
  assert.equal(bad.body.user.priceTable.normal['1'], 600);
  assert.equal(bad.body.user.priceTable.normal['2'], 700);
  assert.equal((await req('PUT', '/me/prices', { priceTable: 'hola' }, t)).status, 400);
});

test('cada sticker es único y solo lo usa su técnico', async () => {
  const a = await register('qr-a@test.com');
  const b = await register('qr-b@test.com');
  const sheet = await req('GET', '/qr/sheet?count=20', null, a);
  const codes = sheet.body.codes.map((c) => c.code);
  assert.equal(new Set(codes).size, 20);
  assert.match(codes[0], /^FT-[A-Z2-9]{8}$/);
  assert.match(sheet.body.codes[0].svg, /<svg/);
  // el técnico B no puede usar ni escanear un sticker de A
  assert.equal((await req('GET', `/equipment/by-qr/${codes[0]}`, null, b)).status, 409);
  assert.equal((await req('POST', '/equipment', { qrCode: codes[0], clientName: 'X', clientPhone: '8331111111' }, b)).status, 409);
  // A sí puede
  assert.equal((await req('POST', '/equipment', { qrCode: codes[0], clientName: 'X', clientPhone: '8331111111' }, a)).status, 201);
  // y sin sticker se genera uno nuevo apartado
  const auto = await req('POST', '/equipment', { clientName: 'Y', clientPhone: '8332222222' }, a);
  assert.match(auto.body.equipment.qrCode, /^FT-[A-Z2-9]{8}$/);
});

test('clientes', async () => {
  const t = await register('luis@test.com');
  const c = await req('POST', '/clients', { name: 'Karla', phone: '+52 833 555 1234' }, t);
  assert.equal(c.body.client.phone, '8335551234');
  assert.equal((await req('POST', '/clients', { name: 'X', phone: '123' }, t)).status, 400);
  const list = await req('GET', '/clients', null, t);
  assert.equal(list.body.clients.length, 1);
  await req('PUT', `/clients/${c.body.client.id}`, { notes: 'Portón negro' }, t);
  assert.equal((await req('GET', `/clients/${c.body.client.id}`, null, t)).body.client.notes, 'Portón negro');
  assert.equal((await req('DELETE', `/clients/${c.body.client.id}`, null, t)).status, 200);
});

test('suscripción Mercado Pago y bloqueo al terminar la prueba', async () => {
  const t = await register('sofia@test.com');
  db.prepare("UPDATE users SET trial_ends_at = '2000-01-01' WHERE email = 'sofia@test.com'").run();
  const blocked = await req('POST', '/clients', { name: 'A', phone: '8331234567' }, t);
  assert.equal(blocked.status, 402);
  assert.equal((await req('GET', '/clients', null, t)).status, 200);

  assert.equal((await req('POST', '/billing/subscribe', { payerEmail: 'no-es-correo' }, t)).status, 400);
  const sub = await req('POST', '/billing/subscribe', { payerEmail: 'Dueno.Tarjeta@Test.com' }, t);
  assert.equal(sub.body.url, 'https://mp.test/pay');
  assert.equal(fakeMp.lastEmail, 'dueno.tarjeta@test.com');
  fakeMp.subs.sub1.status = 'authorized';
  const hook = await fetch(base + '/billing/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'subscription_preapproval', data: { id: 'sub1' } }) });
  assert.equal(hook.status, 200);
  const me = await req('GET', '/me', null, t);
  assert.equal(me.body.user.plan, 'pro');
  assert.equal((await req('POST', '/clients', { name: 'A', phone: '8331234567' }, t)).status, 201);

  const cancel = await req('POST', '/billing/cancel', {}, t);
  assert.equal(cancel.body.user.plan, 'trial');
  assert.equal(cancel.body.user.active, false);
});

test('reporte del dueño: ventas y fallas', async () => {
  assert.equal((await req('GET', '/admin/stats')).status, 401);
  assert.equal((await req('GET', '/admin/stats', null, 'llave-equivocada')).status, 401);
  const r = await req('GET', '/admin/stats?days=7', null, ADMIN);
  assert.equal(r.status, 200);
  assert.equal(r.body.periodDays, 7);
  assert.ok(r.body.users.total >= 1);
  // Sofía (prueba de arriba) pagó y luego canceló esta misma semana.
  assert.ok(r.body.sales.newProInPeriod >= 1);
  assert.ok(r.body.sales.cancelledInPeriod >= 1);
  assert.ok(r.body.sales.newProList.some((u) => u.email === 'sofia@test.com'));
  assert.equal(r.body.sales.mrr, r.body.sales.proActive * 299);
  assert.equal(typeof r.body.server.errorsSinceStart, 'number');
  assert.equal((await req('GET', '/health')).body.ok, true);

  // Sin llave configurada, la puerta no existe.
  const closed = createApp({ db, jwtSecret: 'test' });
  const s2 = await new Promise((ok) => { const s = closed.listen(0, () => ok(s)); });
  const res = await fetch(`http://127.0.0.1:${s2.address().port}/api/admin/stats`, { headers: { Authorization: `Bearer ${ADMIN}` } });
  assert.equal(res.status, 404);
  s2.close();
});

test('firma del webhook de Mercado Pago', () => {
  const mp = createMercadoPagoClient({ accessToken: 'x', webhookSecret: 'shh' });
  const ts = '1700000000';
  const v1 = crypto.createHmac('sha256', 'shh').update('id:abc;request-id:req1;ts:1700000000;').digest('hex');
  assert.equal(mp.isValidSignature({ signature: `ts=${ts},v1=${v1}`, requestId: 'req1', dataId: 'ABC' }), true);
  assert.equal(mp.isValidSignature({ signature: `ts=${ts},v1=${'0'.repeat(64)}`, requestId: 'req1', dataId: 'abc' }), false);
  assert.equal(mp.isValidSignature({ signature: '', requestId: 'req1', dataId: 'abc' }), false);
});

test('envío automático el día que vence', async () => {
  const t = await register('auto@test.com');
  const me = await req('GET', '/me', null, t);
  assert.equal(me.body.user.autoSend, true);
  assert.equal(me.body.user.autoSendHour, 10);
  const add = (qr, phone, serviceDate) => req('POST', '/equipment', { qrCode: qr, clientName: 'Cliente Auto', clientPhone: phone, serviceDate }, t);
  assert.equal((await add('FT-AUTO01', '8330000001', addMonths(today(), -6))).status, 201);  // vence hoy
  assert.equal((await add('FT-AUTO02', '8330000002', addMonths(today(), -9))).status, 201);  // vencido hace meses
  assert.equal((await add('FT-AUTO03', '8330000003', addMonths(today(), -5))).status, 201);  // falta un mes
  const mine = () => sentMessages.filter((m) => m.number.startsWith('52833000000'));

  // Antes de su hora no sale nada
  await app.locals.runAutoReminders({ hour: 8 });
  assert.equal(mine().length, 0);

  // A su hora sale solo el que vence hoy
  const r = await app.locals.runAutoReminders({ hour: 10 });
  assert.equal(r.sent, 1);
  assert.deepEqual(mine().map((m) => m.number), ['528330000001']);

  // No se repite
  await app.locals.runAutoReminders({ hour: 11 });
  assert.equal(mine().length, 1);

  // Si lo apaga, no manda nada
  await req('PUT', '/me', { autoSend: false, autoSendHour: 9 }, t);
  assert.equal((await add('FT-AUTO04', '8330000004', addMonths(today(), -6))).status, 201);
  await app.locals.runAutoReminders({ hour: 12 });
  assert.equal(mine().length, 1);
  const after = await req('GET', '/me', null, t);
  assert.equal(after.body.user.autoSend, false);
  assert.equal(after.body.user.autoSendHour, 9);
});

test('descarga de copia de seguridad solo con la llave del dueño', async () => {
  assert.equal((await fetch(base + '/admin/backup')).status, 401);
  const res = await fetch(base + '/admin/backup', { headers: { Authorization: `Bearer ${ADMIN}` } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-disposition'), /frescotrack-\d{4}-\d{2}-\d{2}\.db/);
  const bytes = Buffer.from(await res.arrayBuffer());
  assert.equal(bytes.subarray(0, 15).toString(), 'SQLite format 3');
});

test('recordatorio: precio de la tabla y suma de equipos vencidos del mismo cliente', async () => {
  const t = await register('suma@test.com');
  const table = {
    normal: { '1': 600, '1.5': 650, '2': 700, '2.5': 750, '3': 800 },
    inverter: { '1': 800, '1.5': 850, '2': 900, '2.5': 950, '3': 1000 },
  };
  await req('PUT', '/me/prices', { priceTable: table }, t);
  await req('PUT', '/me', { defaultPrice: 500 }, t);
  const old = addMonths(addDays(today(), -3), -6);
  const a = await req('POST', '/equipment', { clientName: 'Laura Pérez', clientPhone: '8337778899',
    brand: 'LG', tons: '1.5 Ton', inverter: true, location: 'Sala', price: 1234, serviceDate: old }, t);
  const c = a.body.equipment.clientId;
  await req('POST', '/equipment', { clientId: c, brand: 'Mirage', tons: '2 Ton', location: 'Recámara', serviceDate: old }, t);
  await req('POST', '/equipment', { clientId: c, brand: 'York', tons: '5 Ton', location: 'Cocina', serviceDate: old }, t);
  // Uno al día: no entra en la suma
  await req('POST', '/equipment', { clientId: c, brand: 'Carrier', tons: '1 Ton', location: 'Estudio' }, t);

  const queue = (await req('GET', '/whatsapp/queue', null, t)).body.queue;
  assert.equal(queue.length, 1, 'un solo mensaje por cliente');
  // 850 (inverter 1.5) + 700 (normal 2) + 500 (5 tn no está en la tabla: precio base)
  assert.equal(queue[0].groupCount, 3);
  assert.equal(queue[0].groupTotal, 2050);
  assert.match(queue[0].message, /\$2,050/);
  assert.match(queue[0].message, /LG 1\.5 Ton, Mirage 2 Ton y York 5 Ton/);

  const sent = await req('POST', `/whatsapp/send/${a.body.equipment.id}`, {}, t);
  assert.match(sent.body.message, /\$2,050/);
  const after = (await req('GET', '/whatsapp/queue', null, t)).body;
  assert.equal(after.queue.length, 0, 'los tres equipos salen de la cola');
  assert.equal(after.sent.filter((r) => r.clientName === 'Laura Pérez').length, 1);
});
