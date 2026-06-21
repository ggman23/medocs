import { cookies } from "next/headers";
import { handler, json, parseBody } from "@/lib/http";
import { loginBody } from "@/lib/validation";
import { SESSION_COOKIE, authEnabled, passwordMatches, sessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  if (!authEnabled()) return json({ ok: true, authDisabled: true });
  const { password } = await parseBody(req, loginBody);
  if (!(await passwordMatches(password))) {
    return json({ error: "Mot de passe incorrect" }, { status: 401 });
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });
  return json({ ok: true });
});

export const DELETE = handler(async () => {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return json({ ok: true });
});
