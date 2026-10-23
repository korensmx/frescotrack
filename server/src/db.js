// Base de datos de FrescoTrack.
// Usamos SQLite que ya viene dentro de Node (node:sqlite): es un solo archivo,
// no necesita instalar nada extra y es perfecto para empezar.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  name             TEXT NOT NULL,
  business_name    TEXT NOT NULL DEFAULT '',
  phone            TEXT NOT NULL DEFAULT '',
  city             TEXT NOT NULL DEFAULT '',
  default_price    INTEGER NOT NULL DEFAULT 750,
  message_template TEXT,
  plan             TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at    TEXT NOT NULL,
  mp_preapproval_id TEXT,
  plan_status      TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  address    TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equipment (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id         INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  qr_code           TEXT NOT NULL UNIQUE,
  brand             TEXT NOT NULL DEFAULT '',
  tons              TEXT NOT NULL DEFAULT '',
  refrigerant       TEXT NOT NULL DEFAULT '',
  inverter          INTEGER NOT NULL DEFAULT 0,
  location          TEXT NOT NULL DEFAULT '',
  interval_months   INTEGER NOT NULL DEFAULT 6,
  price             INTEGER NOT NULL DEFAULT 750,
  last_service_date TEXT NOT NULL,
  next_service_date TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  date         TEXT NOT NULL,
  type         TEXT NOT NULL,
  notes        TEXT NOT NULL DEFAULT '',
  cost         INTEGER NOT NULL DEFAULT 0,
  rescued      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reminders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'sent',
  message      TEXT NOT NULL,
  sent_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cada sticker impreso queda apartado a nombre de un solo técnico.
CREATE TABLE IF NOT EXISTS qr_codes (
  code       TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clients_user   ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_user ON equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_services_eq    ON services(equipment_id);
CREATE INDEX IF NOT EXISTS idx_reminders_eq   ON reminders(equipment_id);
`;

// Columnas que se agregaron después: si la base ya existía, se las ponemos sin borrar nada.
const NEW_COLUMNS = [
  ['users', 'auto_send', 'INTEGER NOT NULL DEFAULT 1'],       // 1 = mandar recordatorios solos
  ['users', 'auto_send_hour', 'INTEGER NOT NULL DEFAULT 10'], // hora del día para mandarlos
];

function migrate(db) {
  for (const [table, column, type] of NEW_COLUMNS) {
    const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
    if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrate(db);
  return db;
}
