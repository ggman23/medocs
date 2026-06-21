import { handler, json, notFound, parseBody } from "@/lib/http";
import { medicationUpdate } from "@/lib/validation";
import * as repo from "@/db/repo";
import { buildState } from "@/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const patch = await parseBody(req, medicationUpdate);
  const updated = repo.updateMedication(id, patch);
  if (!updated) return notFound();
  return json(buildState());
});

export const DELETE = handler<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  repo.deleteMedication(id);
  return json(buildState());
});
