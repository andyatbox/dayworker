import Link from "next/link";
import { q } from "@/lib/db";
import { Badge, PageTitle, Stat, Table, btnGhost, fmt, when } from "@/components/blast/ui";

/**
 * Everyone who used the sign-up form. The email campaigns' own sign-ups come
 * first; people who found dayworker.co by themselves are kept here too (there's
 * nowhere else to see them until the site's own admin), filtered apart.
 */
export default async function Registrations({ searchParams }: { searchParams: Promise<{ role?: string; src?: string }> }) {
  const { role, src } = await searchParams;
  const from = src === "email" || src === "site" ? src : null;
  const rows = await q<{
    id: number; contact_id: number | null; role: string; name: string; business_name: string | null; email: string; phone: string | null; zip: string;
    trades: string[]; crew_need: string | null; lang: string; consent_email: boolean; consent_sms: boolean; status: string; created_at: Date;
    code: string | null; referred_by: string | null; ref_code: string; invited: number;
  }>(
    `select r.*, c.code, (select count(*)::int from registrations x where x.referred_by = r.ref_code) as invited
     from registrations r left join campaigns c on c.id = r.campaign_id
     where ($1::text is null or r.role = $1)
       and ($2::text is null or ($2 = 'email') = (r.campaign_id is not null))
     order by r.id desc limit 500`,
    [role ?? null, from],
  );
  const totals = await q<{ role: string; email: boolean; n: number }>(
    `select role, campaign_id is not null as email, count(*)::int as n from registrations group by 1, 2`,
  );
  const n = (r?: string, email?: boolean) =>
    totals.filter((t) => (!r || t.role === r) && (email === undefined || t.email === email)).reduce((a, t) => a + t.n, 0);

  return (
    <>
      <PageTitle title="Sign-ups" sub="From the sign-up form on dayworker.co. Each one is ready to become an app account (same email).">
        <a className={btnGhost} href="/blast/export/registrations">Export CSV</a>
      </PageTitle>
      <div className="mb-6 grid grid-cols-2 gap-3 md:w-[1000px] md:grid-cols-5">
        <Link href="/blast/registrations"><Stat label="All" value={fmt(n())} /></Link>
        <Link href="?src=email"><Stat label="From email" value={fmt(n(undefined, true))} tone="yellow" /></Link>
        <Link href="?src=site"><Stat label="From the site" value={fmt(n(undefined, false))} sub="not from a campaign" /></Link>
        <Link href={`?role=contractor${from ? `&src=${from}` : ""}`}><Stat label="Contractors" value={fmt(n("contractor", from ? from === "email" : undefined))} /></Link>
        <Link href={`?role=worker${from ? `&src=${from}` : ""}`}><Stat label="Workers" value={fmt(n("worker", from ? from === "email" : undefined))} /></Link>
      </div>
      <Table head={["When", "Who", "Role", "ZIP", "Trades", "Need", "Source", "Crew invited", "Consent"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap">{when(r.created_at)}</td>
            <td>
              {r.contact_id ? <Link className="font-bold underline" href={`/blast/contacts/${r.contact_id}`}>{r.name}</Link> : <strong>{r.name}</strong>}
              <div className="text-xs text-black/60">{r.business_name ? `${r.business_name} · ` : ""}{r.email}{r.phone ? ` · ${r.phone}` : ""}</div>
            </td>
            <td><Badge tone={r.role === "contractor" ? "warn" : "plain"}>{r.role}</Badge> {r.lang === "es" && <Badge tone="dark">ES</Badge>}</td>
            <td>{r.zip}</td>
            <td className="max-w-[220px] text-xs">{r.trades.join(", ") || "—"}</td>
            <td className="text-xs">{r.crew_need ?? "—"}</td>
            <td className="text-xs">{r.code ? `email: ${r.code}` : r.referred_by ? `crew invite (${r.referred_by})` : "the site"}</td>
            <td className="tabular-nums">{r.invited}</td>
            <td className="text-xs">{r.consent_email ? "email" : ""}{r.consent_sms ? " · sms" : ""}</td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={9} className="py-8 text-center text-black/60">No sign-ups yet.</td></tr>}
      </Table>
    </>
  );
}
