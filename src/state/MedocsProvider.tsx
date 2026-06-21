"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { StateDTO } from "@/domain/api";
import type { Slot } from "@/domain/types";

type Json = Record<string, unknown>;

async function api<T = StateDTO>(
  path: string,
  method: string,
  body?: Json,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Non authentifié");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Une erreur est survenue");
  }
  return data as T;
}

export interface MedocsActions {
  refresh: () => Promise<void>;
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
  actions: MedocsActions;
}

const MedocsContext = createContext<Ctx | null>(null);

const POLL_MS = 20_000;

export function MedocsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StateDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const inflight = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const data = await api<StateDTO>("/api/state", "GET");
      setState(data);
      setError(null);
      setLastSync(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, []);

  // Wrap a mutation so it tracks a global "syncing" state and stores fresh state.
  const mutate = useCallback(async (fn: () => Promise<StateDTO>) => {
    inflight.current += 1;
    setSyncing(true);
    try {
      const next = await fn();
      setState(next);
      setError(null);
      setLastSync(new Date());
    } finally {
      inflight.current -= 1;
      if (inflight.current <= 0) setSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Initial load + background refresh. refresh() updates state asynchronously
    // (after the fetch resolves), so it does not cause a synchronous cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const actions: MedocsActions = {
    refresh,
    addMedication: (input) => mutate(() => api("/api/medications", "POST", input)),
    updateMedication: (id, patch) => mutate(() => api(`/api/medications/${id}`, "PATCH", patch)),
    deleteMedication: (id) => mutate(() => api(`/api/medications/${id}`, "DELETE")),
    addInsulin: (input) => mutate(() => api("/api/insulins", "POST", input)),
    updateInsulin: (id, patch) => mutate(() => api(`/api/insulins/${id}`, "PATCH", patch)),
    deleteInsulin: (id) => mutate(() => api(`/api/insulins/${id}`, "DELETE")),
    addSensor: (input) => mutate(() => api("/api/sensors", "POST", input)),
    updateSensor: (id, patch) => mutate(() => api(`/api/sensors/${id}`, "PATCH", patch)),
    deleteSensor: (id) => mutate(() => api(`/api/sensors/${id}`, "DELETE")),
    placeSensor: (id, date, time) =>
      mutate(() => api(`/api/sensors/${id}/place`, "POST", { date, time })),
    setIntake: (kind, itemId, date, slot, amount) =>
      mutate(() => api("/api/intake", "POST", { kind, itemId, date, slot, amount })),
    addPharmacy: (date, note) => mutate(() => api("/api/pharmacy", "POST", { date, note })),
    deletePharmacy: (id) => mutate(() => api(`/api/pharmacy/${id}`, "DELETE")),
  };

  return (
    <MedocsContext.Provider value={{ state, loading, error, syncing, lastSync, actions }}>
      {children}
    </MedocsContext.Provider>
  );
}

export function useMedocs(): Ctx {
  const ctx = useContext(MedocsContext);
  if (!ctx) throw new Error("useMedocs must be used within MedocsProvider");
  return ctx;
}
