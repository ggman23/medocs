import { handler, json, parseBody } from "@/lib/http";
import { insulinCreate } from "@/lib/validation";
import * as repo from "@/db/repo";
import { buildState } from "@/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  const input = await parseBody(req, insulinCreate);
  repo.createInsulin(input);
  return json(buildState(), { status: 201 });
});
