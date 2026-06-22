"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Check,
  Droplet,
  MapPin,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { InsulinDTO, MedicationDTO, PharmacyDTO, SensorDTO, Severity } from "@/domain/api";
import { useMedocs } from "@/state/MedocsProvider";
import { Badge, Button, IconButton, Modal, ProgressBar, SEVERITY_TEXT, cx } from "./ui";
import { DoseChecklist } from "./DoseChecklist";
import {
  InsulinForm,
  InsulinStockForm,
  MedicationForm,
  PharmacyForm,
  PlaceSensorForm,
  RestockForm,
  SensorForm,
} from "./forms";
import { autonomyPhrase, daysLabel, fmtNum } from "@/lib/format";

function CardHeader({
  icon,
  iconClass,
  title,
  subtitle,
  badge,
  onEdit,
  onDelete,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconClass)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-bold text-slate-900">{title}</h3>
          {badge}
        </div>
        {subtitle && <p className="truncate text-sm text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex shrink-0">
        <IconButton label="Modifier" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton label="Supprimer" onClick={onDelete} className="hover:text-rose-600">
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}

function RunOutLine({
  runOutDateFR,
  depleted,
  daysRemaining,
  severity,
}: {
  runOutDateFR: string | null;
  depleted: boolean;
  daysRemaining: number;
  severity: Severity;
}) {
  if (runOutDateFR === null) {
    return <p className="text-sm text-slate-400">Pas de consommation quotidienne définie.</p>;
  }
  return (
    <div className="flex items-center gap-2">
      <CalendarClock className={cx("h-4 w-4 shrink-0", SEVERITY_TEXT[severity])} />
      <p className="text-sm text-slate-600">
        {depleted ? (
          <>
            Stock épuisé depuis le{" "}
            <span className="font-semibold text-rose-600">{runOutDateFR}</span>
          </>
        ) : (
          <>
            Stock jusqu&apos;au <span className={cx("font-semibold", SEVERITY_TEXT[severity])}>{runOutDateFR}</span>{" "}
            <span className="text-slate-400">· {daysLabel(daysRemaining)}</span>
          </>
        )}
      </p>
    </div>
  );
}

// ---- Medication ----------------------------------------------------------

export function MedicationCard({ med }: { med: MedicationDTO }) {
  const { actions } = useMedocs();
  const [modal, setModal] = useState<null | "edit" | "restock">(null);
  const p = med.projection;
  const pct = med.stock > 0 ? (p.currentStock / med.stock) * 100 : 0;

  return (
    <article className="card animate-pop flex flex-col gap-4 p-5">
      <CardHeader
        icon={<Pill className="h-5 w-5 text-brand-700" />}
        iconClass="bg-brand-100"
        title={med.name}
        subtitle={`${fmtNum(p.dailyDose)} ${med.unit}/jour`}
        badge={<Badge severity={p.severity}>{daysLabel(p.daysRemaining)}</Badge>}
        onEdit={() => setModal("edit")}
        onDelete={() => confirm(`Supprimer « ${med.name} » ?`) && actions.deleteMedication(med.id)}
      />

      <div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-bold tabular-nums text-slate-900">
              {fmtNum(p.currentStock)}
            </span>
            <span className="ml-1 text-sm text-slate-400">{med.unit}s en stock</span>
          </div>
          <span className="text-sm text-slate-400">{autonomyPhrase(p.daysRemaining)}</span>
        </div>
        <div className="mt-2">
          <ProgressBar value={pct} severity={p.severity} />
        </div>
      </div>

      <RunOutLine {...p} />

      <div className="border-t border-slate-100 pt-3">
        <DoseChecklist
          kind="medication"
          itemId={med.id}
          dose={med.dose}
          logs={med.logs}
          stockDate={med.stockDate}
          todayISO={med.today.date}
          unit={med.unit}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="subtle" className="flex-1" onClick={() => setModal("restock")}>
          <RefreshCw className="h-4 w-4" /> Réapprovisionner
        </Button>
      </div>

      <Modal open={modal === "edit"} onClose={() => setModal(null)} title="Modifier le médicament">
        <MedicationForm initial={med} onDone={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "restock"} onClose={() => setModal(null)} title="Réapprovisionner">
        <RestockForm kind="medication" id={med.id} current={med.stock} unit={med.unit} onDone={() => setModal(null)} />
      </Modal>
    </article>
  );
}

// ---- Insulin -------------------------------------------------------------

export function InsulinCard({ ins }: { ins: InsulinDTO }) {
  const { actions } = useMedocs();
  const [modal, setModal] = useState<null | "edit" | "restock">(null);
  const p = ins.projection;
  const baselineUnits = ins.stockCartridges * ins.unitsPerCartridge;
  const pct = baselineUnits > 0 ? (p.currentStock / baselineUnits) * 100 : 0;

  return (
    <article className="card animate-pop flex flex-col gap-4 p-5">
      <CardHeader
        icon={<Droplet className="h-5 w-5 text-sky-700" />}
        iconClass="bg-sky-100"
        title={ins.name}
        subtitle={`${fmtNum(p.dailyDose)} unités/jour`}
        badge={
          <span className="flex items-center gap-1.5">
            <Badge>{ins.type === "rapid" ? "Rapide" : "Lente"}</Badge>
            <Badge severity={p.severity}>{daysLabel(p.daysRemaining)}</Badge>
          </span>
        }
        onEdit={() => setModal("edit")}
        onDelete={() => confirm(`Supprimer « ${ins.name} » ?`) && actions.deleteInsulin(ins.id)}
      />

      <div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-bold tabular-nums text-slate-900">
              {fmtNum(p.currentStock)}
            </span>
            <span className="ml-1 text-sm text-slate-400">unités</span>
          </div>
          <span className="text-sm text-slate-400">
            ≈ {fmtNum(ins.currentCartridges)} cartouche{ins.currentCartridges >= 2 ? "s" : ""}
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={pct} severity={p.severity} />
        </div>
      </div>

      <RunOutLine {...p} />

      <div className="border-t border-slate-100 pt-3">
        <DoseChecklist
          kind="insulin"
          itemId={ins.id}
          dose={ins.dose}
          logs={ins.logs}
          stockDate={ins.stockDate}
          todayISO={ins.today.date}
          unit="unités"
          editableAmount
        />
      </div>

      <Button variant="subtle" onClick={() => setModal("restock")}>
        <RefreshCw className="h-4 w-4" /> Mettre à jour le stock
      </Button>

      <Modal open={modal === "edit"} onClose={() => setModal(null)} title="Modifier l'insuline">
        <InsulinForm initial={ins} onDone={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "restock"} onClose={() => setModal(null)} title="Mettre à jour le stock">
        <InsulinStockForm insulin={ins} onDone={() => setModal(null)} />
      </Modal>
    </article>
  );
}

// ---- Sensor --------------------------------------------------------------

const SENSOR_STATE_LABEL: Record<SensorDTO["status"]["state"], string> = {
  none: "Aucun capteur posé",
  active: "Actif",
  tolerance: "À changer (tolérance)",
  expired: "Expiré",
};

export function SensorCard({ sensor }: { sensor: SensorDTO }) {
  const { actions } = useMedocs();
  const [modal, setModal] = useState<null | "edit" | "restock" | "place">(null);
  const st = sensor.status;

  const validityHours = sensor.validityDays * 24;
  const elapsedPct =
    st.hoursRemaining !== null ? ((validityHours - st.hoursRemaining) / validityHours) * 100 : 0;

  const remainingLabel = (() => {
    if (st.hoursRemaining === null) return null;
    const h = st.hoursRemaining;
    if (h <= 0) return "Fonction terminée";
    if (h < 48) return `${fmtNum(h)} h restantes`;
    return `${fmtNum(h / 24)} jours restants`;
  })();

  return (
    <article className="card animate-pop flex flex-col gap-4 p-5">
      <CardHeader
        icon={<Activity className="h-5 w-5 text-violet-700" />}
        iconClass="bg-violet-100"
        title={sensor.name}
        subtitle={`Validité ${fmtNum(sensor.validityDays)} j · tolérance ${fmtNum(sensor.toleranceHours)} h`}
        badge={<Badge severity={st.severity}>{SENSOR_STATE_LABEL[st.state]}</Badge>}
        onEdit={() => setModal("edit")}
        onDelete={() => confirm(`Supprimer « ${sensor.name} » ?`) && actions.deleteSensor(sensor.id)}
      />

      {st.state === "none" ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Aucun capteur posé pour le moment. Posez votre premier capteur pour démarrer le décompte.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <ProgressBar value={elapsedPct} severity={st.severity} />
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-400">Fonctionnel jusqu&apos;au</p>
              <p className="font-semibold text-slate-700">{st.expiresAtFR}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-400">Tolérance jusqu&apos;au</p>
              <p className={cx("font-semibold", SEVERITY_TEXT[st.severity])}>{st.toleranceUntilFR}</p>
            </div>
          </div>
          {remainingLabel && (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              {st.state === "active" ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              )}
              {st.state === "active"
                ? remainingLabel
                : st.state === "tolerance"
                  ? "Dans la période de tolérance — à changer rapidement"
                  : "Capteur expiré — à remplacer"}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <p className="text-sm text-slate-500">
          <span className="text-lg font-bold text-slate-900">{sensor.stock}</span> en stock
        </p>
        <Badge>Posé le {st.placedAtFR ?? "—"}</Badge>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
        <CalendarClock className={cx("h-4 w-4 shrink-0", SEVERITY_TEXT[st.restockSeverity])} />
        <span className="text-slate-600">
          Pharmacie (capteurs) avant le{" "}
          <span className={cx("font-semibold", SEVERITY_TEXT[st.restockSeverity])}>
            {st.coverageEndFR}
          </span>{" "}
          <span className="text-slate-400">· {daysLabel(st.restockDaysRemaining)}</span>
        </span>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setModal("place")}>
          <MapPin className="h-4 w-4" /> Poser un capteur
        </Button>
        <Button variant="subtle" onClick={() => setModal("restock")}>
          <RefreshCw className="h-4 w-4" /> Réappro
        </Button>
      </div>

      <Modal open={modal === "place"} onClose={() => setModal(null)} title="Poser un capteur">
        <PlaceSensorForm sensor={sensor} onDone={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "edit"} onClose={() => setModal(null)} title="Modifier le capteur">
        <SensorForm initial={sensor} onDone={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "restock"} onClose={() => setModal(null)} title="Réapprovisionner">
        <RestockForm kind="sensor" id={sensor.id} current={sensor.stock} unit="capteurs" onDone={() => setModal(null)} />
      </Modal>
    </article>
  );
}

// ---- Pharmacy ------------------------------------------------------------

export function PharmacyCard({ pharmacy }: { pharmacy: PharmacyDTO }) {
  const { actions } = useMedocs();
  const [open, setOpen] = useState(false);

  return (
    <article className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
          <CalendarDays className="h-5 w-5 text-emerald-700" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-slate-900">Passage en pharmacie</h3>
          <p className="text-sm text-slate-400">Une fois par mois</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Dernier passage</p>
          <p className="font-semibold text-slate-700">{pharmacy.lastVisitFR ?? "Jamais"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-400">Prochain autorisé</p>
          <p className="font-semibold text-slate-700">{pharmacy.nextAllowedFR ?? "Maintenant"}</p>
        </div>
      </div>

      <Badge severity={pharmacy.canGoToday ? "ok" : "warn"} className="self-start">
        {pharmacy.canGoToday ? "Vous pouvez y aller" : `Patientez jusqu'au ${pharmacy.nextAllowedFR}`}
      </Badge>

      {pharmacy.visits.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {pharmacy.visits.slice(0, 4).map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 text-sm text-slate-500">
              <span>
                {v.date.split("-").reverse().join("/")}
                {v.note ? ` — ${v.note}` : ""}
              </span>
              <IconButton label="Supprimer" onClick={() => actions.deletePharmacy(v.id)} className="hover:text-rose-600">
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Button variant="subtle" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Enregistrer un passage
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Passage en pharmacie">
        <PharmacyForm onDone={() => setOpen(false)} />
      </Modal>
    </article>
  );
}
