import { cookies } from "next/headers";
import { q, one, pgJson } from "./db";
import { sign, unsign } from "./util";

/**
 * First-party attribution, for campaign traffic only. No third-party pixels,
 * nothing for an ad blocker to strip, and nothing at all for people who find
 * dayworker.co on their own:
 *
 * - dw_att  signed send token, set when someone clicks an email link (/i/…)
 * - dw_inv  readable stamp set with it, so the page knows to show the invitation
 * - dw_src  campaign code from ?c= or ?utm_campaign= (flyers, social, QR)
 * - dw_vid  random visitor id, set alongside either of the above
 */
export const VID = "dw_vid";
export const ATT = "dw_att";
export const INV = "dw_inv";
export const SRC = "dw_src";
export const YEAR = 60 * 60 * 24 * 365;

export type Attribution = {
  visitorId: string | null;
  sendId: number | null;
  campaignId: number | null;
  campaignCode: string | null;
  contactId: number | null;
};

export async function attribution(override?: { visitorId?: string | null; code?: string | null; signedSend?: string | null }): Promise<Attribution> {
  const jar = await cookies();
  const visitorId = override?.visitorId || jar.get(VID)?.value || null;
  const sendToken = unsign(override?.signedSend || jar.get(ATT)?.value);
  if (sendToken) {
    const s = await one<{ id: number; campaign_id: number; contact_id: number; code: string }>(
      `select s.id, s.campaign_id, s.contact_id, c.code from sends s join campaigns c on c.id = s.campaign_id where s.token = $1`,
      [sendToken],
    );
    if (s) return { visitorId, sendId: s.id, campaignId: s.campaign_id, campaignCode: s.code, contactId: s.contact_id };
  }
  const code = override?.code || jar.get(SRC)?.value || null;
  if (code) {
    const c = await one<{ id: number }>(`select id from campaigns where code = $1`, [code]);
    return { visitorId, sendId: null, campaignId: c?.id ?? null, campaignCode: code, contactId: null };
  }
  return { visitorId, sendId: null, campaignId: null, campaignCode: null, contactId: null };
}

export function signedSendCookie(token: string) {
  return sign(token);
}

export async function recordEvent(
  type: string,
  a: Partial<Attribution>,
  extra: { path?: string | null; referrer?: string | null; meta?: Record<string, unknown> } = {},
) {
  await q(
    `insert into events (type, contact_id, campaign_id, send_id, visitor_id, path, referrer, meta)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      type,
      a.contactId ?? null,
      a.campaignId ?? null,
      a.sendId ?? null,
      a.visitorId ?? null,
      extra.path ?? null,
      extra.referrer ?? null,
      pgJson({ ...(a.campaignCode ? { code: a.campaignCode } : {}), ...extra.meta }),
    ],
  );
}

/**
 * Contact stages only move forward. Unsubscribed and bounced are terminal.
 *
 * registered = signed up on the landing page
 * app        = tapped a store button / scanned the QR
 * member     = has a Dayworker account (matched from the app's user export)
 */
export const RANK = ["new", "contacted", "clicked", "replied", "registered", "app", "member"];

export async function advanceStage(contactId: number | null | undefined, stage: string) {
  if (!contactId) return;
  const rank = RANK.indexOf(stage);
  await q(
    `update contacts set stage = $2, updated_at = now()
     where id = $1 and stage not in ('unsubscribed', 'bounced')
       and array_position($3::text[], stage) - 1 < $4`,
    [contactId, stage, `{${RANK.join(",")}}`, rank],
  );
}

/** Stops every queued message to a contact (reply, unsubscribe, bounce, signup). */
export async function stopSequences(contactId: number, reason: string) {
  await q(`update sends set status = 'stopped', error = $2 where contact_id = $1 and status = 'queued'`, [contactId, reason]);
}

export async function suppress(email: string, reason: string, source: string) {
  await q(
    `insert into suppressions (email, reason, source) values ($1, $2, $3)
     on conflict (email) do update set reason = excluded.reason`,
    [email.toLowerCase(), reason, source],
  );
}
