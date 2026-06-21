"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { StateDTO } from "@/domain/api";
import type { Slot } from "@/domain/types";
import { MedocsData, emptyData } from "@/domain/data";
import { computeState } from "@/domain/state";
import * as mut from "@/domain/mutations";
import { instantFromLocal } from "@/domain/dates";
import {
  ConflictError,
  RepoConfig,
  checkConfig,
  clearConfig,
  loadConfig,
  readData,
  saveConfig,
  writeData,
} from "@/lib/github";

type Json = Record<string, unknown>;

const msg = (e: unknown) => (e instanceof Error ? e.message : "Une erreur est survenue");

/** Convert a sensor form payload (placedDate/placedTime) into a stored input. */
function toSensorInput(p: Json): Json {
  const { placedDate, placedTime, ...rest } = p as {
    placedDate?: string;
    placedTime?: string;
  } & Json;
  if (placedDate && placedTime) {
    return { ...rest, placedAt: instantFromLocal(placedDate, placedTime).toISOString() };
  }
  return rest;
}

export interface MedocsActions {
  addMedication: (input: Json) => Promise<void>;
  updateMedication: (id: string, patch: Json) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  addInsulin: (input: Json) => Promise<void>;
  updateInsulin: (id: string, patch: Json) => Promise<void>;
  deleteInsulin: (id: string) => Promise<void>;
  addSensor: (input: Json) => Promise<void>;
  updateSensor: (id: string, patch: Json) => Promise<void>;
  deleteSensor: (id: string) => Promise<void>;
  placeSensor: (id: string, date: string, time: string) => Promise<void>;
  setIntake: (
    kind: "medication" | "insulin",
    itemId: string,
    date: string,
    slot: Slot,
    amount: number | null,
  ) => Promise<void>;
  addPharmacy: (date: string, note?: string) => Promise<void>;
  deletePharmacy: (id: string) => Promise<void>;
}

interface Ctx {
  state: StateDTO | null;
  loading: boolean;
  error: string | null;
  syncing: boolean;
  lastSync: Date | null;
  needsSetup: boolean;
  config: RepoConfig | null;
  actions: MedocsActions;
  setup: (cfg: RepoConfig) => Promise<void>;
  signOut: () => void;
}

const MedocsContext = createContext<Ctx | null>(null);
const POLL_MS = 20_000;

export function MedocsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RepoConfig | null>(null);
  const [data, setDataState] = useState<MedocsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [nowTick, setNowTick] = useState<Date>(() => new Date());

  const dataRef = useRef<MedocsData>(emptyData());
  const shaRef = useRef<string | null>(null);
  const configRef = useRef<RepoConfig | null>(null);
  const writingRef = useRef(0);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  const applyData = useCallback((d: MedocsData) => {
    dataRef.current = d;
    setDataState(d);
  }, []);

  // Read the stored config once on mount. localStorage is client-only, so this
  // must happen in an effect (not during SSR) to avoid a hydration mismatch.
  useEffect(() => {
    const cfg = loadConfig();
    configRef.current = cfg;
    /* eslint-disable react-hooks/set-state-in-effect */
    setConfig(cfg);
    if (!cfg) setLoading(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // When configured: initial load + background polling + a 1-min clock tick.
  useEffect(() => {
    if (!config) return;
    let cancelled = false;

    const refresh = async (withLoading = false) => {
      if (withLoading) setLoading(true);
      try {
        const { data: d, sha } = await readData(config);
        if (cancelled) return;
        if (withLoading || sha !== shaRef.current) {
          shaRef.current = sha;
          applyData(d);
        }
        setError(null);
        setLastSync(new Date());
      } catch (e) {
        if (!cancelled && withLoading) setError(msg(e));
      } finally {
        if (!cancelled && withLoading) setLoading(false);
      }
    };

    void refresh(true);
    const poll = setInterval(() => {
      if (writingRef.current === 0 && document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const onFocus = () => {
      if (writingRef.current === 0) void refresh();
    };
    const clock = setInterval(() => setNowTick(new Date()), 60_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(clock);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [config, applyData]);

  // Apply a transform optimistically, then persist it (serialized; replays on
  // conflict so a change made on another device is not lost).
  const mutate = useCallback(
    (transform: (d: MedocsData) => MedocsData, message: string) => {
      const cfg = configRef.current;
      if (!cfg) return Promise.resolve();

      const optimistic = transform(dataRef.current);
      applyData(optimistic);
      writingRef.current += 1;
      setSyncing(true);

      const task = async () => {
        try {
          let toWrite = optimistic;
          try {
            shaRef.current = await writeData(cfg, toWrite, shaRef.current, message);
          } catch (e) {
            if (e instanceof ConflictError) {
              const fresh = await readData(cfg);
              toWrite = transform(fresh.data);
              shaRef.current = await writeData(cfg, toWrite, fresh.sha, message);
              applyData(toWrite);
            } else {
              throw e;
            }
          }
          setError(null);
          setLastSync(new Date());
        } catch (e) {
          setError(msg(e));
          try {
            const fresh = await readData(cfg);
            shaRef.current = fresh.sha;
            applyData(fresh.data);
          } catch {
            /* keep optimistic state if even the resync fails */
          }
        } finally {
          writingRef.current -= 1;
          if (writingRef.current <= 0) setSyncing(false);
        }
      };

      const run = queueRef.current.then(task, task);
      queueRef.current = run.catch(() => {});
      return run;
    },
    [applyData],
  );

  const setup = useCallback(async (cfg: RepoConfig) => {
    const err = await checkConfig(cfg);
    if (err) throw new Error(err);
    saveConfig(cfg);
    configRef.current = cfg;
    shaRef.current = null;
    setConfig(cfg);
  }, []);

  const signOut = useCallback(() => {
    clearConfig();
    configRef.current = null;
    shaRef.current = null;
    applyData(emptyData());
    setConfig(null);
    setLoading(false);
  }, [applyData]);

  const actions: MedocsActions = useMemo(
    () => ({
      addMedication: (input) =>
        mutate((d) => mut.addMedication(d, input as unknown as mut.MedicationInput), "Ajout médicament"),
      updateMedication: (id, patch) =>
        mutate((d) => mut.updateMedication(d, id, patch as Partial<mut.MedicationInput>), "Modif médicament"),
      deleteMedication: (id) => mutate((d) => mut.removeMedication(d, id), "Suppression médicament"),
      addInsulin: (input) =>
        mutate((d) => mut.addInsulin(d, input as unknown as mut.InsulinInput), "Ajout insuline"),
      updateInsulin: (id, patch) =>
        mutate((d) => mut.updateInsulin(d, id, patch as Partial<mut.InsulinInput>), "Modif insuline"),
      deleteInsulin: (id) => mutate((d) => mut.removeInsulin(d, id), "Suppression insuline"),
      addSensor: (input) =>
        mutate((d) => mut.addSensor(d, toSensorInput(input) as unknown as mut.SensorInput), "Ajout capteur"),
      updateSensor: (id, patch) =>
        mutate((d) => mut.updateSensor(d, id, toSensorInput(patch) as Partial<mut.SensorInput>), "Modif capteur"),
      deleteSensor: (id) => mutate((d) => mut.removeSensor(d, id), "Suppression capteur"),
      placeSensor: (id, date, time) =>
        mutate(
          (d) => mut.placeSensor(d, id, instantFromLocal(date, time).toISOString()),
          "Pose capteur",
        ),
      setIntake: (kind, itemId, date, slot, amount) =>
        mutate((d) => mut.setIntake(d, kind, itemId, date, slot, amount), "Saisie prise"),
      addPharmacy: (date, note) => mutate((d) => mut.addPharmacyVisit(d, date, note), "Passage pharmacie"),
      deletePharmacy: (id) => mutate((d) => mut.removePharmacyVisit(d, id), "Suppression passage"),
    }),
    [mutate],
  );

  const state = useMemo(
    () => (config && data ? computeState(data, nowTick) : null),
    [config, data, nowTick],
  );

  return (
    <MedocsContext.Provider
      value={{
        state,
        loading,
        error,
        syncing,
        lastSync,
        needsSetup: !config,
        config,
        actions,
        setup,
        signOut,
      }}
    >
      {children}
    </MedocsContext.Provider>
  );
}

export function useMedocs(): Ctx {
  const ctx = useContext(MedocsContext);
  if (!ctx) throw new Error("useMedocs must be used within MedocsProvider");
  return ctx;
}
