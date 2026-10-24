// Pruebas de las protecciones de seguridad (auditoría 2026-10).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db.js';
import { createApp, buildMessage } from '../src/app.js';
import { addMonths, today } from '../src/dates.js';

let server, base, db;
let gate = null; // si existe, el envío espera a que se resuelva (para probar carreras)
const sent = [];
const fakeEvolution = {
  enabled: true,
  state: async () => 'open',
  connect: async () => ({ qr: 'x' }),
  logout: async () => {},
  sendText: async (userId, number, text) => { if (gate) await gate; sent.push({ userId, number, text }); },
};
const subs = {};
const fakeMp = {
  enabled: true, price: 299,
  async createSubscription({ userId }) {
    const s = { id: `sub-${userId}`, status: 'pending', reason: 'FrescoTrack Pro', external_reference: String(userId),
      auto_recurring: { transaction_amount: 299, currency_id: 'MXN' }, init_point: 'https://mp.test/pay' };
    subs[s.id] = s; return s;
  },
  async getSubscription(id) { return subs[id]; },
  async cancelSubscription(id) { subs[id].status = 'cancelled'; return subs[id]; },
  isValidSignature: () => true,
};

before(async () => {
  db = openDatabase(':memory:');
  const app = createApp({
    db, jwtSecret: 'test', publicUrl: 'https://app.test', evolution: fakeEvolution, mercadopago: fakeMp, sendGapMs: 0,
    limits: { login: { windowMs: 60_000, max: 3 }, register: { windowMs: 60_000, max: 50 }, qrSheet: { windowMs: 60_000, max: 2 } },
  });
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
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
}
async function register(email) {
  const r = await req('POST', '/auth/register', { email, password: 'secreto123', name: 'Tec Prueba', phone: '8331234567' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}

test('cabeceras de seguridad y sin X-Powered-By', async () => {
  const r = await req('GET', '/health');
  assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('x-powered-by'), null);
});

test('login: bloquea fuerza bruta', async () => {
  await register('bruto@test.com');
  for (let i = 0; i < 3; i++) {
    assert.equal((await req('POST', '/auth/login', { email: 'bruto@test.com', password: 'mala' + i })).status, 401);
  }
  const blocked = await req('POST', '/auth/login', { email: 'bruto@test.com', password: 'secreto123' });
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get('retry-after'));
});

test('cambiar contraseña cierra las demás sesiones', async () => {
  const { token: oldToken } = await register('sesion@test.com');
  const r = await req('PUT', '/me/password', { currentPassword: 'secreto123', newPassword: 'nueva-clave-123' }, oldToken);
  assert.equal(r.status, 200);
  assert.equal((await req('GET', '/me', null, oldToken)).status, 401);
  assert.equal((await req('GET', '/me', null, r.body.token)).status, 200);
});

test('JWT con algoritmo "none" no entra', async () => {
  const { user } = await register('none@test.com');
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: user.id, v: 0 })}.`;
  assert.equal((await req('GET', '/me', null, forged)).status, 401);
});

test('stickers: con la prueba vencida no se pueden apartar y hay límite por hora', async () => {
  const { token } = await register('stickers@test.com');
  assert.equal((await req('GET', '/qr/sheet?count=1', null, token)).status, 200);
  assert.equal((await req('GET', '/qr/sheet?count=1', null, token)).status, 200);
  assert.equal((await req('GET', '/qr/sheet?count=1', null, token)).status, 429);

  const { token: t2 } = await register('vencido@test.com');
  db.prepare("UPDATE users SET trial_ends_at = '2000-01-01' WHERE email = 'vencido@test.com'").run();
  assert.equal((await req('GET', '/qr/sheet?count=48', null, t2)).status, 402);
});

test('webhook: una suscripción que no es FrescoTrack Pro no regala Pro', async () => {
  const { user, token } = await register('gratis@test.com');
  subs.otra = { id: 'otra', status: 'authorized', reason: 'Otro producto', external_reference: String(user.id),
    auto_recurring: { transaction_amount: 10, currency_id: 'MXN' } };
  const hook = await fetch(base + '/billing/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'subscription_preapproval', data: { id: 'otra' } }) });
  assert.equal(hook.status, 200);
  assert.equal((await req('GET', '/me', null, token)).body.user.plan, 'trial');
});

test('webhook: el aviso de una suscripción vieja no le quita Pro a quien pagó la nueva', async () => {
  const { user, token } = await register('renovo@test.com');
  subs.vieja = { id: 'vieja', status: 'cancelled', reason: 'FrescoTrack Pro', external_reference: String(user.id),
    auto_recurring: { transaction_amount: 299, currency_id: 'MXN' } };
  await req('POST', '/billing/subscribe', {}, token);
  subs[`sub-${user.id}`].status = 'authorized';
  const hook = (id) => fetch(base + '/billing/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'subscription_preapproval', data: { id } }) });
  await hook(`sub-${user.id}`);
  assert.equal((await req('GET', '/me', null, token)).body.user.plan, 'pro');
  await hook('vieja');
  assert.equal((await req('GET', '/me', null, token)).body.user.plan, 'pro');
});

test('WhatsApp: dos lotes al mismo tiempo no duplican mensajes', async () => {
  const { token } = await register('lote@test.com');
  for (const [qr, phone] of [['FT-LOTE01', '8340000001'], ['FT-LOTE02', '8340000002']]) {
    const r = await req('POST', '/equipment', { qrCode: qr, clientName: 'Cliente', clientPhone: phone, serviceDate: addMonths(today(), -6) }, token);
    assert.equal(r.status, 201);
  }
  let open;
  gate = new Promise((r) => { open = r; });
  const first = req('POST', '/whatsapp/send-batch', {}, token);
  await new Promise((r) => setTimeout(r, 50));
  const second = await req('POST', '/whatsapp/send-batch', {}, token);
  assert.equal(second.status, 409);
  open(); gate = null;
  assert.equal((await first).body.sent, 2);
  assert.equal(sent.filter((m) => m.number.startsWith('52834')).length, 2);
});

test('precios absurdos se recortan', async () => {
  const { token } = await register('precio@test.com');
  const r = await req('POST', '/equipment', { clientName: 'X', clientPhone: '8331111111', price: '999999999999999999999' }, token);
  assert.equal(r.body.equipment.price, 1_000_000);
});

test('plantilla: no se cuelan propiedades internas', () => {
  assert.equal(buildMessage('{constructor} {cliente}', { cliente: 'Ana' }), '{constructor} Ana');
});
