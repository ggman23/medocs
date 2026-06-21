// DTOs returned by the API and consumed by the UI. Kept free of server-only
// imports so client components can use these types directly.

import { DoseSchedule, InsulinType, IntakeLogEntry, PharmacyVisit } from "./types";

export type Severity = "ok" | "warn" | "critical";
export type SensorState = "none" | "active" | "tolerance" | "expired";

export interface TodaySlot {
  scheduled: number;
  logged: number | null; // null = not recorded yet (defaults to scheduled once the day passes)
}

export interface TodayDoses {
  date: string;
  morning: TodaySlot;
  noon: TodaySlot;
  evening: TodaySlot;
}

export interface ProjectionDTO {
  dailyDose: number;
  stockStartOfToday: number;
  currentStock: number;
  daysRemaining: number;
  runOutDate: string | null;
  runOutDateFR: string | null;
  depleted: boolean;
  severity: Severity;
}

export interface MedicationDTO {
  id: string;
  name: string;
  unit: string;
  stock: number;
  stockDate: string;
  notes?: string;
  dose: DoseSchedule;
  projection: ProjectionDTO;
  today: TodayDoses;
  logs: IntakeLogEntry[];
}

export interface InsulinDTO {
  id: string;
  name: string;
  type: InsulinType;
  unitsPerMl: number;
  mlPerCartridge: number;
  cartridgesPerBox: number;
  stockCartridges: number;
  stockDate: string;
  notes?: string;
  dose: DoseSchedule;
  unitsPerCartridge: number;
  currentCartridges: number;
  projection: ProjectionDTO;
  today: TodayDoses;
  logs: IntakeLogEntry[];
}

export interface SensorDTO {
  id: string;
  name: string;
  validityDays: number;
  toleranceHours: number;
  placedAt: string | null;
  stock: number;
  stockDate: string;
  notes?: string;
  status: {
    state: SensorState;
    placedAtFR: string | null;
    expiresAtFR: string | null;
    toleranceUntilFR: string | null;
    hoursRemaining: number | null;
    severity: Severity;
  };
}

export interface PharmacyDTO {
  visits: PharmacyVisit[];
  lastVisit: string | null;
  lastVisitFR: string | null;
  nextAllowed: string | null;
  nextAllowedFR: string | null;
  canGoToday: boolean;
}

export interface StateDTO {
  today: string;
  todayFR: string;
  tz: string;
  medications: MedicationDTO[];
  insulins: InsulinDTO[];
  sensors: SensorDTO[];
  pharmacy: PharmacyDTO;
}
