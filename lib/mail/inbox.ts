import { ImapFlow } from "imapflow";
import { q, one, pgJson } from "../db";
import { advanceStage, recordEvent, stopSequences, suppress } from "../track";
import { markBounced } from "./tick";
import { smtpPassword, type SenderRow } from "./transport";

/**
 * Reads each live mailbox's INBOX for what came back:
 *
 * - bounces (mailer-daemon / delivery reports) → suppress, stop, count toward
 *   the mailbox's bounce rate
 * - replies (threaded to one of our Message-IDs, or from a contacted address)
 *   → stop the sequence and flag for a human; "unsubscribe/remove/stop" in the
 *   reply also suppresses
 * - out-of-office auto-replies → ignored, the sequence carries on
 *
 * Stopping on reply is the single biggest thing that keeps cold email from
 * turning into complaints.
 */
const UNSUB = /\b(unsubscribe|remove me|take me off|stop emailing|do not (contact|email)|not interested|no me interesa|no gracias)\b/i;
const AUTO = /(out of (the )?office|automatic reply|auto[- ]?reply|autoreply|away from|vacation|fuera de la oficina|respuesta autom)/i;

export async function checkInboxes() {
  const senders = await q<SenderRow>(`select * from senders where mode = 'smtp' and imap_host is not null`);
  const out: Record<string, unknown>[] = [];
  for (const s of senders) {
    try {
      out.push({ sender: s.email, ...(await checkOne(s)) });
    } catch (err) {
      out.push({ sender: s.email, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return out;
}

async function checkOne(sender: SenderRow) {
  const stateKey = `imap:${sender.id}`;
  const state = (await one<{ value: { lastUid?: number } }>(`select value from kv where key = $1`, [stateKey]))?.value ?? {};
  const client = new ImapFlow({
    host: sender.imap_host!,
    port: sender.imap_port,
    secure: sender.imap_port === 993,
    auth: { user: sender.smtp_user || sender.email, pass: smtpPassword(sender) },
    logger: false,
  });
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  let lastUid = state.lastUid ?? 0;
  const counts = { replies: 0, bounces: 0, auto: 0, unsubscribes: 0 };
  try {
    const range = lastUid ? `${lastUid + 1}:*` : await firstRange(client);
    if (range) {
      for await (const msg of client.fetch(range, { uid: true, envelope: true, headers: ["auto-submitted", "x-failed-recipients", "content-type", "in-reply-to", "references"] }, { uid: true })) {
        if (msg.uid <= lastUid) continue;
        lastUid = Math.max(lastUid, msg.uid);
        const headers = msg.headers?.toString("utf8") ?? "";
        const from = msg.envelope?.from?.[0]?.address?.toLowerCase() ?? "";
        const subject = msg.envelope?.subject ?? "";

        // Bounce
        if (/mailer-daemon|postmaster/i.test(from) || /multipart\/report/i.test(headers)) {
          let failed = /x-failed-recipients:\s*([^\s,]+)/i.exec(headers)?.[1];
          if (!failed) {
            const src = await client.fetchOne(String(msg.uid), { source: true }, { uid: true });
            const text = src && src.source ? src.source.toString("utf8").slice(0, 60_000) : "";
            failed = /(?:final|original)-recipient:\s*rfc822;\s*<?([^\s>]+)/i.exec(text)?.[1];
          }
          if (failed) {
            const s = await one<{ id: number; contact_id: number; campaign_id: number }>(
              `select s.id, s.contact_id, s.campaign_id from sends s join contacts c on c.id = s.contact_id
               where c.email = $1 and s.status = 'sent' order by s.sent_at desc limit 1`,
              [failed.toLowerCase()],
            );
            if (s) await markBounced(s.id, s.contact_id, s.campaign_id, failed.toLowerCase(), subject || "bounce");
            else await suppress(failed, "bounce", "inbox");
            counts.bounces++;
          }
          continue;
        }

        // Auto-reply: leave the sequence running.
        if (/auto-submitted:\s*auto-(replied|generated)/i.test(headers) || AUTO.test(subject)) {
          counts.auto++;
          continue;
        }

        // Real reply: match on thread first, then on sender address.
        const refs = [msg.envelope?.inReplyTo, ...(/references:\s*([\s\S]*?)(?:\r?\n\S|$)/i.exec(headers)?.[1]?.split(/\s+/) ?? [])].filter(Boolean) as string[];
        let s = refs.length
          ? await one<{ id: number; contact_id: number; campaign_id: number; email: string }>(
              `select s.id, s.contact_id, s.campaign_id, c.email from sends s join contacts c on c.id = s.contact_id
               where s.message_id = any($1::text[]) order by s.sent_at desc limit 1`,
              [`{${refs.map((r) => `"${r.replace(/"/g, "")}"`).join(",")}}`],
            )
          : undefined;
        s ??= await one(
          `select s.id, s.contact_id, s.campaign_id, c.email from sends s join contacts c on c.id = s.contact_id
           where c.email = $1 and s.status = 'sent' order by s.sent_at desc limit 1`,
          [from],
        );
        if (!s) continue;

        await q(`update sends set replied_at = coalesce(replied_at, now()) where id = $1`, [s.id]);
        await stopSequences(s.contact_id, "replied");
        if (UNSUB.test(subject)) {
          await suppress(s.email, "replied-unsubscribe", "inbox");
          await q(`update contacts set stage = 'unsubscribed', updated_at = now() where id = $1`, [s.contact_id]);
          counts.unsubscribes++;
        } else {
          await advanceStage(s.contact_id, "replied");
        }
        await recordEvent("reply", { contactId: s.contact_id, campaignId: s.campaign_id, sendId: s.id }, { meta: { subject: subject.slice(0, 200), from } });
        counts.replies++;
      }
    }
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }
  await q(`insert into kv (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value`, [stateKey, pgJson({ lastUid })]);
  return counts;
}

/** First run: only look back two days rather than the whole mailbox. */
async function firstRange(client: ImapFlow) {
  const uids = await client.search({ since: new Date(Date.now() - 2 * 86_400_000) }, { uid: true });
  return uids && uids.length ? `${Math.min(...uids)}:*` : null;
}
