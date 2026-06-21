import { handler, json, parseBody } from "@/lib/http";
import { intakeUpsert } from "@/lib/validation";
import * as repo from "@/db/repo";
import { buildState } from "@/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Record (or clear) an actual dose for a given item/day/slot.
export const POST = handler(async (req: Request) => {
  const { kind, itemId, date, slot, amount } = await parseBody(req, intakeUpsert);
  if (amount === null) {
    repo.deleteIntake(kind, itemId, date, slot);
  } else {
    repo.upsertIntake(kind, itemId, date, slot, amount);
  }
  return json(buildState());
});
