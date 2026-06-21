// Pure transforms over the MedocsData document. Each returns a new document so
// they can be replayed on fresh data when resolving a concurrent write.

import { MedocsData, IntakeRecord } from "./data";
import {
  DoseSchedule,
  Insulin,
  InsulinType,
  ItemKind,
  Medication,
  Sensor,
  Slot,
} from "./types";

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => new Date().toISOString();

export interface MedicationInput {
  name: string;
  unit?: string;
  stock: number;
  stockDate: string;
  dose: DoseSchedule;
  notes?: string;
}

export interface InsulinInput {
  name: string;
  type: InsulinType;
  unitsPerMl?: number;
  mlPerCartridge?: number;
  cartridgesPerBox?: number;
  stockCartridges: number;
  stockDate: string;
  dose: DoseSchedule;
  notes?: string;
}

export interface SensorInput {
  name?: string;
  validityDays?: number;
  toleranceHours?: number;
  placedAt?: string | null;
  stock: number;
  stockDate: string;
  notes?: string;
}

// ---- Medications ---------------------------------------------------------

export function addMedication(data: MedocsData, input: MedicationInput): MedocsData {
  const med: Medication = {
    id: newId(),
    name: input.name,
    unit: input.unit || "comprimé",
    stock: input.stock,
    stockDate: input.stockDate,
    dose: input.dose,
    notes: input.notes,
    createdAt: now(),
    updatedAt: now(),
  };
  return { ...data, medications: [...data.medications, med] };
}

export function updateMedication(
  data: MedocsData,
  id: string,
  patch: Partial<MedicationInput>,
): MedocsData {
  return {
    ...data,
    medications: data.medications.map((m) =>
      m.id === id ? { ...m, ...patch, dose: { ...m.dose, ...patch.dose }, updatedAt: now() } : m,
    ),
  };
}

export function removeMedication(data: MedocsData, id: string): MedocsData {
  return {
    ...data,
    medications: data.medications.filter((m) => m.id !== id),
    intake: data.intake.filter((r) => !(r.kind === "medication" && r.itemId === id)),
  };
}

// ---- Insulins ------------------------------------------------------------

export function addInsulin(data: MedocsData, input: InsulinInput): MedocsData {
  const ins: Insulin = {
    id: newId(),
    name: input.name,
    type: input.type,
    unitsPerMl: input.unitsPerMl ?? 100,
    mlPerCartridge: input.mlPerCartridge ?? 3,
    cartridgesPerBox: input.cartridgesPerBox ?? 5,
    stockCartridges: input.stockCartridges,
    stockDate: input.stockDate,
    dose: input.dose,
    notes: input.notes,
    createdAt: now(),
    updatedAt: now(),
  };
  return { ...data, insulins: [...data.insulins, ins] };
}

export function updateInsulin(
  data: MedocsData,
  id: string,
  patch: Partial<InsulinInput>,
): MedocsData {
  return {
    ...data,
    insulins: data.insulins.map((i) =>
      i.id === id ? { ...i, ...patch, dose: { ...i.dose, ...patch.dose }, updatedAt: now() } : i,
    ),
  };
}

export function removeInsulin(data: MedocsData, id: string): MedocsData {
  return {
    ...data,
    insulins: data.insulins.filter((i) => i.id !== id),
    intake: data.intake.filter((r) => !(r.kind === "insulin" && r.itemId === id)),
  };
}

// ---- Sensors -------------------------------------------------------------

export function addSensor(data: MedocsData, input: SensorInput): MedocsData {
  const sensor: Sensor = {
    id: newId(),
    name: input.name || "Dexcom One+",
    validityDays: input.validityDays ?? 10,
    toleranceHours: input.toleranceHours ?? 12,
    placedAt: input.placedAt ?? null,
    stock: input.stock,
    stockDate: input.stockDate,
    notes: input.notes,
    createdAt: now(),
    updatedAt: now(),
  };
  return { ...data, sensors: [...data.sensors, sensor] };
}

export function updateSensor(
  data: MedocsData,
  id: string,
  patch: Partial<SensorInput>,
): MedocsData {
  return {
    ...data,
    sensors: data.sensors.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: now() } : s)),
  };
}

export function removeSensor(data: MedocsData, id: string): MedocsData {
  return { ...data, sensors: data.sensors.filter((s) => s.id !== id) };
}

/** Record a new placement and consume one spare. */
export function placeSensor(data: MedocsData, id: string, placedAt: string): MedocsData {
  return {
    ...data,
    sensors: data.sensors.map((s) =>
      s.id === id ? { ...s, placedAt, stock: Math.max(0, s.stock - 1), updatedAt: now() } : s,
    ),
  };
}

// ---- Intake --------------------------------------------------------------

export function setIntake(
  data: MedocsData,
  kind: ItemKind,
  itemId: string,
  date: string,
  slot: Slot,
  amount: number | null,
): MedocsData {
  const rest = data.intake.filter(
    (r) => !(r.kind === kind && r.itemId === itemId && r.date === date && r.slot === slot),
  );
  if (amount === null) return { ...data, intake: rest };
  const record: IntakeRecord = { kind, itemId, date, slot, amount };
  return { ...data, intake: [...rest, record] };
}

// ---- Pharmacy ------------------------------------------------------------

export function addPharmacyVisit(data: MedocsData, date: string, note?: string): MedocsData {
  return {
    ...data,
    pharmacyVisits: [...data.pharmacyVisits, { id: newId(), date, note }],
  };
}

export function removePharmacyVisit(data: MedocsData, id: string): MedocsData {
  return { ...data, pharmacyVisits: data.pharmacyVisits.filter((v) => v.id !== id) };
}
