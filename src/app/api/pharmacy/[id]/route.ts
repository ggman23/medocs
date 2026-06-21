import { handler, json } from "@/lib/http";
import * as repo from "@/db/repo";
import { buildState } from "@/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handler<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  repo.deletePharmacyVisit(id);
  return json(buildState());
});
