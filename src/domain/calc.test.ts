import { describe, expect, it } from "vitest";
import {
  dailyDose,
  projectStock,
  projectInsulin,
  sensorStatus,
} from "./calc";
import { addDays, addMonths, diffDays, formatFR, instantFromLocal, formatInstantFR } from "./dates";
import { DoseSchedule, IntakeLogEntry, Insulin, Sensor } from "./types";

const metformineSchedule: DoseSchedule = { morning: 1, noon: 0, evening: 1 };

describe("date helpers", () => {
  it("adds days across months", () => {
    expect(addDays("2026-06-21", 44)).toBe("2026-08-04");
    expect(addDays("2026-06-21", 45)).toBe("2026-08-05");
  });
  it("computes day differences", () => {
    expect(diffDays("2026-08-04", "2026-06-21")).toBe(44);
  });
  it("adds months with clamping", () => {
    expect(addMonths("2026-06-21", 1)).toBe("2026-07-21");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
  it("formats FR", () => {
    expect(formatFR("2026-08-04")).toBe("04/08/2026");
  });
});

describe("Metformine scenario (90 cp, 1 matin + 1 soir, depuis le 21/06/2026)", () => {
  const base = {
    stock: 90,
    stockDate: "2026-06-21",
    schedule: metformineSchedule,
    logs: [] as IntakeLogEntry[],
  };

  it("dose journalière = 2", () => {
    expect(dailyDose(metformineSchedule)).toBe(2);
  });

  it("le jour de l'initialisation: stock 90, fin de stock le 04/08/2026", () => {
    const p = projectStock(base, "2026-06-21");
    expect(p.stockStartOfToday).toBe(90);
    expect(p.daysRemaining).toBe(45);
    expect(p.runOutDate).toBe("2026-08-04");
  });

  it("le lendemain (sans rien saisir) le stock est passé à 88", () => {
    const p = projectStock(base, "2026-06-22");
    expect(p.stockStartOfToday).toBe(88);
    expect(p.runOutDate).toBe("2026-08-04");
  });

  it("matin oublié mais pris le soir le 21 -> demain stock 89, fin toujours 04/08", () => {
    const logs: IntakeLogEntry[] = [
      { date: "2026-06-21", slot: "morning", amount: 0 },
      { date: "2026-06-21", slot: "evening", amount: 1 },
    ];
    const p = projectStock({ ...base, logs }, "2026-06-22");
    expect(p.stockStartOfToday).toBe(89);
    expect(p.runOutDate).toBe("2026-08-04");
  });

  it("puis soir oublié le 22 -> stock 88 le 23, fin repoussée au 05/08", () => {
    const logs: IntakeLogEntry[] = [
      { date: "2026-06-21", slot: "morning", amount: 0 },
      { date: "2026-06-22", slot: "evening", amount: 0 },
    ];
    const p = projectStock({ ...base, logs }, "2026-06-23");
    expect(p.stockStartOfToday).toBe(88);
    expect(p.runOutDate).toBe("2026-08-05");
  });

  it("ordonnance passée à 3/jour (matin, midi, soir) raccourcit l'autonomie", () => {
    const p = projectStock(
      { ...base, schedule: { morning: 1, noon: 1, evening: 1 } },
      "2026-06-21",
    );
    expect(p.dailyDose).toBe(3);
    expect(p.daysRemaining).toBe(30); // floor(90/3)
  });
});

describe("Insuline rapide (1 boîte de 5 cartouches, 11/12/14 unités)", () => {
  const insulin: Insulin = {
    id: "i1",
    name: "Insuline rapide",
    type: "rapid",
    unitsPerMl: 100,
    mlPerCartridge: 3,
    cartridgesPerBox: 5,
    stockCartridges: 5,
    stockDate: "2026-06-21",
    dose: { morning: 11, noon: 12, evening: 14 },
    createdAt: "",
    updatedAt: "",
  };

  it("300 unités par cartouche, 1500 unités au total, 37 unités/jour", () => {
    const v = projectInsulin(insulin, [], "2026-06-21");
    expect(v.unitsPerCartridge).toBe(300);
    expect(v.dailyDose).toBe(37);
    expect(v.stockStartOfToday).toBe(1500);
  });

  it("autonomie de 40 jours (floor(1500/37))", () => {
    const v = projectInsulin(insulin, [], "2026-06-21");
    expect(v.daysRemaining).toBe(40);
  });

  it("une dose plus forte réduit le stock du lendemain", () => {
    const logs: IntakeLogEntry[] = [{ date: "2026-06-21", slot: "morning", amount: 14 }];
    const v = projectInsulin(insulin, logs, "2026-06-22");
    // jour passé: 14 (matin saisi) + 12 (midi prévu) + 14 (soir prévu) = 40
    expect(v.stockStartOfToday).toBe(1500 - 40);
  });
});

describe("Insuline lente (1 seule injection le soir)", () => {
  const slow: Insulin = {
    id: "i2",
    name: "Insuline lente",
    type: "slow",
    unitsPerMl: 100,
    mlPerCartridge: 3,
    cartridgesPerBox: 5,
    stockCartridges: 4,
    stockDate: "2026-06-21",
    dose: { morning: 0, noon: 0, evening: 20 },
    createdAt: "",
    updatedAt: "",
  };
  it("autonomie = floor(1200 / 20) = 60 jours", () => {
    const v = projectInsulin(slow, [], "2026-06-21");
    expect(v.stockStartOfToday).toBe(1200);
    expect(v.daysRemaining).toBe(60);
  });
});

describe("Capteur Dexcom One+ (posé le 21/06/2026 à 10:00)", () => {
  const sensor: Sensor = {
    id: "s1",
    name: "Dexcom One+",
    validityDays: 10,
    toleranceHours: 12,
    placedAt: instantFromLocal("2026-06-21", "10:00").toISOString(),
    stock: 2,
    stockDate: "2026-06-21",
    createdAt: "",
    updatedAt: "",
  };

  it("expire exactement 10 jours après la pose, tolérance +12h", () => {
    const st = sensorStatus(sensor, instantFromLocal("2026-06-21", "11:00"));
    expect(formatInstantFR(st.expiresAt!)).toBe("01/07/2026 à 10:00");
    expect(formatInstantFR(st.toleranceUntil!)).toBe("01/07/2026 à 22:00");
    expect(st.state).toBe("active");
    expect(st.spares).toBe(2);
  });

  it("passe en tolérance puis expiré", () => {
    expect(sensorStatus(sensor, instantFromLocal("2026-07-01", "15:00")).state).toBe(
      "tolerance",
    );
    expect(sensorStatus(sensor, instantFromLocal("2026-07-01", "23:00")).state).toBe(
      "expired",
    );
  });
});
