// Punto de arranque: abre la base de datos, prende la API y sirve la app (PWA).
import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';
import { createApp } from './app.js';
import { createEvolutionClient } from './evolution.js';
import { createMercadoPagoClient } from './mercadopago.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DB_FILE = process.env.DB_FILE || path.join(here, '../../data/frescotrack.db');
const CLIENT_DIST = process.env.CLIENT_DIST || path.join(here, '../../client/dist');

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Falta la variable JWT_SECRET. Agrégala en Dokploy (Environment).');
    process.exit(1);
  }
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('JWT_SECRET no está definido: usando uno temporal (las sesiones se cerrarán al reiniciar).');
}
if (process.env.NODE_ENV === 'production' && jwtSecret.length < 32) {
  console.error('JWT_SECRET es muy corto (mínimo 32 caracteres). Genera uno con: openssl rand -hex 32');
  process.exit(1);
}
if (process.env.MP_ACCESS_TOKEN && !process.env.MP_WEBHOOK_SECRET) {
  console.warn('Aviso: falta MP_WEBHOOK_SECRET. Los avisos de Mercado Pago no se pueden comprobar con firma.');
}

const db = openDatabase(DB_FILE);
const evolution = createEvolutionClient({ url: process.env.EVOLUTION_API_URL, apiKey: process.env.EVOLUTION_API_KEY });
const mercadopago = createMercadoPagoClient({
  accessToken: process.env.MP_ACCESS_TOKEN,
  webhookSecret: process.env.MP_WEBHOOK_SECRET,
  price: Number(process.env.PRO_PRICE_MXN || 299),
});
const app = createApp({
  db,
  jwtSecret,
  evolution,
  mercadopago,
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/+$/, ''),
  supportPhone: process.env.SUPPORT_PHONE || '',
  // Cuántos "saltos" de proxy hay delante (Traefik de Dokploy = 1). Sirve para saber la IP real.
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),
});

// Sirve la app ya construida (carpeta client/dist). Cualquier ruta que no sea
// de la API regresa index.html para que React decida qué pantalla mostrar.
app.use(express.static(CLIENT_DIST, {
  setHeaders(res, file) {
    if (/(index\.html|sw\.js|manifest\.webmanifest)$/.test(file)) res.setHeader('Cache-Control', 'no-cache');
  },
}));
app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));

// Cada 10 minutos revisamos si hay recordatorios que deban salir solos.
const AUTO_EVERY_MS = 10 * 60 * 1000;
const autoTick = () => app.locals.runAutoReminders()
  .then((r) => { if (r.sent || r.errors) console.log(`Envío automático: ${r.sent} enviados, ${r.errors} con error`); })
  .catch((err) => console.error('Envío automático falló:', err));
setTimeout(autoTick, 30 * 1000);
setInterval(autoTick, AUTO_EVERY_MS);

app.listen(PORT, () => {
  console.log(`FrescoTrack listo en el puerto ${PORT}`);
  console.log(mercadopago.enabled ? 'Cobros: Mercado Pago activo' : 'Cobros: apagados (falta MP_ACCESS_TOKEN)');
  console.log(evolution.enabled ? 'WhatsApp automático: Evolution API conectada' : 'WhatsApp automático: apagado (solo ligas wa.me)');
});
