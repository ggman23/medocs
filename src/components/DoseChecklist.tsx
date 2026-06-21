"use client";

import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import type { TodayDoses } from "@/domain/api";
import type { Slot } from "@/domain/types";
import { SLOT_LABELS_FR } from "@/domain/types";
import { useMedocs } from "@/state/MedocsProvider";
import { cx, NumberInput } from "./ui";
import { fmtNum } from "@/lib/format";

const ORDER: Slot[] = ["morning", "noon", "evening"];

export function DoseChecklist({
  kind,
  itemId,
  today,
  unit,
  editableAmount = false,
}: {
  kind: "medication" | "insulin";
  itemId: string;
  today: TodayDoses;
  unit: string;
  editableAmount?: boolean;
}) {
  const { actions } = useMedocs();
  const slots = ORDER.filter(
    (s) => today[s].scheduled > 0 || today[s].logged !== null,
  );

  if (slots.length === 0) {
    return <p className="text-sm text-slate-400">Aucune prise programmée aujourd&apos;hui.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {slots.map((slot) => (
        <SlotRow
          key={slot}
          slot={slot}
          scheduled={today[slot].scheduled}
          logged={today[slot].logged}
          unit={unit}
          editableAmount={editableAmount}
          onTaken={(amount) => actions.setIntake(kind, itemId, today.date, slot, amount)}
          onSkipped={() => actions.setIntake(kind, itemId, today.date, slot, 0)}
          onReset={() => actions.setIntake(kind, itemId, today.date, slot, null)}
        />
      ))}
    </div>
  );
}

function SlotRow({
  slot,
  scheduled,
  logged,
  unit,
  editableAmount,
  onTaken,
  onSkipped,
  onReset,
}: {
  slot: Slot;
  scheduled: number;
  logged: number | null;
  unit: string;
  editableAmount: boolean;
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
