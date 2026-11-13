import { one, q } from "@/lib/db";
import { recordEvent } from "@/lib/track";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/**
 * Open pixel — only embedded when a campaign turns "track opens" on (off by
 * default: pixels nudge cold mail toward spam, and Apple Mail pre-loads them,
 * so opens are an "impressions" estimate, never a decision metric).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await one<{ id: number; contact_id: number; campaign_id: number; opened_at: Date | null }>(
    `select id, contact_id, campaign_id, opened_at from sends where token = $1`,
    [token.replace(/\.gif$/, "")],
  );
  if (s && !s.opened_at) {
    await q(`update sends set opened_at = now() where id = $1`, [s.id]);
    await recordEvent("open", { contactId: s.contact_id, campaignId: s.campaign_id, sendId: s.id });
  }
  return new Response(GIF, { headers: { "content-type": "image/gif", "cache-control": "no-store, max-age=0" } });
}
