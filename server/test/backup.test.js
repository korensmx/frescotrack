import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../src/db.js';
import { dailyBackup, listBackups } from '../src/backup.js';

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ft-backup-'));

test('la copia diaria guarda los datos y no se repite el mismo día', () => {
  const dir = tmpDir();
  const db = openDatabase(path.join(dir, 'frescotrack.db'));
  db.prepare("INSERT INTO users (email, password_hash, name, trial_ends_at) VALUES ('a@test.com', 'x', 'Ana', '2026-11-01')").run();
  const backups = path.join(dir, 'backups');
  const now = new Date('2026-10-24T18:00:00Z');

  const first = dailyBackup(db, backups, { now });
  assert.equal(first.created, 'frescotrack-2026-10-24.db');
  const copy = new DatabaseSync(path.join(backups, first.created), { readOnly: true });
  assert.equal(copy.prepare('SELECT name FROM users').get().name, 'Ana');
  copy.close();

  assert.equal(dailyBackup(db, backups, { now }).created, null);
  assert.deepEqual(fs.readdirSync(backups), ['frescotrack-2026-10-24.db']);
});

test('solo se quedan las copias más nuevas', () => {
  const dir = tmpDir();
  const db = openDatabase(path.join(dir, 'frescotrack.db'));
  for (let d = 1; d <= 5; d++) dailyBackup(db, dir, { keep: 3, now: new Date(`2026-10-0${d}T18:00:00Z`) });
  assert.deepEqual(listBackups(dir), ['frescotrack-2026-10-05.db', 'frescotrack-2026-10-04.db', 'frescotrack-2026-10-03.db']);
});
