import { handler, json, parseBody } from "@/lib/http";
import { medicationCreate } from "@/lib/validation";
import * as repo from "@/db/repo";
import { buildState } from "@/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => json(repo.listMedications()));

export const POST = handler(async (req: Request) => {
  const input = await parseBody(req, medicationCreate);
  repo.createMedication(input);
  return json(buildState(), { status: 201 });
});
