import { cronAuthorized } from "@/lib/cron";
import { runSource } from "@/lib/lists/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Nightly: refresh NYC licence data, then verify whatever is new. */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  const out: Record<string, unknown> = {};
  for (const key of ["nyc-dob", "nyc-dcwp", "verify"] as const) {
    out[key] = await runSource(key).catch((e) => ({ error: String(e) }));
  }
  return Response.json(out);
}
export const POST = GET;
