// Assembles the full dashboard payload: every item enriched with its stock
// projection, today's recorded doses, and pharmacy timing.

import "server-only";
import {
  projectInsulin,
  projectMedication,
  sensorSeverity,
  sensorStatus,
  stockSeverity,
} from "@/domain/calc";
import {
  InsulinDTO,
  MedicationDTO,
  PharmacyDTO,
  ProjectionDTO,
  SensorDTO,
  StateDTO,
  TodayDoses,
} from "@/domain/api";
import { addMonths, APP_TZ, diffDays, formatFR, formatInstantFR, todayISO } from "@/domain/dates";
import { DoseSchedule, IntakeLogEntry, Slot } from "@/domain/types";
import * as repo from "@/db/repo";

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

export function buildState(now: Date = new Date()): StateDTO {
  const today = todayISO(now);

  const medications: MedicationDTO[] = repo.listMedications().map((med) => {
    const logs = repo.listIntakeSince("medication", med.id, med.stockDate);
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

  const insulins: InsulinDTO[] = repo.listInsulins().map((ins) => {
    const logs = repo.listIntakeSince("insulin", ins.id, ins.stockDate);
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

  const sensors: SensorDTO[] = repo.listSensors().map((sensor) => {
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

  const pharmacy = buildPharmacy(today);

  return {
    today,
    todayFR: formatFR(today),
    tz: APP_TZ,
    medications,
    insulins,
    sensors,
    pharmacy,
  };
}

function buildPharmacy(today: string): PharmacyDTO {
  const visits = repo.listPharmacyVisits();
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
