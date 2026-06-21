// Calendar-date and timezone helpers.
//
// Day-level logic (stock consumption) works on plain "YYYY-MM-DD" calendar
// strings using UTC anchoring so it is immune to the runtime timezone and DST.
// Wall-clock logic (the Dexcom sensor) uses real instants resolved in the
// configured timezone.

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** Timezone used to decide what "today" and "now" mean for the user. */
export const APP_TZ = process.env.APP_TZ || "Europe/Paris";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseUTC(dateISO: string): Date {
  if (!ISO_DATE.test(dateISO)) {
    throw new Error(`Invalid calendar date: ${dateISO}`);
  }
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Today's calendar date in the app timezone, as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date(), tz: string = APP_TZ): string {
  return formatInTimeZone(now, tz, "yyyy-MM-dd");
}

/** "HH:mm" right now in the app timezone (handy for default form values). */
export function nowTimeHM(now: Date = new Date(), tz: string = APP_TZ): string {
  return formatInTimeZone(now, tz, "HH:mm");
}

/** Add (or subtract) whole days to a calendar date. */
export function addDays(dateISO: string, n: number): string {
  const dt = parseUTC(dateISO);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** aISO - bISO, in whole days. */
export function diffDays(aISO: string, bISO: string): number {
  return Math.round((parseUTC(aISO).getTime() - parseUTC(bISO).getTime()) / 86_400_000);
}

/** Add calendar months, clamping to the last day of the target month. */
export function addMonths(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, d));
  if (dt.getUTCDate() !== d) dt.setUTCDate(0); // overflowed -> clamp to month end
  return dt.toISOString().slice(0, 10);
}

/** Iterate calendar days from startISO to endISO inclusive. */
export function eachDay(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  if (diffDays(endISO, startISO) < 0) return out;
  let cur = startISO;
  // guard against pathological ranges
  for (let i = 0; i <= 3650 && diffDays(endISO, cur) >= 0; i++) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Format "YYYY-MM-DD" as French "DD/MM/YYYY". */
export function formatFR(dateISO: string): string {
  const [y, m, d] = dateISO.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Resolve a wall-clock date + time entered in the app timezone into a real
 * instant (Date). Returns the UTC instant for that local time.
 */
export function instantFromLocal(dateISO: string, timeHM: string, tz: string = APP_TZ): Date {
  return fromZonedTime(`${dateISO}T${timeHM}:00`, tz);
}

/** Format an instant in the app timezone, e.g. "30/06/2026 à 22:00". */
export function formatInstantFR(instant: Date, tz: string = APP_TZ): string {
  return formatInTimeZone(instant, tz, "dd/MM/yyyy 'à' HH:mm");
}
