// Capa de base de datos: SQLite nativo de Node (node:sqlite), sin dependencias externas.
// La base queda en un único archivo: backend/data/stocktouch.sqlite
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db = null;

export function initDb({ inMemory = false } = {}) {
  let destino = ':memory:';
  if (!inMemory) {
    destino = path.resolve(__dirname, '..', process.env.DB_PATH || './data/stocktouch.sqlite');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
  }
  db = new DatabaseSync(destino);
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  return db;
}

/** SELECT → array de objetos */
export function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

/** SELECT → primer objeto o null */
export function get(sql, params = []) {
  return db.prepare(sql).get(...params) ?? null;
}

/** INSERT/UPDATE/DELETE → { lastId, changes } */
export function run(sql, params = []) {
  const r = db.prepare(sql).run(...params);
  return { lastId: Number(r.lastInsertRowid), changes: Number(r.changes) };
}

/** Ejecuta varias operaciones juntas: si una falla, no se guarda ninguna. */
export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function resetDb() {
  db.exec(`
    DELETE FROM pedidos; DELETE FROM registros_stock; DELETE FROM cierres;
    DELETE FROM insumos; DELETE FROM proveedores; DELETE FROM locales;
    DELETE FROM sqlite_sequence;
  `);
}
