import Link from "next/link";
import { q, one } from "@/lib/db";
import { config } from "@/lib/config";
import { warmupCap } from "@/lib/mail/tick";
import { joinedSql } from "@/lib/funnel";
import { Badge, Card, PageTitle, Stat, Table, Warning, fmt, pct, when } from "@/components/blast/ui";

/**
 * Email campaigns only. dayworker.co's ordinary traffic and sign-ups aren't
 * counted here (they belong to the site's own admin); everything below is
 * credited to a campaign: an email link, or a campaign's ?c= code.
 */

export default async function Dashboard() {
  const totals = await one<Record<string, number>>(`
    select
      count(*) filter (where email is not null)::int as with_email,
      count(*) filter (where email is null)::int as phone_only,
      count(*) filter (where email is not null and verify_status in ('valid','risky') and stage = 'new'
        and not exists (select 1 from suppressions s where s.email = contacts.email))::int as ready,
      count(*) filter (where verify_status = 'unverified' and email is not null)::int as unverified,
      (select count(*)::int from suppressions) as suppressed
    from contacts`);

  const f = await one<Record<string, number>>(`
    with w as (select now() - interval '30 days' as since)
    select
      (select count(*)::int from sends, w where sent_at > w.since) as sent,
      (select count(distinct contact_id)::int from sends, w where sent_at > w.since) as reached,
      (select count(distinct contact_id)::int from sends, w where sent_at > w.since and clicked_at is not null) as clicked,
      (select count(distinct contact_id)::int from events, w where type = 'page_view' and send_id is not null and created_at > w.since) as visited,
      (select count(*)::int from registrations, w where campaign_id is not null and created_at > w.since) as registrations,
      (select count(*)::int from registrations, w where campaign_id is null and created_at > w.since) as site_signups,
      (select count(distinct coalesce(visitor_id, contact_id::text))::int from events, w where type = 'app_click' and campaign_id is not null and created_at > w.since) as app_clicks,
      (select count(distinct contact_id)::int from events, w where type = 'app_account' and meta->>'via' = 'app' and campaign_id is not null and created_at > w.since) as joined_app,
      (select count(distinct contact_id)::int from events, w where type = 'app_account' and campaign_id is not null and created_at > w.since) as in_app,
      (select count(*)::int from sends, w where replied_at > w.since) as replies,
      (select count(*)::int from sends, w where bounced_at > w.since) as bounces,
      (select count(*)::int from events, w where type = 'unsubscribe' and created_at > w.since) as unsubs`);

  // Which way people from the emails choose to join, and how far each path
  // gets (30 days). Every app button but the one after sign-up is the app path.
  const paths = await one<Record<string, number>>(`
    with w as (select now() - interval '30 days' as since),
    e as (select * from events, w where campaign_id is not null and created_at > w.since)
    select
      (select count(distinct coalesce(visitor_id, contact_id::text))::int from e where type = 'path_select' and meta->>'path' = 'app') as chose_app,
      (select count(distinct coalesce(visitor_id, contact_id::text))::int from e where type = 'app_click' and meta->>'from' not in ('success', 'qr_success')) as store_clicks,
      (select count(distinct contact_id)::int from e where type = 'app_account' and meta->>'via' = 'app') as app_accounts,
      (select count(distinct coalesce(visitor_id, contact_id::text))::int from e where type = 'path_select' and meta->>'path' = 'form') as chose_form,
      (select count(distinct coalesce(visitor_id, contact_id::text))::int from e where type = 'form_start') as form_starts,
      (select count(*)::int from registrations, w where campaign_id is not null and created_at > w.since) as page_signups,
      (select count(distinct coalesce(visitor_id, contact_id::text))::int from e where type = 'app_click' and meta->>'from' in ('success', 'qr_success')) as page_store_clicks,
      (select count(distinct contact_id)::int from e where type = 'app_account' and meta->>'via' = 'page') as page_in_app`);

  const campaigns = await q<Record<string, number | string>>(`
    select c.id, c.name, c.code, c.status,
      (select count(distinct contact_id)::int from sends where campaign_id = c.id) as enrolled,
      (select count(*)::int from sends where campaign_id = c.id and step = 0 and status = 'sent') as reached,
      (select count(*)::int from sends where campaign_id = c.id and status = 'sent') as sent,
      (select count(*)::int from sends where campaign_id = c.id and status = 'queued') as queued,
      (select count(distinct contact_id)::int from sends where campaign_id = c.id and clicked_at is not null) as clicked,
      ${joinedSql("c.id")} as joined,
      (select count(distinct coalesce(visitor_id, contact_id::text))::int from events where campaign_id = c.id and type = 'app_click') as app,
      (select count(*)::int from sends where campaign_id = c.id and replied_at is not null) as replies,
      (select count(*)::int from sends where campaign_id = c.id and bounced_at is not null) as bounces,
      (select count(*)::int from events where campaign_id = c.id and type = 'unsubscribe') as unsubs
    from campaigns c order by c.id desc`);

  const days = await q<{ d: string; sent: number; landed: number; joined: number }>(`
    with d as (select generate_series(current_date - 13, current_date, interval '1 day')::date as d)
    select to_char(d.d, 'Mon DD') as d,
      (select count(*)::int from sends where sent_at::date = d.d) as sent,
      (select count(distinct contact_id)::int from events where type = 'page_view' and send_id is not null and created_at::date = d.d) as landed,
      (select count(*)::int from registrations where campaign_id is not null and created_at::date = d.d)
        + (select count(*)::int from events where type = 'app_account' and meta->>'via' = 'app' and campaign_id is not null and created_at::date = d.d) as joined
    from d order by d.d`);
  const max = Math.max(1, ...days.flatMap((x) => [x.sent, x.landed, x.joined]));

  // Who to follow up with: the latest people to answer, join or opt out.
  const activity = await q<{ at: Date; what: string; contact_id: number; name: string | null; business_name: string | null; email: string | null }>(`
    select x.at, x.what, c.id as contact_id, nullif(concat_ws(' ', c.first_name, c.last_name), '') as name, c.business_name, c.email
    from (
      select replied_at as at, 'replied' as what, contact_id from sends where replied_at is not null
      union all
      select created_at, 'signed up on the site', contact_id from registrations where campaign_id is not null
      union all
      select created_at,
        case type when 'app_click' then 'tapped app download' when 'app_account' then 'has an app account' else 'unsubscribed' end,
        contact_id
      from events where type in ('app_click', 'app_account', 'unsubscribe') and campaign_id is not null
    ) x join contacts c on c.id = x.contact_id
    order by x.at desc limit 10`);

  const senders = await q<{ id: number; email: string; mode: string; status: string; daily_max: number; warmup_start: string; today: number }>(`
    select s.*, (select count(*)::int from sends where sender_id = s.id
      and sent_at >= (date_trunc('day', now() at time zone 'America/New_York') at time zone 'America/New_York')) as today
    from senders s order by id`);

  const t = totals ?? {};
  const x = f ?? {};
  const warnings: React.ReactNode[] = [];
  if (!config.sendingOn) warnings.push(<>Sending is on hold: nothing goes out, dry runs included. Set <code>SENDING=on</code> on Vercel when the mailboxes are ready.</>);
  if (!config.companyAddress) warnings.push(<>No postal address. Set <code>COMPANY_ADDRESS</code>. CAN-SPAM requires one in every email.</>);
  if (!senders.some((s) => s.mode === "smtp")) warnings.push(<>No live mailbox yet. Everything sends in dry-run mode. <Link className="underline" href="/blast/senders">Set up a mailbox</Link>.</>);
  if (!config.appleProviderToken) warnings.push(<>App Store installs aren&rsquo;t attributed yet. Add <code>APPLE_PROVIDER_TOKEN</code> from App Store Connect → Analytics → Campaigns.</>);

  return (
    <>
      <PageTitle title="Email campaigns" sub="Last 30 days, email traffic only: sent → clicked → visited dayworker.co → signed up or downloaded the app." />
      {warnings.length > 0 && <div className="mb-8 grid gap-2">{warnings.map((w, i) => <Warning key={i}>{w}</Warning>)}</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="Emails sent" value={fmt(x.sent)} sub={`${fmt(x.reached)} ${x.reached === 1 ? "person" : "people"}`} />
        <Stat label="Clicked" value={fmt(x.clicked)} sub={pct(x.clicked, x.reached) + " of reached"} />
        <Stat label="Visited site" value={fmt(x.visited)} sub={pct(x.visited, x.reached) + " of reached"} />
        <Stat label="Replies" value={fmt(x.replies)} sub={pct(x.replies, x.reached)} />
        <Stat label="Joined" value={fmt(x.registrations + x.joined_app)} sub={`${fmt(x.registrations)} on page · ${fmt(x.joined_app)} in app`} tone="yellow" />
        <Stat label="Store clicks" value={fmt(x.app_clicks)} sub="tapped download / scanned QR" tone="black" />
        <Stat label="In the app" value={fmt(x.in_app)} sub="matched app accounts" />
        <Stat label="Bounce · unsub" value={`${pct(x.bounces, x.sent)} · ${pct(x.unsubs, x.reached)}`} sub="keep < 2% · < 1%" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <Card title="Last 14 days" className="xl:col-span-2">
          <div className="flex h-48 items-end gap-1.5">
            {days.map((d) => (
              <div key={d.d} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-40 w-full items-end justify-center gap-[2px]">
                  {[["sent", "bg-black"], ["landed", "bg-[#9a9a9a]"], ["joined", "bg-yellow border border-black"]].map(([k, cls]) => (
                    <div key={k} title={`${d.d} ${k}: ${d[k as "sent"]}`} className={`w-1/3 ${cls}`} style={{ height: `${(d[k as "sent"] / max) * 100}%`, minHeight: d[k as "sent"] ? 2 : 0 }} />
                  ))}
                </div>
                <span className="text-[9px] text-black/60">{d.d.slice(4)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs">
            <span><span className="mr-1 inline-block h-3 w-3 bg-black align-middle" />Sent</span>
            <span><span className="mr-1 inline-block h-3 w-3 bg-[#9a9a9a] align-middle" />Visited site</span>
            <span><span className="mr-1 inline-block h-3 w-3 border border-black bg-yellow align-middle" />Joined (page + app)</span>
          </div>
        </Card>
        <Card title="How they choose to join">
          <PathSplit p={paths ?? {}} />
        </Card>
      </div>

      <h2 className="mb-3 mt-10 text-xs font-extrabold uppercase tracking-[0.16em]">Campaign funnels</h2>
      <Table head={["Campaign", "Status", "Enrolled", "Reached", "Queued", "Clicked", "Joined", "Store clicks", "Replies", "Bounce", "Unsub"]}>
        {campaigns.map((c) => {
          const reached = Number(c.reached);
          return (
            <tr key={c.id}>
              <td><Link className="font-bold underline" href={`/blast/campaigns/${c.id}`}>{c.name}</Link><div className="text-xs text-black/60">{c.code}</div></td>
              <td><Badge tone={c.status === "active" ? "good" : c.status === "paused" ? "warn" : "plain"}>{c.status}</Badge></td>
              <td>{fmt(Number(c.enrolled))}</td>
              <td>{fmt(reached)}</td>
              <td>{fmt(Number(c.queued))}</td>
              <td>{fmt(Number(c.clicked))} <span className="text-black/50">{pct(Number(c.clicked), reached)}</span></td>
              <td className="font-bold">{fmt(Number(c.joined))} <span className="font-normal text-black/50">{pct(Number(c.joined), reached)}</span></td>
              <td>{fmt(Number(c.app))}</td>
              <td>{fmt(Number(c.replies))} <span className="text-black/50">{pct(Number(c.replies), reached)}</span></td>
              <td>{pct(Number(c.bounces), Number(c.sent))}</td>
              <td>{pct(Number(c.unsubs), reached)}</td>
            </tr>
          );
        })}
        {!campaigns.length && <tr><td colSpan={11} className="py-6 text-center text-black/60">No campaigns yet. <Link className="underline" href="/blast/campaigns/new">Create one</Link>.</td></tr>}
      </Table>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card title="Contacts">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-black/60">With email</dt><dd className="text-2xl font-extrabold">{fmt(t.with_email)}</dd></div>
            <div><dt className="text-black/60">Ready to send</dt><dd className="text-2xl font-extrabold">{fmt(t.ready)}</dd></div>
            <div><dt className="text-black/60">Unverified</dt><dd className="text-2xl font-extrabold">{fmt(t.unverified)}</dd></div>
            <div><dt className="text-black/60">Phone only</dt><dd className="text-2xl font-extrabold">{fmt(t.phone_only)}</dd></div>
            <div><dt className="text-black/60">Suppressed</dt><dd className="text-2xl font-extrabold">{fmt(t.suppressed)}</dd></div>
          </dl>
          <Link href="/blast/data" className="mt-4 inline-block text-xs font-extrabold uppercase tracking-[0.12em] underline">Sync & import →</Link>
        </Card>
        <Card title="Latest from your emails">
          {activity.length ? (
            <ul className="grid gap-2 text-sm">
              {activity.map((a, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-x-3 border-b border-black/10 pb-1">
                  <span>
                    <Link className="font-bold underline" href={`/blast/contacts/${a.contact_id}`}>{a.name ?? a.business_name ?? a.email}</Link>{" "}
                    <Badge tone={a.what === "unsubscribed" ? "bad" : a.what === "replied" ? "warn" : "dark"}>{a.what}</Badge>
                  </span>
                  <span className="text-xs text-black/60">{when(a.at)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-black/60">No replies or sign-ups yet.</p>}
          <p className="mt-4 text-xs text-black/60">
            {fmt(x.site_signups)} other sign-up{x.site_signups === 1 ? "" : "s"} came from the site itself, not email.{" "}
            <Link className="underline" href="/blast/registrations?src=site">See them</Link>
          </p>
        </Card>
        <Card title="Mailbox health">
          {senders.length ? (
            <ul className="grid gap-2 text-sm">
              {senders.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-1">
                  <span>{s.email} <Badge tone={s.mode === "smtp" ? "dark" : "plain"}>{s.mode === "smtp" ? "live" : "dry run"}</Badge> {s.status !== "active" && <Badge tone="bad">{s.status}</Badge>}</span>
                  <span className="tabular-nums">{s.today} / {warmupCap(s)} today</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-black/60">No mailboxes yet.</p>}
        </Card>
      </div>
    </>
  );
}

/** Side-by-side funnels for the two ways in. */
function PathSplit({ p }: { p: Record<string, number> }) {
  const chose = (p.chose_app ?? 0) + (p.chose_form ?? 0);
  const rows: [string, string, [string, number][]][] = [
    ["App", "bg-black", [["Chose get the app & sign up", p.chose_app], ["Tapped download / scanned", p.store_clicks], ["Account in app", p.app_accounts]]],
    ["Sign-up form", "bg-yellow border border-black", [["Chose sign up now", p.chose_form], ["Started the form", p.form_starts], ["Signed up", p.page_signups], ["Then tapped download", p.page_store_clicks], ["Account in app", p.page_in_app]]],
  ];
  return (
    <div className="grid gap-5 text-sm">
      <div>
        <div className="flex h-3 w-full border border-black">
          <div className="bg-black" style={{ width: `${chose ? (p.chose_app / chose) * 100 : 50}%` }} />
          <div className="bg-yellow" style={{ width: `${chose ? (p.chose_form / chose) * 100 : 50}%` }} />
        </div>
        <p className="mt-1 text-xs text-black/60">{chose ? `${pct(p.chose_app, chose)} pick the app · ${pct(p.chose_form, chose)} pick the form` : "No choices yet."}</p>
      </div>
      {rows.map(([name, swatch, steps]) => (
        <div key={name}>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.12em]"><span className={`mr-1 inline-block h-3 w-3 align-middle ${swatch}`} />{name}</p>
          <ul className="grid gap-1">
            {steps.map(([label, n]) => (
              <li key={label} className="flex justify-between border-b border-black/10 pb-1"><span>{label}</span><strong className="tabular-nums">{fmt(n)}</strong></li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-xs text-black/60">App accounts appear after you import the app&apos;s user export (Data &amp; setup → App accounts).</p>
    </div>
  );
}
