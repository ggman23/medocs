import { handler, json, parseBody } from "@/lib/http";
import { pharmacyCreate } from "@/lib/validation";
import * as repo from "@/db/repo";
import { buildState } from "@/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const { date, note } = await parseBody(req, pharmacyCreate);
  repo.addPharmacyVisit(date, note);
  return json(buildState(), { status: 201 });
});
