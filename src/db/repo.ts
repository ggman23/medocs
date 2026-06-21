// Typed data-access layer. Maps SQLite rows to/from domain objects and exposes
// small CRUD helpers used by the API route handlers.

import { db, newId, nowISO } from "./index";
import {
  IntakeLogEntry,
  Insulin,
  InsulinType,
  ItemKind,
  Medication,
  PharmacyVisit,
  Sensor,
  Slot,
} from "@/domain/types";

// ---- Row shapes ----------------------------------------------------------

interface MedicationRow {
  id: string;
  name: string;
  unit: string;
  stock: number;
  stock_date: string;
  dose_morning: number;
  dose_noon: number;
  dose_evening: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface InsulinRow {
  id: string;
  name: string;
  type: InsulinType;
  units_per_ml: number;
  ml_per_cartridge: number;
  cartridges_per_box: number;
  stock_cartridges: number;
  stock_date: string;
  dose_morning: number;
  dose_noon: number;
  dose_evening: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SensorRow {
  id: string;
  name: string;
  validity_days: number;
  tolerance_hours: number;
  placed_at: string | null;
  stock: number;
  stock_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const toMedication = (r: MedicationRow): Medication => ({
  id: r.id,
  name: r.name,
  unit: r.unit,
  stock: r.stock,
  stockDate: r.stock_date,
  dose: { morning: r.dose_morning, noon: r.dose_noon, evening: r.dose_evening },
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toInsulin = (r: InsulinRow): Insulin => ({
  id: r.id,
  name: r.name,
  type: r.type,
  unitsPerMl: r.units_per_ml,
  mlPerCartridge: r.ml_per_cartridge,
  cartridgesPerBox: r.cartridges_per_box,
  stockCartridges: r.stock_cartridges,
  stockDate: r.stock_date,
  dose: { morning: r.dose_morning, noon: r.dose_noon, evening: r.dose_evening },
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toSensor = (r: SensorRow): Sensor => ({
  id: r.id,
  name: r.name,
  validityDays: r.validity_days,
  toleranceHours: r.tolerance_hours,
  placedAt: r.placed_at,
  stock: r.stock,
  stockDate: r.stock_date,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ---- Medications ---------------------------------------------------------

export interface MedicationInput {
  name: string;
  unit?: string;
  stock: number;
  stockDate: string;
  dose: { morning: number; noon: number; evening: number };
  notes?: string;
}

export function listMedications(): Medication[] {
  return (db.prepare("SELECT * FROM medications WHERE archived = 0 ORDER BY name").all() as MedicationRow[]).map(
    toMedication,
  );
}

export function getMedication(id: string): Medication | null {
  const r = db.prepare("SELECT * FROM medications WHERE id = ?").get(id) as MedicationRow | undefined;
  return r ? toMedication(r) : null;
}

export function createMedication(input: MedicationInput): Medication {
  const id = newId();
  const ts = nowISO();
  db.prepare(
    `INSERT INTO medications (id, name, unit, stock, stock_date, dose_morning, dose_noon, dose_evening, notes, created_at, updated_at)
     VALUES (@id, @name, @unit, @stock, @stock_date, @dm, @dn, @de, @notes, @ts, @ts)`,
  ).run({
    id,
    name: input.name,
    unit: input.unit || "comprimé",
    stock: input.stock,
    stock_date: input.stockDate,
    dm: input.dose.morning,
    dn: input.dose.noon,
    de: input.dose.evening,
    notes: input.notes ?? null,
    ts,
  });
  return getMedication(id)!;
}

export function updateMedication(id: string, patch: Partial<MedicationInput>): Medication | null {
  const cur = getMedication(id);
  if (!cur) return null;
  const next = {
    name: patch.name ?? cur.name,
    unit: patch.unit ?? cur.unit,
    stock: patch.stock ?? cur.stock,
    stock_date: patch.stockDate ?? cur.stockDate,
    dm: patch.dose?.morning ?? cur.dose.morning,
    dn: patch.dose?.noon ?? cur.dose.noon,
    de: patch.dose?.evening ?? cur.dose.evening,
    notes: patch.notes !== undefined ? patch.notes : cur.notes ?? null,
  };
  db.prepare(
    `UPDATE medications SET name=@name, unit=@unit, stock=@stock, stock_date=@stock_date,
       dose_morning=@dm, dose_noon=@dn, dose_evening=@de, notes=@notes, updated_at=@ts WHERE id=@id`,
  ).run({ ...next, ts: nowISO(), id });
  return getMedication(id);
}

export function deleteMedication(id: string): void {
  db.prepare("UPDATE medications SET archived = 1, updated_at = ? WHERE id = ?").run(nowISO(), id);
}

// ---- Insulins ------------------------------------------------------------

export interface InsulinInput {
  name: string;
  type: InsulinType;
  unitsPerMl?: number;
  mlPerCartridge?: number;
  cartridgesPerBox?: number;
  stockCartridges: number;
  stockDate: string;
  dose: { morning: number; noon: number; evening: number };
  notes?: string;
}

export function listInsulins(): Insulin[] {
  return (db.prepare("SELECT * FROM insulins WHERE archived = 0 ORDER BY type DESC, name").all() as InsulinRow[]).map(
    toInsulin,
  );
}

export function getInsulin(id: string): Insulin | null {
  const r = db.prepare("SELECT * FROM insulins WHERE id = ?").get(id) as InsulinRow | undefined;
  return r ? toInsulin(r) : null;
}

export function createInsulin(input: InsulinInput): Insulin {
  const id = newId();
  const ts = nowISO();
  db.prepare(
    `INSERT INTO insulins (id, name, type, units_per_ml, ml_per_cartridge, cartridges_per_box,
       stock_cartridges, stock_date, dose_morning, dose_noon, dose_evening, notes, created_at, updated_at)
     VALUES (@id, @name, @type, @upm, @mpc, @cpb, @stock, @stock_date, @dm, @dn, @de, @notes, @ts, @ts)`,
  ).run({
    id,
    name: input.name,
    type: input.type,
    upm: input.unitsPerMl ?? 100,
    mpc: input.mlPerCartridge ?? 3,
    cpb: input.cartridgesPerBox ?? 5,
    stock: input.stockCartridges,
    stock_date: input.stockDate,
    dm: input.dose.morning,
    dn: input.dose.noon,
    de: input.dose.evening,
    notes: input.notes ?? null,
    ts,
  });
  return getInsulin(id)!;
}

export function updateInsulin(id: string, patch: Partial<InsulinInput>): Insulin | null {
  const cur = getInsulin(id);
  if (!cur) return null;
  const next = {
    name: patch.name ?? cur.name,
    type: patch.type ?? cur.type,
    upm: patch.unitsPerMl ?? cur.unitsPerMl,
    mpc: patch.mlPerCartridge ?? cur.mlPerCartridge,
    cpb: patch.cartridgesPerBox ?? cur.cartridgesPerBox,
    stock: patch.stockCartridges ?? cur.stockCartridges,
    stock_date: patch.stockDate ?? cur.stockDate,
    dm: patch.dose?.morning ?? cur.dose.morning,
    dn: patch.dose?.noon ?? cur.dose.noon,
    de: patch.dose?.evening ?? cur.dose.evening,
    notes: patch.notes !== undefined ? patch.notes : cur.notes ?? null,
  };
  db.prepare(
    `UPDATE insulins SET name=@name, type=@type, units_per_ml=@upm, ml_per_cartridge=@mpc,
       cartridges_per_box=@cpb, stock_cartridges=@stock, stock_date=@stock_date,
       dose_morning=@dm, dose_noon=@dn, dose_evening=@de, notes=@notes, updated_at=@ts WHERE id=@id`,
  ).run({ ...next, ts: nowISO(), id });
  return getInsulin(id);
}

export function deleteInsulin(id: string): void {
  db.prepare("UPDATE insulins SET archived = 1, updated_at = ? WHERE id = ?").run(nowISO(), id);
}

// ---- Sensors -------------------------------------------------------------

export interface SensorInput {
  name?: string;
  validityDays?: number;
  toleranceHours?: number;
  placedAt?: string | null;
  stock: number;
  stockDate: string;
  notes?: string;
}

export function listSensors(): Sensor[] {
  return (db.prepare("SELECT * FROM sensors WHERE archived = 0 ORDER BY created_at").all() as SensorRow[]).map(
    toSensor,
  );
}

export function getSensor(id: string): Sensor | null {
  const r = db.prepare("SELECT * FROM sensors WHERE id = ?").get(id) as SensorRow | undefined;
  return r ? toSensor(r) : null;
}

export function createSensor(input: SensorInput): Sensor {
  const id = newId();
  const ts = nowISO();
  db.prepare(
    `INSERT INTO sensors (id, name, validity_days, tolerance_hours, placed_at, stock, stock_date, notes, created_at, updated_at)
     VALUES (@id, @name, @vd, @th, @placed, @stock, @stock_date, @notes, @ts, @ts)`,
  ).run({
    id,
    name: input.name || "Dexcom One+",
    vd: input.validityDays ?? 10,
    th: input.toleranceHours ?? 12,
    placed: input.placedAt ?? null,
    stock: input.stock,
    stock_date: input.stockDate,
    notes: input.notes ?? null,
    ts,
  });
  return getSensor(id)!;
}

export function updateSensor(id: string, patch: Partial<SensorInput>): Sensor | null {
  const cur = getSensor(id);
  if (!cur) return null;
  const next = {
    name: patch.name ?? cur.name,
    vd: patch.validityDays ?? cur.validityDays,
    th: patch.toleranceHours ?? cur.toleranceHours,
    placed: patch.placedAt !== undefined ? patch.placedAt : cur.placedAt,
    stock: patch.stock ?? cur.stock,
    stock_date: patch.stockDate ?? cur.stockDate,
    notes: patch.notes !== undefined ? patch.notes : cur.notes ?? null,
  };
  db.prepare(
    `UPDATE sensors SET name=@name, validity_days=@vd, tolerance_hours=@th, placed_at=@placed,
       stock=@stock, stock_date=@stock_date, notes=@notes, updated_at=@ts WHERE id=@id`,
  ).run({ ...next, ts: nowISO(), id });
  return getSensor(id);
}

export function deleteSensor(id: string): void {
  db.prepare("UPDATE sensors SET archived = 1, updated_at = ? WHERE id = ?").run(nowISO(), id);
}

/** Place a new sensor: record the moment and consume one spare from stock. */
export function placeSensor(id: string, placedAt: string): Sensor | null {
  const cur = getSensor(id);
  if (!cur) return null;
  const stock = Math.max(0, cur.stock - 1);
  db.prepare("UPDATE sensors SET placed_at=?, stock=?, updated_at=? WHERE id=?").run(
    placedAt,
    stock,
    nowISO(),
    id,
  );
  return getSensor(id);
}

// ---- Intake logs ---------------------------------------------------------

interface IntakeRow {
  date: string;
  slot: Slot;
  amount: number;
}

export function listIntakeSince(kind: ItemKind, itemId: string, fromDate: string): IntakeLogEntry[] {
  return (
    db
      .prepare(
        "SELECT date, slot, amount FROM intake_logs WHERE item_kind = ? AND item_id = ? AND date >= ?",
      )
      .all(kind, itemId, fromDate) as IntakeRow[]
  ).map((r) => ({ date: r.date, slot: r.slot, amount: r.amount }));
}

/** Insert or update one intake entry (a recorded dose for a day + slot). */
export function upsertIntake(
  kind: ItemKind,
  itemId: string,
  date: string,
  slot: Slot,
  amount: number,
): void {
  const ts = nowISO();
  db.prepare(
    `INSERT INTO intake_logs (id, item_kind, item_id, date, slot, amount, created_at, updated_at)
     VALUES (@id, @kind, @item, @date, @slot, @amount, @ts, @ts)
     ON CONFLICT (item_kind, item_id, date, slot)
     DO UPDATE SET amount = @amount, updated_at = @ts`,
  ).run({ id: newId(), kind, item: itemId, date, slot, amount, ts });
}

/** Remove an intake override (reverts that slot to its scheduled default). */
export function deleteIntake(kind: ItemKind, itemId: string, date: string, slot: Slot): void {
  db.prepare(
    "DELETE FROM intake_logs WHERE item_kind = ? AND item_id = ? AND date = ? AND slot = ?",
  ).run(kind, itemId, date, slot);
}

// ---- Pharmacy visits -----------------------------------------------------

export function listPharmacyVisits(): PharmacyVisit[] {
  return db
    .prepare("SELECT id, date, note FROM pharmacy_visits ORDER BY date DESC")
    .all() as PharmacyVisit[];
}

export function addPharmacyVisit(date: string, note?: string): PharmacyVisit {
  const id = newId();
  db.prepare("INSERT INTO pharmacy_visits (id, date, note, created_at) VALUES (?, ?, ?, ?)").run(
    id,
    date,
    note ?? null,
    nowISO(),
  );
  return { id, date, note };
}

export function deletePharmacyVisit(id: string): void {
  db.prepare("DELETE FROM pharmacy_visits WHERE id = ?").run(id);
}
