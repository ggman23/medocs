"use client";

import { useState } from "react";
import type { InsulinDTO, MedicationDTO, SensorDTO } from "@/domain/api";
import { useMedocs } from "@/state/MedocsProvider";
import { Button, Field, NumberInput, Select, TextInput, Textarea } from "./ui";
import { fmtNum } from "@/lib/format";

const num = (s: string, fallback = 0): number => {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : fallback;
};

function browserTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function FormShell({
  children,
  onSubmit,
  submitLabel,
  onCancel,
  error,
  busy,
}: {
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel: string;
  onCancel: () => void;
  error: string | null;
  busy: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      {children}
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
      )}
      <div className="mt-1 flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "Enregistrement…" : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function useSubmit(fn: () => Promise<void>, onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

function DoseInputs({
  values,
  onChange,
  unit,
  only,
}: {
  values: { morning: string; noon: string; evening: string };
  onChange: (v: { morning: string; noon: string; evening: string }) => void;
  unit: string;
  only?: Array<"morning" | "noon" | "evening">;
}) {
  const slots: Array<["morning" | "noon" | "evening", string]> = [
    ["morning", "Matin"],
    ["noon", "Midi"],
    ["evening", "Soir"],
  ];
  const visible = only ? slots.filter(([k]) => only.includes(k)) : slots;
  return (
    <div className="grid grid-cols-3 gap-2">
      {visible.map(([key, label]) => (
        <Field key={key} label={label}>
          <NumberInput
            min={0}
            step="any"
            value={values[key]}
            onChange={(e) => onChange({ ...values, [key]: e.target.value })}
            className="text-center"
          />
        </Field>
      ))}
      {visible.length < 3 && (
        <p className="col-span-3 -mt-2 text-xs text-slate-400">Dose en {unit}.</p>
      )}
    </div>
  );
}

// ---- Medication ----------------------------------------------------------

export function MedicationForm({
  initial,
  onDone,
}: {
  initial?: MedicationDTO;
  onDone: () => void;
}) {
  const { state, actions } = useMedocs();
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "comprimé");
  const [stock, setStock] = useState(String(initial?.stock ?? ""));
  const [stockDate, setStockDate] = useState(initial?.stockDate ?? state?.today ?? "");
  const [dose, setDose] = useState({
    morning: String(initial?.dose.morning ?? "0"),
    noon: String(initial?.dose.noon ?? "0"),
    evening: String(initial?.dose.evening ?? "0"),
  });

  const { busy, error, submit } = useSubmit(async () => {
    const payload = {
      name,
      unit,
      stock: num(stock),
      stockDate,
      dose: { morning: num(dose.morning), noon: num(dose.noon), evening: num(dose.evening) },
    };
    if (initial) await actions.updateMedication(initial.id, payload);
    else await actions.addMedication(payload);
  }, onDone);

  return (
    <FormShell
      onSubmit={submit}
      submitLabel={initial ? "Enregistrer" : "Ajouter le médicament"}
      onCancel={onDone}
      error={error}
      busy={busy}
    >
      <Field label="Nom du médicament">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Metformine 1000 mg"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stock actuel">
          <NumberInput value={stock} min={0} step="any" onChange={(e) => setStock(e.target.value)} required />
        </Field>
        <Field label="Unité">
          <TextInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="comprimé" />
        </Field>
      </div>
      <Field label="Date du stock" hint="Le décompte démarre à partir de cette date.">
        <TextInput type="date" value={stockDate} onChange={(e) => setStockDate(e.target.value)} required />
      </Field>
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Posologie (comprimés par prise)</p>
        <DoseInputs values={dose} onChange={setDose} unit={unit} />
      </div>
    </FormShell>
  );
}

// ---- Insulin -------------------------------------------------------------

export function InsulinForm({ initial, onDone }: { initial?: InsulinDTO; onDone: () => void }) {
  const { state, actions } = useMedocs();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<"rapid" | "slow">(initial?.type ?? "rapid");
  const [unitsPerMl, setUnitsPerMl] = useState(String(initial?.unitsPerMl ?? 100));
  const [mlPerCartridge, setMlPerCartridge] = useState(String(initial?.mlPerCartridge ?? 3));
  const [cartridgesPerBox, setCartridgesPerBox] = useState(String(initial?.cartridgesPerBox ?? 5));
  const [stock, setStock] = useState(String(initial?.stockCartridges ?? ""));
  const [stockDate, setStockDate] = useState(initial?.stockDate ?? state?.today ?? "");
  const [dose, setDose] = useState({
    morning: String(initial?.dose.morning ?? "0"),
    noon: String(initial?.dose.noon ?? "0"),
    evening: String(initial?.dose.evening ?? "0"),
  });

  const upc = num(unitsPerMl) * num(mlPerCartridge);
  const totalUnits = num(stock) * upc;
  const daily =
    type === "slow" ? num(dose.evening) : num(dose.morning) + num(dose.noon) + num(dose.evening);
  const autonomy = daily > 0 ? Math.floor(totalUnits / daily) : null;

  const { busy, error, submit } = useSubmit(async () => {
    const payload = {
      name,
      type,
      unitsPerMl: num(unitsPerMl, 100),
      mlPerCartridge: num(mlPerCartridge, 3),
      cartridgesPerBox: num(cartridgesPerBox, 5),
      stockCartridges: num(stock),
      stockDate,
      dose:
        type === "slow"
          ? { morning: 0, noon: 0, evening: num(dose.evening) }
          : { morning: num(dose.morning), noon: num(dose.noon), evening: num(dose.evening) },
    };
    if (initial) await actions.updateInsulin(initial.id, payload);
    else await actions.addInsulin(payload);
  }, onDone);

  return (
    <FormShell
      onSubmit={submit}
      submitLabel={initial ? "Enregistrer" : "Ajouter l'insuline"}
      onCancel={onDone}
      error={error}
      busy={busy}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Insuline rapide" required />
        </Field>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as "rapid" | "slow")}>
            <option value="rapid">Rapide (matin, midi, soir)</option>
            <option value="slow">Lente (le soir)</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Unités / ml">
          <NumberInput value={unitsPerMl} min={1} step="any" onChange={(e) => setUnitsPerMl(e.target.value)} />
        </Field>
        <Field label="ml / cartouche">
          <NumberInput value={mlPerCartridge} min={0} step="any" onChange={(e) => setMlPerCartridge(e.target.value)} />
        </Field>
        <Field label="Cart. / boîte">
          <NumberInput value={cartridgesPerBox} min={0} step="any" onChange={(e) => setCartridgesPerBox(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Stock (cartouches)">
          <NumberInput value={stock} min={0} step="any" onChange={(e) => setStock(e.target.value)} required />
        </Field>
        <Field label="Date du stock">
          <TextInput type="date" value={stockDate} onChange={(e) => setStockDate(e.target.value)} required />
        </Field>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Protocole (unités par injection)</p>
        <DoseInputs
          values={dose}
          onChange={setDose}
          unit="unités"
          only={type === "slow" ? ["evening"] : undefined}
        />
      </div>

      <div className="rounded-xl bg-brand-50/70 px-3.5 py-3 text-sm text-brand-800">
        <div className="flex justify-between">
          <span>1 cartouche</span>
          <span className="font-semibold tabular-nums">{fmtNum(upc)} unités</span>
        </div>
        <div className="flex justify-between">
          <span>Stock total</span>
          <span className="font-semibold tabular-nums">{fmtNum(totalUnits)} unités</span>
        </div>
        {autonomy !== null && (
          <div className="flex justify-between">
            <span>Autonomie estimée</span>
            <span className="font-semibold tabular-nums">≈ {autonomy} jours</span>
          </div>
        )}
      </div>
    </FormShell>
  );
}

// ---- Sensor --------------------------------------------------------------

export function SensorForm({ initial, onDone }: { initial?: SensorDTO; onDone: () => void }) {
  const { state, actions } = useMedocs();
  const [name, setName] = useState(initial?.name ?? "Dexcom One+");
  const [validityDays, setValidityDays] = useState(String(initial?.validityDays ?? 10));
  const [toleranceHours, setToleranceHours] = useState(String(initial?.toleranceHours ?? 12));
  const [stock, setStock] = useState(String(initial?.stock ?? ""));
  const [stockDate, setStockDate] = useState(initial?.stockDate ?? state?.today ?? "");
  const [hasPlaced, setHasPlaced] = useState(false);
  const [placedDate, setPlacedDate] = useState(state?.today ?? "");
  const [placedTime, setPlacedTime] = useState(browserTime());

  const { busy, error, submit } = useSubmit(async () => {
    const payload: Record<string, unknown> = {
      name,
      validityDays: num(validityDays, 10),
      toleranceHours: num(toleranceHours, 12),
      stock: Math.round(num(stock)),
      stockDate,
    };
    if (hasPlaced) {
      payload.placedDate = placedDate;
      payload.placedTime = placedTime;
    }
    if (initial) await actions.updateSensor(initial.id, payload);
    else await actions.addSensor(payload);
  }, onDone);

  return (
    <FormShell
      onSubmit={submit}
      submitLabel={initial ? "Enregistrer" : "Ajouter le capteur"}
      onCancel={onDone}
      error={error}
      busy={busy}
    >
      <Field label="Nom du capteur">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Validité (jours)">
          <NumberInput value={validityDays} min={1} step="any" onChange={(e) => setValidityDays(e.target.value)} />
        </Field>
        <Field label="Tolérance (h)">
          <NumberInput value={toleranceHours} min={0} step="any" onChange={(e) => setToleranceHours(e.target.value)} />
        </Field>
        <Field label="Capteurs en stock">
          <NumberInput value={stock} min={0} step={1} onChange={(e) => setStock(e.target.value)} required />
        </Field>
      </div>
      <Field label="Date du stock">
        <TextInput type="date" value={stockDate} onChange={(e) => setStockDate(e.target.value)} required />
      </Field>

      {!initial && (
        <label className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3">
          <input
            type="checkbox"
            checked={hasPlaced}
            onChange={(e) => setHasPlaced(e.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          <span className="text-sm text-slate-700">Un capteur est déjà posé</span>
        </label>
      )}
      {hasPlaced && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de pose">
            <TextInput type="date" value={placedDate} onChange={(e) => setPlacedDate(e.target.value)} />
          </Field>
          <Field label="Heure de pose">
            <TextInput type="time" value={placedTime} onChange={(e) => setPlacedTime(e.target.value)} />
          </Field>
        </div>
      )}
    </FormShell>
  );
}

// ---- Place a new sensor (consumes a spare) -------------------------------

export function PlaceSensorForm({ sensor, onDone }: { sensor: SensorDTO; onDone: () => void }) {
  const { state, actions } = useMedocs();
  const [date, setDate] = useState(state?.today ?? "");
  const [time, setTime] = useState(browserTime());

  const { busy, error, submit } = useSubmit(
    () => actions.placeSensor(sensor.id, date, time),
    onDone,
  );

  return (
    <FormShell onSubmit={submit} submitLabel="Poser le capteur" onCancel={onDone} error={error} busy={busy}>
      <p className="text-sm text-slate-500">
        Enregistre la pose d&apos;un nouveau capteur (décompte des 10 jours + tolérance) et retire
        un capteur du stock.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date de pose">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Heure de pose">
          <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </Field>
      </div>
      {sensor.stock <= 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Aucun capteur en stock : le stock restera à 0.
        </p>
      )}
    </FormShell>
  );
}

// ---- Restock (set a new stock total as of a date) ------------------------

export function RestockForm({
  kind,
  id,
  current,
  unit,
  onDone,
}: {
  kind: "medication" | "insulin" | "sensor";
  id: string;
  current: number;
  unit: string;
  onDone: () => void;
}) {
  const { state, actions } = useMedocs();
  const [stock, setStock] = useState(String(current));
  const [date, setDate] = useState(state?.today ?? "");

  const { busy, error, submit } = useSubmit(async () => {
    const value = num(stock);
    if (kind === "medication") await actions.updateMedication(id, { stock: value, stockDate: date });
    else if (kind === "insulin")
      await actions.updateInsulin(id, { stockCartridges: value, stockDate: date });
    else await actions.updateSensor(id, { stock: Math.round(value), stockDate: date });
  }, onDone);

  return (
    <FormShell onSubmit={submit} submitLabel="Mettre à jour le stock" onCancel={onDone} error={error} busy={busy}>
      <p className="text-sm text-slate-500">
        Indiquez le nouveau stock total après votre passage en pharmacie.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Nouveau stock (${unit})`}>
          <NumberInput value={stock} min={0} step="any" onChange={(e) => setStock(e.target.value)} required autoFocus />
        </Field>
        <Field label="À partir du">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
      </div>
    </FormShell>
  );
}

// ---- Insulin stock / catch-up (what's really left now) -------------------

export function InsulinStockForm({ insulin, onDone }: { insulin: InsulinDTO; onDone: () => void }) {
  const { state, actions } = useMedocs();
  const upc = insulin.unitsPerCartridge;
  const startFull = Math.floor(insulin.currentCartridges);
  const startOpen = Math.max(0, Math.round((insulin.currentCartridges - startFull) * upc));
  const [full, setFull] = useState(String(startFull));
  const [open, setOpen] = useState(String(startOpen));
  const [date, setDate] = useState(state?.today ?? "");

  const totalUnits = num(full) * upc + num(open);
  const cartridges = upc > 0 ? totalUnits / upc : 0;

  const { busy, error, submit } = useSubmit(
    () => actions.updateInsulin(insulin.id, { stockCartridges: cartridges, stockDate: date }),
    onDone,
  );

  return (
    <FormShell
      onSubmit={submit}
      submitLabel="Mettre à jour le stock"
      onCancel={onDone}
      error={error}
      busy={busy}
    >
      <p className="text-sm text-slate-500">
        Indiquez ce qu&apos;il vous reste <strong>réellement aujourd&apos;hui</strong> (mise à jour
        ou rattrapage). L&apos;estimation de fin de stock repartira de cette valeur.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cartouches pleines">
          <NumberInput value={full} min={0} step={1} onChange={(e) => setFull(e.target.value)} autoFocus />
        </Field>
        <Field label="Unités dans la cartouche entamée" hint={`sur ${fmtNum(upc)}`}>
          <NumberInput value={open} min={0} step={1} onChange={(e) => setOpen(e.target.value)} />
        </Field>
      </div>
      <Field label="À partir du">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>
      <div className="flex justify-between rounded-xl bg-brand-50/70 px-3.5 py-3 text-sm text-brand-800">
        <span>Stock total</span>
        <span className="font-semibold tabular-nums">
          {fmtNum(totalUnits)} unités · {fmtNum(cartridges)} cartouches
        </span>
      </div>
    </FormShell>
  );
}

// ---- Pharmacy visit ------------------------------------------------------

export function PharmacyForm({ onDone }: { onDone: () => void }) {
  const { state, actions } = useMedocs();
  const [date, setDate] = useState(state?.today ?? "");
  const [note, setNote] = useState("");

  const { busy, error, submit } = useSubmit(
    () => actions.addPharmacy(date, note || undefined),
    onDone,
  );

  return (
    <FormShell onSubmit={submit} submitLabel="Enregistrer le passage" onCancel={onDone} error={error} busy={busy}>
      <Field label="Date du passage en pharmacie">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>
      <Field label="Note (facultatif)">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce que vous avez récupéré…" />
      </Field>
    </FormShell>
  );
}
