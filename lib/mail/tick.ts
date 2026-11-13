import { q, one } from "../db";
import { config } from "../config";
import { token } from "../util";
import { advanceStage, recordEvent, stopSequences, suppress } from "../track";
import { renderEmail, type Design, type Step } from "./render";
import { deliver, type SenderRow } from "./transport";

/**
 * The drip. Called every ~10–15 minutes by cron; each call sends at most a
 * few messages per mailbox, so a day's volume spreads out like a person
 * working through their inbox instead of arriving as a blast.
 *
 * Guard rails, in order of importance:
 *  1. Never mail a suppressed, bounced, unsubscribed, replied or registered contact.
 *  2. Per-mailbox warm-up ramp (5/day, +2 per day, up to the mailbox's max).
 *  3. Per-campaign daily cap.
 *  4. Weekdays, 8am–5pm New York time.
 *  5. Auto-pause a mailbox whose 7-day bounce rate passes 2%.
 */
const TODAY_NY = `(date_trunc('day', now() at time zone 'America/New_York') at time zone 'America/New_York')`;

export function warmupCap(sender: Pick<SenderRow, "warmup_start" | "daily_max">, now = new Date()) {
  const start = new Date(sender.warmup_start);
  const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
  return Math.min(sender.daily_max, 5 + 2 * days);
}

export function inSendWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: config.sendWindow.tz,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  return wd !== "Sat" && wd !== "Sun" && hour >= config.sendWindow.startHour && hour < config.sendWindow.endHour;
}

export async function sentToday(senderId: number) {
  const r = await one<{ n: number }>(`select count(*)::int as n from sends where sender_id = $1 and sent_at >= ${TODAY_NY}`, [senderId]);
  return r?.n ?? 0;
}

type Job = {
  id: number;
  campaign_id: number;
  contact_id: number;
  step: number;
  token: string;
  steps: Step[];
  track_opens: boolean;
  design: Design;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  city: string | null;
  borough: string | null;
  trades: string[];
  lang: string;
  stage: string;
  verify_status: string;
  suppressed: boolean;
  thread_ref: string | null;
  attempts: number;
};

/** `campaignId` limits the run to one campaign ("Send now" on its page). */
export async function runTick({ force = false, campaignId }: { force?: boolean; campaignId?: number } = {}) {
  if (!config.sendingOn) return { skipped: "sending on hold: set SENDING=on on Vercel to start" };
  if (!force && !inSendWindow()) return { skipped: "outside send window (weekdays 8am–5pm ET)" };
  const senders = await q<SenderRow>(`select * from senders where status = 'active' order by id`);
  const report: Record<string, unknown>[] = [];

  for (const sender of senders) {
    // CAN-SPAM needs a postal address in every email, and the offer dates must be real.
    if (sender.mode === "smtp" && !config.companyAddress) {
      report.push({ sender: sender.email, sent: 0, note: "live sending blocked: set COMPANY_ADDRESS" });
      continue;
    }
    const cap = warmupCap(sender);
    const already = await sentToday(sender.id);
    const budget = Math.min(config.perTickPerSender, cap - already);
    if (budget <= 0) {
      report.push({ sender: sender.email, sent: 0, note: `daily cap reached (${already}/${cap})` });
      continue;
    }

    // Follow-ups first (finish conversations before starting new ones), then
    // the best-fit contacts.
    const claimed = await q<{ id: number }>(
      `with today as (
         select campaign_id, count(*)::int as n from sends where sent_at >= ${TODAY_NY} group by campaign_id
       ), pick as (
         select s.id from sends s
         join campaigns c on c.id = s.campaign_id
         join contacts ct on ct.id = s.contact_id
         left join today t on t.campaign_id = c.id
         where s.status = 'queued' and s.due_at <= now() and c.status = 'active' and ($3::int is null or c.id = $3)
           and (s.sender_id = $1 or (s.sender_id is null and $1 = any(c.sender_ids)))
           and coalesce(t.n, 0) < c.daily_cap
         order by s.step desc, ct.fit_score desc, s.due_at
         limit $2
       )
       update sends set status = 'sending' where id in (select id from pick) and status = 'queued'
       returning id`,
      [sender.id, budget, campaignId ?? null],
    );

    let sent = 0;
    for (const { id } of claimed) {
      const job = await one<Job>(
        `select s.id, s.campaign_id, s.contact_id, s.step, s.token, s.attempts, c.steps, c.track_opens, c.design,
           ct.email, ct.first_name, ct.last_name, ct.business_name, ct.city, ct.borough, ct.trades, ct.lang, ct.stage, ct.verify_status,
           exists (select 1 from suppressions x where x.email = ct.email) as suppressed,
           (select thread_ref from sends f where f.campaign_id = s.campaign_id and f.contact_id = s.contact_id and f.step = 0) as thread_ref
         from sends s join campaigns c on c.id = s.campaign_id join contacts ct on ct.id = s.contact_id
         where s.id = $1`,
        [id],
      );
      if (!job) continue;

      const stop =
        !job.email ? "no email"
        : job.suppressed ? "suppressed"
        : ["replied", "registered", "app", "member", "unsubscribed", "bounced"].includes(job.stage) ? `contact ${job.stage}`
        : job.verify_status === "invalid" ? "invalid email"
        : !job.steps[job.step] ? "no such step"
        : null;
      if (stop) {
        await q(`update sends set status = 'stopped', error = $2 where id = $1`, [id, stop]);
        continue;
      }

      const mail = renderEmail({
        steps: job.steps,
        step: job.step,
        contact: job,
        sender,
        token: job.token,
        trackOpens: job.track_opens,
        design: job.design,
      });

      try {
        const { messageId } = await deliver(sender, {
          to: job.email!,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          token: job.token,
          inReplyTo: job.step > 0 ? job.thread_ref : null,
        });
        await q(
          `update sends set status = 'sent', sent_at = now(), sender_id = $2, message_id = $3, subject = $4, body = $5,
             thread_ref = coalesce($6, $3), error = null where id = $1`,
          [id, sender.id, messageId, mail.subject, mail.text, job.thread_ref],
        );
        await q(`update contacts set last_contacted_at = now() where id = $1`, [job.contact_id]);
        await advanceStage(job.contact_id, "contacted");
        await recordEvent("sent", { contactId: job.contact_id, campaignId: job.campaign_id, sendId: id }, { meta: { step: job.step, sender: sender.email, dryRun: sender.mode !== "smtp" } });

        const next = job.steps[job.step + 1];
        if (next) {
          await q(
            `insert into sends (campaign_id, contact_id, sender_id, step, token, due_at)
             values ($1, $2, $3, $4, $5, now() + make_interval(days => $6))
             on conflict (campaign_id, contact_id, step) do nothing`,
            [job.campaign_id, job.contact_id, sender.id, job.step + 1, token(), Math.max(1, Number(next.delay_days) || 3)],
          );
        }
        sent++;
      } catch (err) {
        const e = err as { responseCode?: number; message?: string };
        const permanent = typeof e.responseCode === "number" && e.responseCode >= 500 && /5\.1\.[0-9]|user unknown|no such user|does not exist|mailbox unavailable/i.test(e.message ?? "");
        if (permanent) {
          await markBounced(id, job.contact_id, job.campaign_id, job.email!, e.message ?? "rejected");
        } else if (job.attempts < 2) {
          await q(`update sends set status = 'queued', attempts = attempts + 1, due_at = now() + interval '30 minutes', error = $2 where id = $1`, [id, e.message?.slice(0, 300)]);
        } else {
          await q(`update sends set status = 'failed', error = $2 where id = $1`, [id, e.message?.slice(0, 300)]);
        }
      }
    }
    report.push({ sender: sender.email, mode: sender.mode, sent, cap, sentToday: already + sent });
  }

  await healthCheck();
  return { report };
}

export async function markBounced(sendId: number, contactId: number, campaignId: number, email: string, reason: string) {
  await q(`update sends set status = 'failed', bounced_at = now(), error = $2 where id = $1`, [sendId, reason.slice(0, 300)]);
  await q(`update contacts set stage = 'bounced', verify_status = 'invalid', verify_reason = 'bounced', updated_at = now() where id = $1`, [contactId]);
  await suppress(email, "bounce", "sender");
  await stopSequences(contactId, "bounced");
  await recordEvent("bounce", { contactId, campaignId, sendId }, { meta: { reason: reason.slice(0, 200) } });
}

/** Pauses any mailbox whose last-7-day bounce rate is over 2% (min 30 sends). */
async function healthCheck() {
  const rows = await q<{ id: number; sent: number; bounced: number }>(
    `select sender_id as id, count(*)::int as sent, count(bounced_at)::int as bounced
     from sends where sent_at > now() - interval '7 days' and sender_id is not null group by sender_id`,
  );
  for (const r of rows) {
    if (r.sent >= 30 && r.bounced / r.sent > 0.02) {
      await q(
        `update senders set status = 'paused', paused_reason = $2 where id = $1 and status = 'active'`,
        [r.id, `Auto-paused: ${r.bounced}/${r.sent} bounced in 7 days (over 2%). Clean the list before resuming.`],
      );
    }
  }
}
