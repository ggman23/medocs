// Optional single-password gate. Disabled unless APP_PASSWORD is set, so the
// app runs open locally but can be protected before being exposed publicly.
// Uses Web Crypto so it works in both the Node and Edge (proxy) runtimes.

export const SESSION_COOKIE = "medocs_session";

export function authEnabled(): boolean {
  return !!process.env.APP_PASSWORD && process.env.APP_PASSWORD.length > 0;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Opaque session token derived from the password (never stores it in clear). */
export async function sessionToken(): Promise<string> {
  return sha256Hex(`${process.env.APP_PASSWORD}:medocs-session-v1`);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidToken(token?: string | null): Promise<boolean> {
  if (!authEnabled()) return true;
  if (!token) return false;
  return safeEqual(token, await sessionToken());
}

export async function passwordMatches(password: string): Promise<boolean> {
  return authEnabled() && password === process.env.APP_PASSWORD;
}
