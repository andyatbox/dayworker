import { one } from "./db";
import { recordEvent, stopSequences, suppress } from "./track";
import { q } from "./db";

/**
 * Honoured immediately (CAN-SPAM allows 10 business days; there's no reason
 * to take one). The address goes on the permanent suppression list, so no
 * future import or campaign can reach it again.
 */
export async function unsubscribeByToken(token: string, reason: string) {
  const s = await one<{ id: number; contact_id: number; campaign_id: number; email: string }>(
    `select s.id, s.contact_id, s.campaign_id, c.email from sends s join contacts c on c.id = s.contact_id where s.token = $1`,
    [token],
  );
  if (!s) return false;
  await suppress(s.email, reason, "unsubscribe");
  await q(`update contacts set stage = 'unsubscribed', updated_at = now() where id = $1`, [s.contact_id]);
  await stopSequences(s.contact_id, "unsubscribed");
  await recordEvent("unsubscribe", { contactId: s.contact_id, campaignId: s.campaign_id, sendId: s.id }, { meta: { reason } });
  return true;
}
