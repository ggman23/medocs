import { handler, json, notFound, parseBody } from "@/lib/http";
import { insulinUpdate } from "@/lib/validation";
import * as repo from "@/db/repo";
import { buildState } from "@/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const patch = await parseBody(req, insulinUpdate);
  const updated = repo.updateInsulin(id, patch);
  if (!updated) return notFound();
  return json(buildState());
});

export const DELETE = handler<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  repo.deleteInsulin(id);
  return json(buildState());
});
