"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import type { DoseSchedule, IntakeLogEntry, Slot } from "@/domain/types";
import { SLOT_LABELS_FR } from "@/domain/types";
import { buildDayDoses } from "@/domain/state";
import { addDays, diffDays } from "@/domain/dates";
import { useMedocs } from "@/state/MedocsProvider";
import { cx, NumberInput } from "./ui";
import { fmtNum, prettyDateFR } from "@/lib/format";

const ORDER: Slot[] = ["morning", "noon", "evening"];

/**
 * Records actual doses per slot. A day navigator lets you go back to previous
 * days (down to the stock date) to catch up missed entries; unchanged past days
 * keep the planned dose.
 */
export function DoseChecklist({
  kind,
  itemId,
  dose,
  logs,
  stockDate,
  todayISO,
  unit,
  editableAmount = false,
}: {
  kind: "medication" | "insulin";
  itemId: string;
  dose: DoseSchedule;
  logs: IntakeLogEntry[];
  stockDate: string;
  todayISO: string;
  unit: string;
  editableAmount?: boolean;
}) {
  const { actions } = useMedocs();
  const [selected, setSelected] = useState(todayISO);

  const isToday = selected === todayISO;
  const isPast = diffDays(todayISO, selected) > 0;
  const day = buildDayDoses(dose, logs, selected);
  const slots = ORDER.filter((s) => day[s].scheduled > 0 || day[s].logged !== null);

  const canPrev = diffDays(selected, stockDate) > 0;
  const canNext = !isToday;

  const navBtn = "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {isToday ? "Aujourd'hui" : prettyDateFR(selected)}
        </p>
        <div className="flex items-center gap-0.5">
          <button
            className={navBtn}
            disabled={!canPrev}
            onClick={() => setSelected(addDays(selected, -1))}
            aria-label="Jour précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {!isToday && (
            <button
              onClick={() => setSelected(todayISO)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 cursor-pointer"
            >
              Aujourd&apos;hui
            </button>
          )}
          <button
            className={navBtn}
            disabled={!canNext}
            onClick={() => setSelected(addDays(selected, 1))}
            aria-label="Jour suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune prise programmée ce jour-là.</p>
      ) : (
        slots.map((slot) => (
          <SlotRow
            key={slot}
            slot={slot}
            scheduled={day[slot].scheduled}
            logged={day[slot].logged}
            unit={unit}
            editableAmount={editableAmount}
            isPast={isPast}
            onTaken={(amount) => actions.setIntake(kind, itemId, selected, slot, amount)}
            onSkipped={() => actions.setIntake(kind, itemId, selected, slot, 0)}
            onReset={() => actions.setIntake(kind, itemId, selected, slot, null)}
          />
        ))
      )}
    </div>
  );
}

function SlotRow({
  slot,
  scheduled,
  logged,
  unit,
  editableAmount,
  isPast,
  onTaken,
  onSkipped,
  onReset,
}: {
  slot: Slot;
  scheduled: number;
  logged: number | null;
  unit: string;
  editableAmount: boolean;
  isPast: boolean;
  onTaken: (amount: number) => void;
  onSkipped: () => void;
  onReset: () => void;
}) {
  const taken = logged !== null && logged > 0;
  const skipped = logged === 0;
  const [draft, setDraft] = useState<string>("");
  const amountShown = taken ? logged! : scheduled;

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50/80 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{SLOT_LABELS_FR[slot]}</p>
        <p className="text-xs text-slate-400">
          Prévu&nbsp;: {fmtNum(scheduled)} {unit}
          {isPast && logged === null && (
            <span className="text-emerald-500"> · pris par défaut</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {taken && editableAmount && (
          <NumberInput
            value={draft === "" ? String(amountShown) : draft}
            min={0}
            step={1}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              const v = parseFloat(draft);
              if (draft !== "" && Number.isFinite(v) && v >= 0) onTaken(v);
              setDraft("");
            }}
            className="w-16 px-2 py-1 text-center"
            aria-label={`Dose ${SLOT_LABELS_FR[slot]}`}
          />
        )}

        <button
          onClick={() => onTaken(scheduled)}
          aria-pressed={taken}
          className={cx(
            "inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-semibold transition-colors cursor-pointer",
            taken
              ? "bg-emerald-500 text-white"
              : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-emerald-50",
          )}
        >
          <Check className="h-4 w-4" /> Pris
        </button>

        <button
          onClick={onSkipped}
          aria-pressed={skipped}
          className={cx(
            "inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-semibold transition-colors cursor-pointer",
            skipped
              ? "bg-slate-400 text-white"
              : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100",
          )}
        >
          <X className="h-4 w-4" /> Oublié
        </button>

        {logged !== null && (
          <button
            onClick={onReset}
            aria-label="Réinitialiser"
            title="Réinitialiser"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
