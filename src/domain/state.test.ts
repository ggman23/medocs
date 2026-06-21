import { describe, expect, it } from "vitest";
import { emptyData, normalizeData } from "./data";
import * as m from "./mutations";
import { computeState } from "./state";
import { instantFromLocal } from "./dates";

describe("computeState (client-side, from JSON) matches the documented scenarios", () => {
  it("Metformine: 90 cp, 1 matin + 1 soir -> 45 j, 04/08/2026", () => {
    let data = emptyData();
    data = m.addMedication(data, {
      name: "Metformine 1000 mg",
      stock: 90,
      stockDate: "2026-06-21",
      dose: { morning: 1, noon: 0, evening: 1 },
    });
    const s = computeState(data, instantFromLocal("2026-06-21", "09:00"));
    const med = s.medications[0];
    expect(med.projection.daysRemaining).toBe(45);
    expect(med.projection.runOutDateFR).toBe("04/08/2026");
  });

  it("oubli du matin -> 89 le lendemain, fin toujours au 04/08", () => {
    let data = emptyData();
    data = m.addMedication(data, {
      name: "Metformine",
      stock: 90,
      stockDate: "2026-06-21",
      dose: { morning: 1, noon: 0, evening: 1 },
    });
    const id = data.medications[0].id;
    data = m.setIntake(data, "medication", id, "2026-06-21", "morning", 0);
    const s = computeState(data, instantFromLocal("2026-06-22", "09:00"));
    expect(s.medications[0].projection.stockStartOfToday).toBe(89);
    expect(s.medications[0].projection.runOutDateFR).toBe("04/08/2026");
  });

  it("insuline rapide: 5 cartouches, 11/12/14 -> 40 jours", () => {
    let data = emptyData();
    data = m.addInsulin(data, {
      name: "Insuline rapide",
      type: "rapid",
      stockCartridges: 5,
      stockDate: "2026-06-21",
      dose: { morning: 11, noon: 12, evening: 14 },
    });
    const s = computeState(data, instantFromLocal("2026-06-21", "09:00"));
    expect(s.insulins[0].projection.daysRemaining).toBe(40);
    expect(s.insulins[0].unitsPerCartridge).toBe(300);
  });

  it("capteur posé -> stock décrémenté + expiration calculée", () => {
    let data = emptyData();
    data = m.addSensor(data, { name: "Dexcom One+", stock: 2, stockDate: "2026-06-21" });
    const id = data.sensors[0].id;
    data = m.placeSensor(data, id, instantFromLocal("2026-06-21", "10:00").toISOString());
    const s = computeState(data, instantFromLocal("2026-06-21", "11:00"));
    expect(s.sensors[0].stock).toBe(1);
    expect(s.sensors[0].status.state).toBe("active");
    expect(s.sensors[0].status.expiresAtFR).toBe("01/07/2026 à 10:00");
  });

  it("normalizeData tolère un JSON vide ou partiel", () => {
    expect(normalizeData(null).medications).toEqual([]);
    expect(normalizeData({ medications: [{ id: "x" }] }).insulins).toEqual([]);
  });
});
