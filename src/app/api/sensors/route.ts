import { handler, json, parseBody } from "@/lib/http";
import { sensorCreate } from "@/lib/validation";
import { instantFromLocal } from "@/domain/dates";
import * as repo from "@/db/repo";
import { buildState } from "@/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const { placedDate, placedTime, ...rest } = await parseBody(req, sensorCreate);
  const placedAt =
    placedDate && placedTime ? instantFromLocal(placedDate, placedTime).toISOString() : null;
  repo.createSensor({ ...rest, placedAt });
  return json(buildState(), { status: 201 });
});
