// Small helpers for JSON route handlers.

import { NextResponse } from "next/server";
import { ZodError, ZodType } from "zod";

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "Introuvable") {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** Parse + validate a JSON body, throwing a typed 400 response on failure. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Corps de requête JSON invalide");
  }
  try {
    return schema.parse(raw);
  } catch (e) {
    if (e instanceof ZodError) {
      throw badRequest("Données invalides", e.flatten());
    }
    throw e;
  }
}

/** Wrap a handler so thrown Responses (from parseBody) are returned cleanly. */
export function handler<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response> | Response) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error("[api] unhandled error", e);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  };
}
