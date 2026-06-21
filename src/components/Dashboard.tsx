"use client";

import { useState } from "react";
import {
  Activity,
  Droplet,
  ExternalLink,
  HeartPulse,
  Pill,
  Plus,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useMedocs } from "@/state/MedocsProvider";
import { Button, IconButton, Modal, cx } from "./ui";
import { InsulinCard, MedicationCard, PharmacyCard, SensorCard } from "./cards";
import { InsulinForm, MedicationForm, SensorForm } from "./forms";
import { Setup } from "./Setup";
import { cap, prettyDateFR } from "@/lib/format";

type AddKind = "medication" | "insulin" | "sensor" | null;

function SectionHeader({
  icon,
  title,
  count,
  onAdd,
  addLabel,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        {count > 0 && (
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-500">
            {count}
          </span>
        )}
      </div>
      <Button variant="subtle" onClick={onAdd} className="px-3 py-2">
        <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{addLabel}</span>
      </Button>
    </div>
  );
}

function EmptyState({ text, onAdd, addLabel }: { text: string; onAdd: () => void; addLabel: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <p className="text-sm text-slate-500">{text}</p>
      <Button variant="subtle" onClick={onAdd}>
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

export function Dashboard() {
  const { state, loading, error, syncing, needsSetup } = useMedocs();
  const [add, setAdd] = useState<AddKind>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (needsSetup) return <Setup />;

  if (loading && !state) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center text-slate-400">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Chargement…
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-slate-500">
        <p className="mb-2 font-semibold text-rose-600">Impossible de charger les données</p>
        <p className="mb-4 text-sm">{error}</p>
        <Button variant="subtle" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-4 w-4" /> Vérifier la connexion
        </Button>
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-16">
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold leading-tight text-slate-900">Médocs</p>
              <p className="text-xs text-slate-400">{cap(prettyDateFR(state.today))}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <SyncPill syncing={syncing} error={error} />
            <IconButton label="Paramètres" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pt-6">
        <section>
          <SectionHeader
            icon={<Pill className="h-5 w-5" />}
            title="Médicaments"
            count={state.medications.length}
            onAdd={() => setAdd("medication")}
            addLabel="Ajouter"
          />
          {state.medications.length === 0 ? (
            <EmptyState
              text="Aucun médicament suivi pour l'instant."
              onAdd={() => setAdd("medication")}
              addLabel="Ajouter un médicament"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {state.medications.map((med) => (
                <MedicationCard key={med.id} med={med} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader
            icon={<Droplet className="h-5 w-5" />}
            title="Insuline"
            count={state.insulins.length}
            onAdd={() => setAdd("insulin")}
            addLabel="Ajouter"
          />
          {state.insulins.length === 0 ? (
            <EmptyState
              text="Aucune insuline suivie pour l'instant."
              onAdd={() => setAdd("insulin")}
              addLabel="Ajouter une insuline"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {state.insulins.map((ins) => (
                <InsulinCard key={ins.id} ins={ins} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader
            icon={<Activity className="h-5 w-5" />}
            title="Capteurs de glycémie"
            count={state.sensors.length}
            onAdd={() => setAdd("sensor")}
            addLabel="Ajouter"
          />
          {state.sensors.length === 0 ? (
            <EmptyState
              text="Aucun capteur suivi pour l'instant."
              onAdd={() => setAdd("sensor")}
              addLabel="Ajouter un capteur"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {state.sensors.map((sensor) => (
                <SensorCard key={sensor.id} sensor={sensor} />
              ))}
            </div>
          )}
        </section>

        <section className="max-w-md">
          <PharmacyCard pharmacy={state.pharmacy} />
        </section>
      </main>

      <Modal open={add === "medication"} onClose={() => setAdd(null)} title="Nouveau médicament">
        <MedicationForm onDone={() => setAdd(null)} />
      </Modal>
      <Modal open={add === "insulin"} onClose={() => setAdd(null)} title="Nouvelle insuline">
        <InsulinForm onDone={() => setAdd(null)} />
      </Modal>
      <Modal open={add === "sensor"} onClose={() => setAdd(null)} title="Nouveau capteur">
        <SensorForm onDone={() => setAdd(null)} />
      </Modal>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { config, signOut, lastSync } = useMedocs();
  if (!config) return null;
  const fileUrl = `https://github.com/${config.owner}/${config.repo}/blob/${config.branch}/${config.path}`;
  return (
    <Modal open={open} onClose={onClose} title="Paramètres">
      <div className="flex flex-col gap-4 text-sm">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-400">Dépôt connecté</p>
          <p className="font-semibold text-slate-700">
            {config.owner}/{config.repo}
          </p>
          <p className="text-xs text-slate-400">
            branche <code className="rounded bg-white px-1">{config.branch}</code> · fichier{" "}
            <code className="rounded bg-white px-1">{config.path}</code>
          </p>
        </div>
        {lastSync && (
          <p className="text-xs text-slate-400">
            Dernière synchro : {lastSync.toLocaleTimeString("fr-FR")}
          </p>
        )}
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline"
        >
          Voir les données sur GitHub <ExternalLink className="h-4 w-4" />
        </a>
        <Button
          variant="danger"
          onClick={() => {
            signOut();
            onClose();
          }}
        >
          Se déconnecter de cet appareil
        </Button>
        <p className="text-xs text-slate-400">
          La déconnexion efface seulement le jeton de ce navigateur. Vos données restent sur GitHub.
        </p>
      </div>
    </Modal>
  );
}

function SyncPill({ syncing, error }: { syncing: boolean; error: string | null }) {
  const label = error ? "Erreur" : syncing ? "Synchronisation…" : "À jour";
  const color = error ? "bg-rose-400" : syncing ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2 rounded-full bg-slate-100/80 px-3 py-1.5 text-xs font-medium text-slate-500">
      <span className={cx("h-2 w-2 rounded-full", color, syncing && "animate-pulse")} />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
