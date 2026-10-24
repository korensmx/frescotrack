// Copias de seguridad de la base de datos.
// Es como sacarle una fotocopia al cuaderno: si un día el original se moja,
// sacamos la copia del cajón y seguimos trabajando.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const PREFIX = 'frescotrack-';
const SUFFIX = '.db';

// SQLite hace la copia "en caliente": no hay que apagar la app y la copia sale completa.
export function copyDatabase(db, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db.exec(`VACUUM INTO '${file.replaceAll("'", "''")}'`);
  return file;
}

// Lista las copias de la carpeta, de la más nueva a la más vieja.
export function listBackups(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.startsWith(PREFIX) && f.endsWith(SUFFIX))
    .sort()
    .reverse();
}

// Saca la copia de hoy (si todavía no existe) y borra las más viejas.
export function dailyBackup(db, dir, { keep = 14, now = new Date() } = {}) {
  const day = now.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }); // 2026-10-24
  const name = `${PREFIX}${day}${SUFFIX}`;
  let created = null;
  if (!listBackups(dir).includes(name)) {
    const tmp = path.join(dir, `.${name}.tmp`);
    fs.rmSync(tmp, { force: true });
    copyDatabase(db, tmp);
    fs.renameSync(tmp, path.join(dir, name)); // solo queda con su nombre final si salió completa
    created = name;
  }
  const removed = listBackups(dir).slice(keep);
  for (const f of removed) fs.rmSync(path.join(dir, f), { force: true });
  return { created, removed, kept: listBackups(dir) };
}

// Copia de un solo uso en /tmp (para descargarla). Quien la pide la borra al terminar.
export function tempCopy(db) {
  const file = path.join(os.tmpdir(), `${PREFIX}${crypto.randomBytes(6).toString('hex')}${SUFFIX}`);
  return copyDatabase(db, file);
}
