// Core stock & projection logic. Pure functions, no I/O — unit-tested against
// the scenarios described by the user.

import { addDays, diffDays, instantFromLocal } from "./dates";
import {
  DoseSchedule,
  IntakeLogEntry,
  Insulin,
  Medication,
  Sensor,
  Slot,
  SLOTS,
  unitsPerCartridge,
} from "./types";

export const dailyDose = (d: DoseSchedule): number => d.morning + d.noon + d.evening;

export interface ConsumptionInput {
  /** Baseline stock measured at stockDate (pills or insulin units). */
  stock: number;
  stockDate: string; // YYYY-MM-DD
  schedule: DoseSchedule;
  logs: IntakeLogEntry[];
}

export interface StockProjection {
  /** Scheduled consumption per day. */
  dailyDose: number;
  /** Stock at the start of today, before today's doses (matches "le lendemain" numbers). */
  stockStartOfToday: number;
  /** Live stock: start-of-today minus what was actually logged so far today. */
  currentStock: number;
  /** Whole days of full scheduled doses remaining, counting today. */
  daysRemaining: number;
  /** Last day on which a full scheduled dose is still available, or null if no dose. */
  runOutDate: string | null;
  /** True once the run-out date is in the past. */
  depleted: boolean;
}

/**
 * Build a lookup of logged amounts by "date|slot". The most recent write for a
 * given date+slot wins (callers pass de-duplicated logs in practice).
 */
function indexLogs(logs: IntakeLogEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of logs) map.set(`${l.date}|${l.slot}`, l.amount);
  return map;
}

/**
 * Consumption recorded for a single day.
 *
 * Rules that reproduce the user's mental model:
 *  - A slot with an explicit log uses the logged amount (0 = skipped).
 *  - For PAST days, an unlogged slot defaults to its scheduled dose (you took it
 *    as prescribed unless you said otherwise).
 *  - For TODAY, an unlogged slot is still "pending" and counts as 0, so the
 *    headline stock only drops once a day has fully elapsed.
 */
function consumedOnDay(
  dayISO: string,
  schedule: DoseSchedule,
  logIndex: Map<string, number>,
  isToday: boolean,
): number {
  let total = 0;
  for (const slot of SLOTS) {
    const key = `${dayISO}|${slot}`;
    if (logIndex.has(key)) {
      total += logIndex.get(key)!;
    } else if (!isToday) {
      total += schedule[slot];
    }
  }
  return total;
}

export function projectStock(input: ConsumptionInput, todayISO: string): StockProjection {
  const { stock, stockDate, schedule, logs } = input;
  const dose = dailyDose(schedule);
  const logIndex = indexLogs(logs);

  let consumedBeforeToday = 0;
  let consumedToday = 0;

  // Only accrue consumption from the day the stock was set, up to today.
  if (diffDays(todayISO, stockDate) >= 0) {
    let day = stockDate;
    for (let guard = 0; guard <= 3650; guard++) {
      const cmp = diffDays(todayISO, day);
      if (cmp < 0) break;
      const isToday = cmp === 0;
      const c = consumedOnDay(day, schedule, logIndex, isToday);
      if (isToday) consumedToday += c;
      else consumedBeforeToday += c;
      if (isToday) break;
      day = addDays(day, 1);
    }
  }

  const stockStartOfToday = stock - consumedBeforeToday;
  const currentStock = stockStartOfToday - consumedToday;

  let daysRemaining: number;
  let runOutDate: string | null;
  if (dose > 0) {
    daysRemaining = Math.floor(stockStartOfToday / dose);
    // The last day a full dose is available is "today + daysRemaining - 1".
    runOutDate = addDays(todayISO, daysRemaining - 1);
  } else {
    daysRemaining = Number.POSITIVE_INFINITY;
    runOutDate = null;
  }

  return {
    dailyDose: dose,
    stockStartOfToday,
    currentStock,
    daysRemaining,
    runOutDate,
    depleted: runOutDate !== null && diffDays(runOutDate, todayISO) < 0,
  };
}

// ---- Medication ----------------------------------------------------------

export interface MedicationView extends StockProjection {
  id: string;
  unit: string;
}

export function projectMedication(
  med: Medication,
  logs: IntakeLogEntry[],
  todayISO: string,
): MedicationView {
  const p = projectStock(
    { stock: med.stock, stockDate: med.stockDate, schedule: med.dose, logs },
    todayISO,
  );
  return { ...p, id: med.id, unit: med.unit };
}

// ---- Insulin -------------------------------------------------------------

export interface InsulinView extends StockProjection {
  id: string;
  unitsPerCartridge: number;
  /** Live stock expressed in cartridges. */
  currentCartridges: number;
}

export function projectInsulin(
  ins: Insulin,
  logs: IntakeLogEntry[],
  todayISO: string,
): InsulinView {
  const upc = unitsPerCartridge(ins);
  const baselineUnits = ins.stockCartridges * upc;
  const p = projectStock(
    { stock: baselineUnits, stockDate: ins.stockDate, schedule: ins.dose, logs },
    todayISO,
  );
  return {
    ...p,
    id: ins.id,
    unitsPerCartridge: upc,
    currentCartridges: upc > 0 ? p.currentStock / upc : 0,
  };
}

// ---- Sensor (Dexcom) -----------------------------------------------------

export type SensorState = "none" | "active" | "tolerance" | "expired";

export interface SensorStatus {
  state: SensorState;
  placedAt: Date | null;
  /** End of normal function: placedAt + validityDays. */
  expiresAt: Date | null;
  /** Hard limit to swap: expiresAt + toleranceHours. */
  toleranceUntil: Date | null;
  /** Hours of normal function remaining (can be negative inside tolerance). */
  hoursRemaining: number | null;
  /** When the spares run out: current expiry + spares × validity. The pharmacy deadline. */
  coverageEnd: Date;
  spares: number;
}

/**
 * Status of the currently worn sensor.
 *
 * `placedAt` is an ISO datetime (resolved in the app timezone). Expiry is
 * exactly `validityDays` later, with an additional `toleranceHours` grace
 * window before the sensor must be replaced.
 */
export function sensorStatus(sensor: Sensor, now: Date = new Date()): SensorStatus {
  const dayMs = 86_400_000;
  const spareMs = sensor.stock * sensor.validityDays * dayMs;

  if (!sensor.placedAt) {
    return {
      state: "none",
      placedAt: null,
      expiresAt: null,
      toleranceUntil: null,
      hoursRemaining: null,
      // No sensor worn yet: the spares would be placed starting now.
      coverageEnd: new Date(now.getTime() + spareMs),
      spares: sensor.stock,
    };
  }
  const placedAt = new Date(sensor.placedAt);
  const expiresAt = new Date(placedAt.getTime() + sensor.validityDays * dayMs);
  const toleranceUntil = new Date(expiresAt.getTime() + sensor.toleranceHours * 3_600_000);
  const hoursRemaining = (expiresAt.getTime() - now.getTime()) / 3_600_000;

  let state: SensorState;
  if (now < expiresAt) state = "active";
  else if (now < toleranceUntil) state = "tolerance";
  else state = "expired";

  return {
    state,
    placedAt,
    expiresAt,
    toleranceUntil,
    hoursRemaining,
    // After the current sensor, each spare adds another full validity period.
    coverageEnd: new Date(expiresAt.getTime() + spareMs),
    spares: sensor.stock,
  };
}

/** Convenience: resolve a placed-at instant from local date + time inputs. */
export function sensorPlacedInstant(dateISO: string, timeHM: string): Date {
  return instantFromLocal(dateISO, timeHM);
}

// ---- Helpers for UI severity ---------------------------------------------

export type Severity = "ok" | "warn" | "critical";

export function stockSeverity(daysRemaining: number): Severity {
  if (daysRemaining <= 7) return "critical";
  if (daysRemaining <= 14) return "warn";
  return "ok";
}

export function sensorSeverity(status: SensorStatus): Severity {
  if (status.state === "expired") return "critical";
  if (status.state === "tolerance") return "critical";
  if (status.hoursRemaining !== null && status.hoursRemaining <= 24) return "warn";
  return "ok";
}

export type { Slot };
