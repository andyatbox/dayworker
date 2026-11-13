import Link from "next/link";
import { redirect } from "next/navigation";
import { q, one, pgJson } from "@/lib/db";
import { cleanFilter, whereFor, FILTER_KEYS, type Filter } from "@/lib/segments";
import { sendableCount } from "@/lib/campaigns";
import { Badge, PageTitle, Table, btn, btnGhost, input, label, fmt, stageLabel, stageTone } from "@/components/blast/ui";

const PAGE = 50;

const OPTIONS: Record<string, string[]> = {
  region: ["nyc", "long-island", "jersey-city", "nj", "other"],
  borough: ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"],
  stage: ["new", "contacted", "clicked", "replied", "registered", "app", "member", "unsubscribed", "bounced"],
  verify: ["unverified", "valid", "risky", "invalid", "no_email"],
  lang: ["en", "es"],
  hasEmail: ["yes", "no"],
};

export default async function Contacts({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const filter = cleanFilter(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const params: unknown[] = [];
  const where = whereFor(filter, params);

  const rows = await q<{
    id: number; email: string | null; first_name: string | null; last_name: string | null; business_name: string | null;
    region: string | null; borough: string | null; city: string | null; trades: string[]; source: string; fit_score: number;
    verify_status: string; stage: string; tags: string[]; lang: string;
  }>(
    `select id, email, first_name, last_name, business_name, region, borough, city, trades, source, fit_score, verify_status, stage, tags, lang
     from contacts c where ${where} order by fit_score desc, id limit ${PAGE} offset ${(page - 1) * PAGE}`,
    params,
  );
  const counts = await sendableCount(filter);
  const sources = await q<{ source: string }>(`select distinct source from contacts order by 1`);
  const tags = await q<{ tag: string }>(`select distinct unnest(tags) as tag from contacts order by 1`);

  async function saveList(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const f = cleanFilter(JSON.parse(String(formData.get("filter") ?? "{}")));
    if (!name) return;
    const l = await one<{ id: number }>(`insert into lists (name, filter) values ($1, $2::jsonb) returning id`, [name, pgJson(f)]);
    redirect(`/blast/lists?saved=${l!.id}`);
  }

  async function setLang(formData: FormData) {
    "use server";
    const f = cleanFilter(JSON.parse(String(formData.get("filter") ?? "{}")));
    const lang = formData.get("lang") === "es" ? "es" : "en";
    const p: unknown[] = [];
    const w = whereFor(f, p);
    p.push(lang);
    await q(`update contacts c set lang = $${p.length} where ${w}`, p);
    redirect(`/blast/contacts?${new URLSearchParams(f as Record<string, string>)}`);
  }

  const qs = (patch: Record<string, string | number>) => `?${new URLSearchParams({ ...(filter as Record<string, string>), ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) })}`;
  const sel = (name: keyof Filter, opts: string[]) => (
    <div>
      <label className={label}>{name}</label>
      <select name={name} defaultValue={filter[name] ?? ""} className={input}>
        <option value="">any</option>
        {opts.map((o) => <option key={o} value={o}>{name === "stage" ? stageLabel(o) : o}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <PageTitle title="Contacts" sub={<>{fmt(counts.total)} match · <strong>{fmt(counts.sendable)} sendable</strong> (has email, verified, never contacted, not suppressed)</>}>
        <a className={btnGhost} href={`/blast/export/contacts${qs({})}`}>Export CSV</a>
      </PageTitle>

      <form className="mb-4 grid grid-cols-2 gap-3 border-2 border-black bg-white p-4 md:grid-cols-4 xl:grid-cols-6">
        <div className="col-span-2">
          <label className={label}>search</label>
          <input name="q" defaultValue={filter.q} placeholder="name, business, email, zip" className={input} />
        </div>
        {sel("region", OPTIONS.region)}
        {sel("borough", OPTIONS.borough)}
        {sel("source", sources.map((s) => s.source))}
        {sel("stage", OPTIONS.stage)}
        {sel("verify", OPTIONS.verify)}
        {sel("tag", tags.map((t) => t.tag))}
        {sel("lang", OPTIONS.lang)}
        {sel("hasEmail", OPTIONS.hasEmail)}
        <div>
          <label className={label}>min fit</label>
          <input name="minFit" defaultValue={filter.minFit} className={input} inputMode="numeric" />
        </div>
        <div className="flex items-end gap-2">
          <button className={btn}>Filter</button>
          <Link href="/blast/contacts" className={btnGhost}>Reset</Link>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap gap-4">
        <form action={saveList} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="filter" value={JSON.stringify(filter)} />
          <div>
            <label className={label}>Save this filter as a list</label>
            <input name="name" placeholder="e.g. Brooklyn GCs, small shops" className={`${input} w-72`} />
          </div>
          <button className={btn}>Save list</button>
        </form>
        <form action={setLang} className="flex items-end gap-2">
          <input type="hidden" name="filter" value={JSON.stringify(filter)} />
          <div>
            <label className={label}>Set language for all {fmt(counts.total)}</label>
            <select name="lang" className={input}><option value="es">Spanish (es)</option><option value="en">English (en)</option></select>
          </div>
          <button className={btnGhost}>Apply</button>
        </form>
      </div>

      <Table head={["Contact", "Business", "Area", "Trades", "Source", "Fit", "Email", "Stage"]}>
        {rows.map((c) => (
          <tr key={c.id}>
            <td>
              <Link href={`/blast/contacts/${c.id}`} className="font-bold underline">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</Link>
              <div className="text-xs text-black/60">{c.email ?? "no email"}</div>
            </td>
            <td>{c.business_name ?? "—"}</td>
            <td className="whitespace-nowrap">{c.borough ?? c.city ?? "—"}<div className="text-xs text-black/60">{c.region}</div></td>
            <td className="max-w-[220px] text-xs">{c.trades.join(", ")}</td>
            <td className="text-xs">{c.source}{c.tags.includes("hic") && <> <Badge>hic</Badge></>}{c.tags.includes("es-likely") && <> <Badge>es?</Badge></>}{c.lang === "es" && <> <Badge tone="dark">ES</Badge></>}</td>
            <td className="tabular-nums">{c.fit_score}</td>
            <td><Badge tone={c.verify_status === "valid" ? "good" : c.verify_status === "invalid" ? "bad" : c.verify_status === "risky" ? "warn" : "plain"}>{c.verify_status}</Badge></td>
            <td><Badge tone={stageTone(c.stage)}>{stageLabel(c.stage)}</Badge></td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={8} className="py-8 text-center text-black/60">No contacts match. Pull lists in <Link className="underline" href="/blast/data">Data & setup</Link>.</td></tr>}
      </Table>

      <div className="mt-4 flex items-center gap-3 text-sm">
        {page > 1 && <Link className={btnGhost} href={qs({ page: page - 1 })}>← Prev</Link>}
        <span>Page {page} of {Math.max(1, Math.ceil(counts.total / PAGE))}</span>
        {page * PAGE < counts.total && <Link className={btnGhost} href={qs({ page: page + 1 })}>Next →</Link>}
      </div>
      <p className="mt-6 text-xs text-black/50">Filters: {FILTER_KEYS.filter((k) => filter[k]).map((k) => `${k}=${filter[k]}`).join(" · ") || "none"}</p>
    </>
  );
}
