"use client";

import { useState } from "react";
import { ExternalLink, HeartPulse, KeyRound, ShieldCheck } from "lucide-react";
import { useMedocs } from "@/state/MedocsProvider";
import {
  DEFAULT_BRANCH,
  DEFAULT_PATH,
  RepoConfig,
  detectRepoFromLocation,
} from "@/lib/github";
import { Button, Field, TextInput, cx } from "./ui";

const TOKEN_URL = "https://github.com/settings/tokens/new?scopes=repo&description=Medocs";

export function Setup() {
  const { setup, config } = useMedocs();
  const detected = detectRepoFromLocation();
  const [owner, setOwner] = useState(config?.owner ?? detected?.owner ?? "");
  const [repo, setRepo] = useState(config?.repo ?? detected?.repo ?? "");
  const [token, setToken] = useState(config?.token ?? "");
  const [branch, setBranch] = useState(config?.branch ?? DEFAULT_BRANCH);
  const [advanced, setAdvanced] = useState(false);
  const [path, setPath] = useState(config?.path ?? DEFAULT_PATH);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const cfg: RepoConfig = {
        owner: owner.trim(),
        repo: repo.trim(),
        branch: branch.trim() || DEFAULT_BRANCH,
        path: path.trim() || DEFAULT_PATH,
        token: token.trim(),
      };
      await setup(cfg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="card w-full max-w-md p-6 sm:p-7">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <HeartPulse className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Médocs</h1>
          <p className="text-sm text-slate-500">
            Vos données sont enregistrées dans <strong>votre dépôt GitHub</strong> (un fichier{" "}
            <code className="rounded bg-slate-100 px-1">data.json</code>). C&apos;est ce qui
            synchronise le PC et le téléphone.
          </p>
        </div>

        <ol className="mb-5 flex flex-col gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="font-bold text-brand-600">1.</span>
            <span>
              Créez un jeton d&apos;accès GitHub (une fois) :
              <a
                href={TOKEN_URL}
                target="_blank"
                rel="noreferrer"
                className="ml-1 inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
              >
                ouvrir GitHub <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <br />
              Cochez <strong>repo</strong>, générez, puis copiez le jeton ci-dessous.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-brand-600">2.</span>
            <span>Collez-le ici. Il reste sur cet appareil (et à refaire sur le téléphone).</span>
          </li>
        </ol>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Compte (owner)">
              <TextInput value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="ggman23" required />
            </Field>
            <Field label="Dépôt">
              <TextInput value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="medocs" required />
            </Field>
          </div>
          <Field label="Jeton d'accès GitHub">
            <TextInput
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_…"
              autoComplete="off"
              required
            />
          </Field>

          <button
            type="button"
            onClick={() => setAdvanced((a) => !a)}
            className="self-start text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            {advanced ? "Masquer" : "Options avancées"}
          </button>
          {advanced && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Branche">
                <TextInput value={branch} onChange={(e) => setBranch(e.target.value)} />
              </Field>
              <Field label="Fichier">
                <TextInput value={path} onChange={(e) => setPath(e.target.value)} />
              </Field>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}
          <Button type="submit" disabled={busy}>
            <KeyRound className="h-4 w-4" />
            {busy ? "Connexion…" : "Connecter mon dépôt"}
          </Button>
        </form>

        <p className={cx("mt-4 flex items-center gap-1.5 text-xs text-slate-400")}>
          <ShieldCheck className="h-3.5 w-3.5" /> Le jeton est stocké uniquement dans ce navigateur.
        </p>
      </div>
    </div>
  );
}
