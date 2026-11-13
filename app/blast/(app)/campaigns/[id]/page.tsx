import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { q, one, pgJson } from "@/lib/db";
import { inAppSql, joinedAppSql, joinedPageSql, joinedSql } from "@/lib/funnel";
import { enroll, sendableCount } from "@/lib/campaigns";
import { renderEmail, type Design, type Step } from "@/lib/mail/render";
import { runTick } from "@/lib/mail/tick";
import { whereFor, type Filter } from "@/lib/segments";
import CampaignForm, { readCampaignForm } from "@/components/blast/CampaignForm";
import { Badge, Card, PageTitle, Stat, Table, Warning, btn, btnDark, btnGhost, input, label, fmt, pct, when } from "@/components/blast/ui";

type Campaign = { id: number; name: string; code: string; status: string; list_id: number | null; sender_ids: number[]; daily_cap: number; track_opens: boolean; design: Design; steps: Step[] };

export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; tab?: string }> }) {
  const id = Number((await params).id);
  const { msg, tab } = await searchParams;
  const c = await one<Campaign>(`select * from campaigns where id = $1`, [id]);
  if (!c) notFound();
  const list = c.list_id ? await one<{ name: string; filter: Filter }>(`select name, filter from lists where id = $1`, [c.list_id]) : undefined;
  const avail = list ? await sendableCount(list.filter) : { total: 0, sendable: 0 };
  const lists = await q<{ id: number; name: string }>(`select id, name from lists order by id`);
  const senders = await q<{ id: number; name: string; email: string; mode: string; signature: string | null }>(`select id, name, email, mode, signature from senders order by id`);

  const s = (await one<Record<string, number>>(`
    select
      count(distinct contact_id)::int as enrolled,
      count(*) filter (where status = 'sent')::int as sent,
      count(distinct contact_id) filter (where status = 'sent' and step = 0)::int as reached,
      count(*) filter (where status = 'queued')::int as queued,
      count(*) filter (where status = 'stopped')::int as stopped,
      count(*) filter (where status = 'failed')::int as failed,
      count(distinct contact_id) filter (where opened_at is not null)::int as opened,
      count(distinct contact_id) filter (where clicked_at is not null)::int as clicked,
      count(distinct contact_id) filter (where replied_at is not null)::int as replied,
      count(*) filter (where bounced_at is not null)::int as bounced,
      ${joinedSql("$1")} as joined,
      ${joinedPageSql("$1")} as joined_page,
      ${joinedAppSql("$1")} as joined_app,
      ${inAppSql("$1")} as in_app,
      (select count(distinct coalesce(visitor_id, contact_id::text))::int from events where campaign_id = $1 and type = 'app_click') as app,
      (select count(distinct visitor_id)::int from events where campaign_id = $1 and type = 'page_view') as landed,
      (select count(*)::int from events where campaign_id = $1 and type = 'unsubscribe') as unsubs
    from sends where campaign_id = $1`, [id])) ?? {};
  const perStep = await q<{ step: number; sent: number; clicked: number; replied: number }>(
    `select step, count(*) filter (where status='sent')::int as sent, count(clicked_at)::int as clicked, count(replied_at)::int as replied
     from sends where campaign_id = $1 group by step order by step`, [id]);
  const recent = await q<{ id: number; contact_id: number; email: string; business_name: string | null; step: number; status: string; sent_at: Date | null; due_at: Date; clicked_at: Date | null; replied_at: Date | null; error: string | null }>(
    `select s.id, s.contact_id, c.email, c.business_name, s.step, s.status, s.sent_at, s.due_at, s.clicked_at, s.replied_at, s.error
     from sends s join contacts c on c.id = s.contact_id where s.campaign_id = $1
     order by coalesce(s.sent_at, s.due_at) desc limit 40`, [id]);

  // Preview with a real contact from the list (or a placeholder).
  const sampleParams: unknown[] = [];
  const sampleWhere = list ? whereFor(list.filter, sampleParams) : "false";
  const sample = await one<{ first_name: string | null; last_name: string | null; business_name: string | null; city: string | null; borough: string | null; trades: string[]; lang: string }>(
    `select first_name, last_name, business_name, city, borough, trades, lang from contacts c
     where c.email is not null and ${sampleWhere} order by fit_score desc limit 1`,
    sampleParams,
  );
  const previewContact = sample ?? { first_name: "Maria", last_name: "Lopez", business_name: "Lopez Renovations Corp", city: "Brooklyn", borough: "Brooklyn", trades: ["General Contracting"], lang: "en" };
  const previewSender = senders.find((x) => c.sender_ids.includes(x.id)) ?? { name: "Your Name", email: "you@example.com", signature: null };

  async function save(fd: FormData) {
    "use server";
    const d = readCampaignForm(fd);
    await q(
      `update campaigns set name=$2, code=$3, list_id=$4, sender_ids=$5::int[], daily_cap=$6, track_opens=$7, design=$8, steps=$9::jsonb, updated_at=now() where id=$1`,
      [id, d.name, d.code, d.list_id, `{${d.sender_ids.join(",")}}`, d.daily_cap, d.track_opens, d.design, pgJson(d.steps)],
    );
    redirect(`/blast/campaigns/${id}?msg=Saved`);
  }
  async function setStatus(fd: FormData) {
    "use server";
    const st = String(fd.get("status"));
    if (!["draft", "active", "paused", "done"].includes(st)) return;
    await q(`update campaigns set status = $2, updated_at = now() where id = $1`, [id, st]);
    redirect(`/blast/campaigns/${id}?msg=${encodeURIComponent(`Campaign ${st}`)}`);
  }
  async function doEnroll(fd: FormData) {
    "use server";
    const n = Number(fd.get("limit")) || undefined;
    let m: string;
    try {
      m = `Enrolled ${await enroll(id, n)} contacts`;
    } catch (e) {
      m = e instanceof Error ? e.message : "Enroll failed";
    }
    redirect(`/blast/campaigns/${id}?msg=${encodeURIComponent(m)}`);
  }
  async function unenroll() {
    "use server";
    const r = await q(`delete from sends where campaign_id = $1 and status = 'queued' and step = 0 returning id`, [id]);
    redirect(`/blast/campaigns/${id}?msg=${encodeURIComponent(`Removed ${r.length} queued first emails`)}`);
  }

  // Sends what's due for this campaign now instead of waiting for the
  // scheduler. Skips the weekday-hours window; every other rule still holds.
  async function sendNow() {
    "use server";
    const r = await runTick({ force: true, campaignId: id });
    const lines = (r.report ?? []).map((x) => `${x.sender}: ${x.sent ?? 0} sent${x.note ? ` (${x.note})` : x.mode === "smtp" ? "" : " (dry run, nothing left the building)"}`);
    redirect(`/blast/campaigns/${id}?tab=sends&msg=${encodeURIComponent(lines.join(" · ") || "No active mailbox")}`);
  }

  const reached = s.reached ?? 0;

  return (
    <>
      <PageTitle title={c.name} sub={<>Code <code>{c.code}</code> · list: {list?.name ?? "none"} · <Badge tone={c.status === "active" ? "good" : c.status === "paused" ? "warn" : "plain"}>{c.status}</Badge></>}>
        <Link className={btnGhost} href="/blast/campaigns">← Campaigns</Link>
        {["active", "paused", "done"].filter((x) => x !== c.status).map((st) => (
          <form key={st} action={setStatus}><input type="hidden" name="status" value={st} />
            <button className={st === "active" ? btnDark : btnGhost}>{st === "active" ? "Activate" : st === "paused" ? "Pause" : "Mark done"}</button>
          </form>
        ))}
      </PageTitle>
      {msg && <div className="mb-6"><Warning>{msg}</Warning></div>}
      {c.status === "active" && !c.sender_ids.length && <div className="mb-6"><Warning>Active but no mailbox selected. Nothing will send.</Warning></div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="Enrolled" value={fmt(s.enrolled)} sub={`${fmt(s.queued)} queued`} />
        <Stat label="Reached" value={fmt(reached)} sub={`${fmt(s.sent)} emails`} />
        <Stat label="Opened (est.)" value={c.track_opens ? fmt(s.opened) : "off"} />
        <Stat label="Clicked" value={fmt(s.clicked)} sub={pct(s.clicked, reached)} />
        <Stat label="Landed" value={fmt(s.landed)} sub="visitors" />
        <Stat label="Joined" value={fmt(s.joined)} sub={`${pct(s.joined, reached)} · ${fmt(s.joined_page)} page · ${fmt(s.joined_app)} app`} tone="yellow" />
        <Stat label="Store clicks" value={fmt(s.app)} sub={`${fmt(s.in_app)} now in the app`} tone="black" />
        <Stat label="Replied" value={fmt(s.replied)} sub={`${pct(s.bounced, s.sent)} bounce · ${pct(s.unsubs, reached)} unsub`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Enroll contacts">
          <p className="text-sm">{list ? <><strong>{fmt(avail.sendable)}</strong> of {fmt(avail.total)} in “{list.name}” can be enrolled now (verified, never contacted, not suppressed).</> : "Choose a list below first."}</p>
          <form action={doEnroll} className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <label className={label}>How many (best fit first)</label>
              <input name="limit" type="number" min={1} defaultValue={Math.min(200, avail.sendable || 200)} className={input} />
            </div>
            <button className={btn} disabled={!list}>Enroll</button>
          </form>
          <p className="mt-3 text-xs text-black/60">Start with a pilot of ~200, check replies and bounces, then enroll more.</p>
          {(s.queued ?? 0) > 0 && (
            <div className="mt-3 flex items-center gap-4">
              {c.status === "active" && <form action={sendNow}><button className={btnDark}>Send {fmt(s.queued)} due now</button></form>}
              <form action={unenroll}><button className="text-xs underline">Remove queued first emails</button></form>
            </div>
          )}
        </Card>
        <Card title="By email">
          <Table head={["#", "Sent", "Clicked", "Replied"]}>
            {perStep.map((p) => (
              <tr key={p.step}><td>{p.step + 1}</td><td>{fmt(p.sent)}</td><td>{fmt(p.clicked)}</td><td>{fmt(p.replied)}</td></tr>
            ))}
          </Table>
        </Card>
        <Card title="Health">
          <ul className="grid gap-1 text-sm">
            <li>Stopped (replied / signed up / suppressed): <strong>{fmt(s.stopped)}</strong></li>
            <li>Failed: <strong>{fmt(s.failed)}</strong></li>
            <li>Bounced: <strong>{fmt(s.bounced)}</strong> ({pct(s.bounced, s.sent)}; keep under 2%)</li>
            <li>Unsubscribed: <strong>{fmt(s.unsubs)}</strong> ({pct(s.unsubs, reached)})</li>
          </ul>
        </Card>
      </div>

      <div className="mb-3 mt-10 flex gap-2">
        {[["preview", "Preview"], ["edit", "Edit emails"], ["sends", "Recent sends"]].map(([k, t]) => (
          <Link key={k} href={`?tab=${k}`} className={(tab ?? "preview") === k ? btnDark : btnGhost}>{t}</Link>
        ))}
      </div>

      {(tab ?? "preview") === "preview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {c.steps.map((_, i) =>
            (["en", "es"] as const).map((lng) => {
              if (lng === "es" && !c.steps[i].body_es) return null;
              const r = renderEmail({ steps: c.steps, step: i, contact: { ...previewContact, lang: lng }, sender: previewSender, token: "PREVIEW", trackOpens: false, design: c.design });
              return (
                <Card key={`${i}-${lng}`} title={<>Email {i + 1} · {lng.toUpperCase()} {i > 0 && <span className="font-normal normal-case tracking-normal">· {c.steps[i].delay_days} days later</span>}</>}>
                  {lng === "en" && <a href={`/blast/campaigns/${id}/eml?step=${i}`} className="float-right text-xs underline">Open in Mail (.eml)</a>}
                  <p className="text-sm"><span className="text-black/60">From:</span> {previewSender.name} &lt;{previewSender.email}&gt;<br /><span className="text-black/60">Subject:</span> <strong>{r.subject}</strong></p>
                  {c.design === "branded" && r.html ? (
                    <iframe title={`Email ${i + 1} ${lng}`} srcDoc={r.html} className="mt-3 h-[900px] w-full border-t-2 border-black" />
                  ) : (
                    <pre className="mt-3 whitespace-pre-wrap border-t-2 border-black pt-3 font-sans text-sm leading-relaxed">{r.text}</pre>
                  )}
                </Card>
              );
            }),
          )}
          {!c.steps.length && <p className="text-sm">No emails yet. Use Edit.</p>}
        </div>
      )}

      {tab === "edit" && <CampaignForm action={save} draft={c} lists={lists} senders={senders} submitLabel="Save campaign" />}

      {tab === "sends" && (
        <Table head={["Contact", "Email #", "Status", "When", "Clicked", "Replied"]}>
          {recent.map((r) => (
            <tr key={r.id}>
              <td><Link className="underline" href={`/blast/contacts/${r.contact_id}`}>{r.business_name ?? r.email}</Link><div className="text-xs text-black/60">{r.email}</div></td>
              <td>{r.step + 1}</td>
              <td><Badge tone={r.status === "sent" ? "dark" : r.status === "failed" ? "bad" : "plain"}>{r.status}</Badge>{r.error && <div className="text-xs text-black/60">{r.error}</div>}</td>
              <td className="whitespace-nowrap">{r.sent_at ? when(r.sent_at) : `due ${when(r.due_at)}`}</td>
              <td>{when(r.clicked_at)}</td>
              <td>{when(r.replied_at)}</td>
            </tr>
          ))}
          {!recent.length && <tr><td colSpan={6} className="py-6 text-center text-black/60">Nothing yet.</td></tr>}
        </Table>
      )}
    </>
  );
}
