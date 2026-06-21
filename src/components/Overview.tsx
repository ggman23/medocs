"use client";

import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Droplet,
  Pill,
} from "lucide-react";
import type { InsulinDTO, MedicationDTO, Severity, StateDTO } from "@/domain/api";
import { Badge, SEVERITY_TEXT, cx } from "./ui";
import { daysLabel } from "@/lib/format";

interface Entry {
  id: string;
  name: string;
  kind: "medication" | "insulin";
  daysRemaining: number;
  runOutDate: string | null;
  runOutDateFR: string | null;
  severity: Severity;
  depleted: boolean;
}

function toEntry(item: MedicationDTO | InsulinDTO, kind: Entry["kind"]): Entry {
  const p = item.projection;
  return {
    id: item.id,
    name: item.name,
    kind,
    daysRemaining: p.daysRemaining,
    runOutDate: p.runOutDate,
    runOutDateFR: p.runOutDateFR,
    severity: p.severity,
    depleted: p.depleted,
  };
}

export function Overview({ state }: { state: StateDTO }) {
  const entries: Entry[] = [
    ...state.medications.map((m) => toEntry(m, "medication")),
    ...state.insulins.map((i) => toEntry(i, "insulin")),
  ]
    .filter((e) => Number.isFinite(e.daysRemaining))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  if (entries.length === 0) return null;

  const critical = entries.filter((e) => e.daysRemaining <= 7);
  const soonest = entries[0];

  return (
    <section className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2.5">
        <span className="text-slate-400">
          <CalendarClock className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-bold text-slate-800">Aperçu</h2>
      </div>

      {critical.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div className="text-sm text-rose-700">
            <p className="font-semibold">Passez à la pharmacie : stock bientôt épuisé</p>
            <p className="mt-0.5">
              {critical.map((e, i) => (
                <span key={e.id}>
                  {i > 0 && ", "}
                  <span className="font-semibold">{e.name}</span>{" "}
                  ({e.depleted ? "épuisé" : daysLabel(e.daysRemaining)})
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* Pharmacy "renew by" line */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className={cx("h-4 w-4", SEVERITY_TEXT[soonest.severity])} />
          <span className="text-slate-500">À renouveler avant le</span>
          <span className={cx("font-bold", SEVERITY_TEXT[soonest.severity])}>
            {soonest.runOutDateFR}
          </span>
          <span className="text-slate-400">· {soonest.name}</span>
        </div>
        {state.pharmacy.lastVisit && (
          <span className="text-xs text-slate-400">
            Prochain passage autorisé : {state.pharmacy.nextAllowedFR}
          </span>
        )}
      </div>

      {/* Per-item recap */}
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {entries.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
          >
            <span className="flex min-w-0 items-center gap-2">
              {e.kind === "medication" ? (
                <Pill className="h-4 w-4 shrink-0 text-brand-600" />
              ) : (
                <Droplet className="h-4 w-4 shrink-0 text-sky-600" />
              )}
              <span className="truncate text-sm font-medium text-slate-700">{e.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="hidden text-xs text-slate-400 sm:inline">
                {e.depleted ? "épuisé" : e.runOutDateFR}
              </span>
              <Badge severity={e.severity}>
                {e.depleted ? "0 j" : daysLabel(e.daysRemaining)}
              </Badge>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
