// Zod schemas for API input validation.

import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ");
const hm = z.string().regex(/^\d{2}:\d{2}$/, "Heure attendue au format HH:MM");

const dose = z.object({
  morning: z.number().min(0),
  noon: z.number().min(0),
  evening: z.number().min(0),
});

export const medicationCreate = z.object({
  name: z.string().trim().min(1),
  unit: z.string().trim().min(1).optional(),
  stock: z.number().min(0),
  stockDate: isoDate,
  dose,
  notes: z.string().optional(),
});
export const medicationUpdate = medicationCreate.partial();

export const insulinCreate = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["rapid", "slow"]),
  unitsPerMl: z.number().positive().optional(),
  mlPerCartridge: z.number().positive().optional(),
  cartridgesPerBox: z.number().positive().optional(),
  stockCartridges: z.number().min(0),
  stockDate: isoDate,
  dose,
  notes: z.string().optional(),
});
export const insulinUpdate = insulinCreate.partial();

const sensorBase = z.object({
  name: z.string().trim().min(1).optional(),
  validityDays: z.number().positive().optional(),
  toleranceHours: z.number().min(0).optional(),
  stock: z.number().int().min(0),
  stockDate: isoDate,
  notes: z.string().optional(),
  // Optional wall-clock placement, converted to an instant server-side.
  placedDate: isoDate.optional(),
  placedTime: hm.optional(),
});
export const sensorCreate = sensorBase;
export const sensorUpdate = sensorBase.partial();

export const sensorPlace = z.object({
  date: isoDate,
  time: hm,
});

export const intakeUpsert = z.object({
  kind: z.enum(["medication", "insulin"]),
  itemId: z.string().min(1),
  date: isoDate,
  slot: z.enum(["morning", "noon", "evening"]),
  amount: z.number().min(0).nullable(), // null = clear the override
});

export const pharmacyCreate = z.object({
  date: isoDate,
  note: z.string().optional(),
});

export const loginBody = z.object({
  password: z.string().min(1),
});
