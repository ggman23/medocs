// GitHub-as-storage: reads and writes the data.json document in a repo through
// the GitHub REST API (which supports CORS, so it works straight from the
// browser). The access token is kept in localStorage on each device.

import { MedocsData, emptyData, normalizeData } from "@/domain/data";

export interface RepoConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
}

const CONFIG_KEY = "medocs.config.v1";
export const DEFAULT_BRANCH = "medocs-data";
export const DEFAULT_PATH = "data.json";

export class GitHubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export class ConflictError extends GitHubError {
  constructor() {
    super(409, "Conflit d'écriture (la donnée a changé entre-temps)");
  }
}

// ---- config persistence --------------------------------------------------

export function loadConfig(): RepoConfig | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<RepoConfig>;
    if (!c.owner || !c.repo || !c.token) return null;
    return {
      owner: c.owner,
      repo: c.repo,
      branch: c.branch || DEFAULT_BRANCH,
      path: c.path || DEFAULT_PATH,
      token: c.token,
    };
  } catch {
    return null;
  }
}

export function saveConfig(cfg: RepoConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function clearConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

/** Guess owner/repo when the app is served from GitHub Pages. */
export function detectRepoFromLocation(): { owner: string; repo: string } | null {
  if (typeof location === "undefined") return null;
  const m = location.hostname.match(/^([^.]+)\.github\.io$/);
  if (!m) return null;
  const owner = m[1];
  const seg = location.pathname.split("/").filter(Boolean)[0];
  return { owner, repo: seg || `${owner}.github.io` };
}

// ---- base64 (utf-8 safe) -------------------------------------------------

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ---- API calls -----------------------------------------------------------

function headers(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function contentsUrl(cfg: RepoConfig): string {
  return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(
    cfg.path,
  )}`;
}

export interface LoadResult {
  data: MedocsData;
  sha: string | null;
}

/** Read data.json. A missing file is treated as an empty document. */
export async function readData(cfg: RepoConfig): Promise<LoadResult> {
  const url = `${contentsUrl(cfg)}?ref=${encodeURIComponent(cfg.branch)}&t=${Date.now()}`;
  const res = await fetch(url, { headers: headers(cfg.token), cache: "no-store" });
  if (res.status === 404) return { data: emptyData(), sha: null };
  if (!res.ok) throw await toError(res);
  const body = (await res.json()) as { content?: string; sha: string };
  const json = body.content ? base64ToUtf8(body.content) : "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    parsed = null;
  }
  return { data: normalizeData(parsed), sha: body.sha };
}

/** Write data.json. Pass the last known sha; a mismatch raises ConflictError. */
export async function writeData(
  cfg: RepoConfig,
  data: MedocsData,
  sha: string | null,
  message: string,
): Promise<string> {
  const res = await fetch(contentsUrl(cfg), {
    method: "PUT",
    headers: { ...headers(cfg.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: utf8ToBase64(JSON.stringify(data, null, 2)),
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (res.status === 409) throw new ConflictError();
  if (!res.ok) throw await toError(res);
  const body = (await res.json()) as { content: { sha: string } };
  return body.content.sha;
}

/** Validate a config: token works and the repo is reachable. */
export async function checkConfig(cfg: RepoConfig): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, {
      headers: headers(cfg.token),
      cache: "no-store",
    });
    if (!res.ok) throw await toError(res);
    await readData(cfg); // also confirm the branch/file is readable
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Connexion impossible";
  }
}

async function toError(res: Response): Promise<GitHubError> {
  let detail = "";
  try {
    const body = (await res.json()) as { message?: string };
    detail = body.message || "";
  } catch {
    /* ignore */
  }
  if (res.status === 401) return new GitHubError(401, "Jeton invalide ou expiré");
  if (res.status === 403)
    return new GitHubError(403, "Accès refusé (droits du jeton ou limite atteinte)");
  if (res.status === 404)
    return new GitHubError(404, "Dépôt ou branche introuvable — vérifiez le nom");
  return new GitHubError(res.status, detail || `Erreur GitHub (${res.status})`);
}
