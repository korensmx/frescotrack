import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEvolutionClient } from '../src/evolution.js';

// Simula la Evolution API y anota cada llamada.
function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, method: opts.method, body: opts.body ? JSON.parse(opts.body) : null });
    const path = url.replace('https://evo.test', '');
    const handler = routes.find(([m, re]) => m === opts.method && re.test(path));
    const [status, data] = handler ? handler[2](path) : [404, { error: 'not found' }];
    return { ok: status < 300, status, text: async () => JSON.stringify(data) };
  };
  fn.calls = calls;
  return fn;
}

test('conectar con número pide código de vinculación', async () => {
  let created = false;
  const f = fakeFetch([
    ['GET', /^\/instance\/connect\/ft-7/, () => created ? [200, { base64: 'data:img', pairingCode: 'ABCD1234' }] : [404, {}]],
    ['POST', /^\/instance\/create$/, () => { created = true; return [201, {}]; }],
  ]);
  const evo = createEvolutionClient({ url: 'https://evo.test/', apiKey: 'k', fetchImpl: f });
  const r = await evo.connect(7, '528331234567');
  assert.deepEqual(r, { qr: 'data:img', pairingCode: 'ABCD1234' });
  assert.equal(f.calls[0].url, 'https://evo.test/instance/connect/ft-7?number=528331234567');
  assert.equal(f.calls[1].body.number, '528331234567');
  assert.equal(f.calls[2].url, 'https://evo.test/instance/connect/ft-7?number=528331234567');
});

test('conectar sin número solo regresa QR', async () => {
  const f = fakeFetch([['GET', /^\/instance\/connect\/ft-1$/, () => [200, { base64: 'data:img' }]]]);
  const evo = createEvolutionClient({ url: 'https://evo.test', apiKey: 'k', fetchImpl: f });
  assert.deepEqual(await evo.connect(1), { qr: 'data:img', pairingCode: null });
});

test('ya conectado', async () => {
  const f = fakeFetch([['GET', /^\/instance\/connect\//, () => [200, { instance: { state: 'open' } }]]]);
  const evo = createEvolutionClient({ url: 'https://evo.test', apiKey: 'k', fetchImpl: f });
  assert.deepEqual(await evo.connect(1, '528331234567'), { connected: true });
});
