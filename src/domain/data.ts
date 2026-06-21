// The whole "database" as a single JSON document. This is what gets stored in
// the repo (data.json) and read/written from the browser via the GitHub API.

import { Insulin, IntakeLogEntry, ItemKind, Medication, PharmacyVisit, Sensor } from "./types";

export interface IntakeRecord extends IntakeLogEntry {
  kind: ItemKind; // "medication" | "insulin"
  itemId: string;
}

export interface MedocsData {
  version: number;
  medications: Medication[];
  insulins: Insulin[];
  sensors: Sensor[];
  intake: IntakeRecord[];
  pharmacyVisits: PharmacyVisit[];
}

export const DATA_VERSION = 1;

export function emptyData(): MedocsData {
  return {
    version: DATA_VERSION,
    medications: [],
    insulins: [],
    sensors: [],
    intake: [],
    pharmacyVisits: [],
  };
}

/** Tolerantly coerce an unknown JSON blob into a valid MedocsData shape. */
export function normalizeData(input: unknown): MedocsData {
  const base = emptyData();
  if (!input || typeof input !== "object") return base;
  const o = input as Record<string, unknown>;
  return {
    version: typeof o.version === "number" ? o.version : DATA_VERSION,
    medications: Array.isArray(o.medications) ? (o.medications as Medication[]) : [],
    insulins: Array.isArray(o.insulins) ? (o.insulins as Insulin[]) : [],
    sensors: Array.isArray(o.sensors) ? (o.sensors as Sensor[]) : [],
    intake: Array.isArray(o.intake) ? (o.intake as IntakeRecord[]) : [],
    pharmacyVisits: Array.isArray(o.pharmacyVisits) ? (o.pharmacyVisits as PharmacyVisit[]) : [],
  };
}
