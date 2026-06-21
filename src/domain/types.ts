// Shared domain types for the Médocs health-stock tracker.

export type Slot = "morning" | "noon" | "evening";

export const SLOTS: Slot[] = ["morning", "noon", "evening"];

export const SLOT_LABELS_FR: Record<Slot, string> = {
  morning: "Matin",
  noon: "Midi",
  evening: "Soir",
};

/** Scheduled dose (prescription) per slot. Unit depends on the item. */
export interface DoseSchedule {
  morning: number;
  noon: number;
  evening: number;
}

/** A recorded intake that overrides the scheduled dose for one slot of one day. */
export interface IntakeLogEntry {
  date: string; // YYYY-MM-DD (local calendar date)
  slot: Slot;
  amount: number; // actual amount taken (0 = skipped)
}

export type ItemKind = "medication" | "insulin" | "sensor";
export type InsulinType = "rapid" | "slow";

/** A pill-based medication. */
export interface Medication {
  id: string;
  name: string;
  unit: string; // e.g. "comprimé"
  stock: number; // baseline stock measured at stockDate
  stockDate: string; // YYYY-MM-DD
  dose: DoseSchedule; // pills per slot
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Insulin (rapid or slow), dosed and stocked in units, managed in cartridges. */
export interface Insulin {
  id: string;
  name: string;
  type: InsulinType;
  unitsPerMl: number; // e.g. 100
  mlPerCartridge: number; // e.g. 3
  cartridgesPerBox: number; // e.g. 5
  stockCartridges: number; // baseline stock in cartridges at stockDate
  stockDate: string; // YYYY-MM-DD
  dose: DoseSchedule; // units per slot (slow uses only evening)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** A continuous glucose sensor (e.g. Dexcom One+). */
export interface Sensor {
  id: string;
  name: string;
  validityDays: number; // e.g. 10
  toleranceHours: number; // grace period, e.g. 12
  placedAt: string | null; // ISO datetime of the currently worn sensor, or null
  stock: number; // spare sensors on hand
  stockDate: string; // YYYY-MM-DD (when stock was last set)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** A pharmacy visit (the user may only go once a month). */
export interface PharmacyVisit {
  id: string;
  date: string; // YYYY-MM-DD
  note?: string;
}

export const unitsPerCartridge = (i: Pick<Insulin, "unitsPerMl" | "mlPerCartridge">) =>
  i.unitsPerMl * i.mlPerCartridge;
