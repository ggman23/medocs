// SQLite connection + schema. The database is the single source of truth that
// every device reads from and writes to, which is what makes changes made on
// the phone show up on the PC (and vice-versa).

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_PATH = path.join(process.cwd(), "data", "medocs.db");
const DB_PATH = process.env.DATABASE_PATH || DEFAULT_PATH;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS medications (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'comprimé',
  stock         REAL NOT NULL,
  stock_date    TEXT NOT NULL,
  dose_morning  REAL NOT NULL DEFAULT 0,
  dose_noon     REAL NOT NULL DEFAULT 0,
  dose_evening  REAL NOT NULL DEFAULT 0,
  notes         TEXT,
  archived      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS insulins (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  type               TEXT NOT NULL,
  units_per_ml       REAL NOT NULL DEFAULT 100,
  ml_per_cartridge   REAL NOT NULL DEFAULT 3,
  cartridges_per_box REAL NOT NULL DEFAULT 5,
  stock_cartridges   REAL NOT NULL,
  stock_date         TEXT NOT NULL,
  dose_morning       REAL NOT NULL DEFAULT 0,
  dose_noon          REAL NOT NULL DEFAULT 0,
  dose_evening       REAL NOT NULL DEFAULT 0,
  notes              TEXT,
  archived           INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sensors (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL DEFAULT 'Dexcom One+',
  validity_days   REAL NOT NULL DEFAULT 10,
  tolerance_hours REAL NOT NULL DEFAULT 12,
  placed_at       TEXT,
  stock           INTEGER NOT NULL DEFAULT 0,
  stock_date      TEXT NOT NULL,
  notes           TEXT,
  archived        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intake_logs (
  id         TEXT PRIMARY KEY,
  item_kind  TEXT NOT NULL,
  item_id    TEXT NOT NULL,
  date       TEXT NOT NULL,
  slot       TEXT NOT NULL,
  amount     REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (item_kind, item_id, date, slot)
);
CREATE INDEX IF NOT EXISTS idx_intake_lookup ON intake_logs (item_kind, item_id, date);

CREATE TABLE IF NOT EXISTS pharmacy_visits (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL
);
`;

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

// Reuse a single connection across hot reloads in development.
const globalForDb = globalThis as unknown as { __medocsDb?: Database.Database };

export const db: Database.Database = globalForDb.__medocsDb ?? open();
if (process.env.NODE_ENV !== "production") globalForDb.__medocsDb = db;

export const nowISO = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();
