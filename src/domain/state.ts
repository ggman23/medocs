// Build the dashboard view-model from a MedocsData document. Pure and
// client-safe: this runs in the browser (no server, no database).

import {
  projectInsulin,
  projectMedication,
  sensorSeverity,
  sensorStatus,
  stockSeverity,
} from "./calc";
import {
  InsulinDTO,
  MedicationDTO,
  PharmacyDTO,
  ProjectionDTO,
  SensorDTO,
  StateDTO,
  TodayDoses,
} from "./api";
import { addMonths, APP_TZ, diffDays, formatFR, formatInstantFR, todayISO } from "./dates";
import { DoseSchedule, IntakeLogEntry, Slot } from "./types";
import { MedocsData } from "./data";

function logsFor(
  data: MedocsData,
  kind: "medication" | "insulin",
  itemId: string,
  fromDate: string,
): IntakeLogEntry[] {
  return data.intake
    .filter((r) => r.kind === kind && r.itemId === itemId && r.date >= fromDate)
    .map((r) => ({ date: r.date, slot: r.slot, amount: r.amount }));
}

function todayDoses(dose: DoseSchedule, logs: IntakeLogEntry[], today: string): TodayDoses {
  const find = (slot: Slot) => logs.find((l) => l.date === today && l.slot === slot);
  const slot = (s: Slot) => ({ scheduled: dose[s], logged: find(s)?.amount ?? null });
  return { date: today, morning: slot("morning"), noon: slot("noon"), evening: slot("evening") };
}

function projectionDTO(p: {
  dailyDose: number;
  stockStartOfToday: number;
  currentStock: number;
  daysRemaining: number;
  runOutDate: string | null;
  depleted: boolean;
}): ProjectionDTO {
  return {
    ...p,
    runOutDateFR: p.runOutDate ? formatFR(p.runOutDate) : null,
    severity: stockSeverity(p.daysRemaining),
  };
}

export function computeState(data: MedocsData, now: Date = new Date()): StateDTO {
  const today = todayISO(now);

  const medications: MedicationDTO[] = [...data.medications]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((med) => {
      const logs = logsFor(data, "medication", med.id, med.stockDate);
      const proj = projectMedication(med, logs, today);
      return {
        id: med.id,
        name: med.name,
        unit: med.unit,
        stock: med.stock,
        stockDate: med.stockDate,
        notes: med.notes,
        dose: med.dose,
        projection: projectionDTO(proj),
        today: todayDoses(med.dose, logs, today),
      };
    });

  const insulins: InsulinDTO[] = [...data.insulins]
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "rapid" ? -1 : 1))
    .map((ins) => {
      const logs = logsFor(data, "insulin", ins.id, ins.stockDate);
      const proj = projectInsulin(ins, logs, today);
      return {
        id: ins.id,
        name: ins.name,
        type: ins.type,
        unitsPerMl: ins.unitsPerMl,
        mlPerCartridge: ins.mlPerCartridge,
        cartridgesPerBox: ins.cartridgesPerBox,
        stockCartridges: ins.stockCartridges,
        stockDate: ins.stockDate,
        notes: ins.notes,
        dose: ins.dose,
        unitsPerCartridge: proj.unitsPerCartridge,
        currentCartridges: proj.currentCartridges,
        projection: projectionDTO(proj),
        today: todayDoses(ins.dose, logs, today),
      };
    });

  const sensors: SensorDTO[] = data.sensors.map((sensor) => {
    const st = sensorStatus(sensor, now);
    return {
      id: sensor.id,
      name: sensor.name,
      validityDays: sensor.validityDays,
      toleranceHours: sensor.toleranceHours,
      placedAt: sensor.placedAt,
      stock: sensor.stock,
      stockDate: sensor.stockDate,
      notes: sensor.notes,
      status: {
        state: st.state,
        placedAtFR: st.placedAt ? formatInstantFR(st.placedAt) : null,
        expiresAtFR: st.expiresAt ? formatInstantFR(st.expiresAt) : null,
        toleranceUntilFR: st.toleranceUntil ? formatInstantFR(st.toleranceUntil) : null,
        hoursRemaining: st.hoursRemaining,
        severity: sensorSeverity(st),
      },
    };
  });

  return {
    today,
    todayFR: formatFR(today),
    tz: APP_TZ,
    medications,
    insulins,
    sensors,
    pharmacy: buildPharmacy(data, today),
  };
}

function buildPharmacy(data: MedocsData, today: string): PharmacyDTO {
  const visits = [...data.pharmacyVisits].sort((a, b) => b.date.localeCompare(a.date));
  const lastVisit = visits[0]?.date ?? null;
  const nextAllowed = lastVisit ? addMonths(lastVisit, 1) : null;
  const canGoToday = !nextAllowed || diffDays(today, nextAllowed) >= 0;
  return {
    visits,
    lastVisit,
    lastVisitFR: lastVisit ? formatFR(lastVisit) : null,
    nextAllowed,
    nextAllowedFR: nextAllowed ? formatFR(nextAllowed) : null,
    canGoToday,
  };
}
