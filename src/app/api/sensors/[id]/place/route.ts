import { handler, json, notFound, parseBody } from "@/lib/http";
import { sensorPlace } from "@/lib/validation";
import { instantFromLocal } from "@/domain/dates";
import * as repo from "@/db/repo";
import { buildState } from "@/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Record the placement of a new sensor (consumes one spare).
export const POST = handler<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const { date, time } = await parseBody(req, sensorPlace);
  const placedAt = instantFromLocal(date, time).toISOString();
  const updated = repo.placeSensor(id, placedAt);
  if (!updated) return notFound();
  return json(buildState());
});
