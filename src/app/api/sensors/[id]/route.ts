import { handler, json, notFound, parseBody } from "@/lib/http";
import { sensorUpdate } from "@/lib/validation";
import { instantFromLocal } from "@/domain/dates";
import * as repo from "@/db/repo";
import { buildState } from "@/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const { placedDate, placedTime, ...rest } = await parseBody(req, sensorUpdate);
  const patch: repo.SensorInput | Partial<repo.SensorInput> = { ...rest };
  if (placedDate && placedTime) {
    patch.placedAt = instantFromLocal(placedDate, placedTime).toISOString();
  }
  const updated = repo.updateSensor(id, patch);
  if (!updated) return notFound();
  return json(buildState());
});

export const DELETE = handler<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  repo.deleteSensor(id);
  return json(buildState());
});
