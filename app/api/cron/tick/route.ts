import { cronAuthorized } from "@/lib/cron";
import { runTick } from "@/lib/mail/tick";
import { checkInboxes } from "@/lib/mail/inbox";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Every 10–15 min: read replies/bounces first (so nobody gets a follow-up after replying), then send. */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  const inbox = await checkInboxes().catch((e) => ({ error: String(e) }));
  const send = await runTick();
  return Response.json({ inbox, send });
}
export const POST = GET;
