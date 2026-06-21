import { handler, json } from "@/lib/http";
import { buildState } from "@/server/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handler(async () => json(buildState()));
