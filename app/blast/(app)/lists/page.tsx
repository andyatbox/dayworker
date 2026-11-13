import Link from "next/link";
import { redirect } from "next/navigation";
import { q, pgJson } from "@/lib/db";
import { sendableCount } from "@/lib/campaigns";
import type { Filter } from "@/lib/segments";
import { Badge, PageTitle, Table, btnGhost, fmt } from "@/components/blast/ui";

/** Starting segments, created on first visit if there are no lists yet. */
const STARTERS: { name: string; description: string; filter: Filter }[] = [
  { name: "NYC small shops: home-improvement GCs", description: "DOB GCs that also hold a DCWP home-improvement license. Residential, mostly non-union. Best first send.", filter: { region: "nyc", tag: "hic", hasEmail: "yes" } },
  { name: "NYC general contractors, free-mail", description: "One-truck to 20-person shops (Gmail/Yahoo/AOL).", filter: { region: "nyc", tag: "small-shop", trade: "General Contracting" } },
  { name: "Construction superintendents (all regions)", description: "The people who actually line up day crews.", filter: { trade: "Construction Superintendent" } },
  { name: "Long Island contractors", description: "DOB licensees based on Long Island.", filter: { region: "long-island" } },
  { name: "Jersey City / Hudson contractors", description: "DOB licensees based in Hudson County.", filter: { region: "jersey-city" } },
  { name: "Master plumbers, NYC", description: "Licensed master plumbers. Busy shops that run short on helpers.", filter: { region: "nyc", trade: "Plumbing" } },
  { name: "Electrical firms, NYC", description: "Licensed electrical contractors.", filter: { region: "nyc", trade: "Electrical" } },
];

export default async function Lists() {
  let lists = await q<{ id: number; name: string; description: string | null; filter: Filter; created_at: Date }>(`select * from lists order by id`);
  if (!lists.length) {
    for (const s of STARTERS) await q(`insert into lists (name, description, filter) values ($1, $2, $3::jsonb)`, [s.name, s.description, pgJson(s.filter)]);
    lists = await q(`select * from lists order by id`);
  }
  const counts = await Promise.all(lists.map((l) => sendableCount(l.filter)));

  async function remove(formData: FormData) {
    "use server";
    await q(`delete from lists where id = $1`, [Number(formData.get("id"))]);
    redirect("/blast/lists");
  }

  return (
    <>
      <PageTitle title="Lists" sub="Saved filters. A campaign enrolls whoever in its list is sendable at that moment. Make new lists from the Contacts page." >
        <Link href="/blast/contacts" className={btnGhost}>Build a list in Contacts →</Link>
      </PageTitle>
      <Table head={["List", "Filter", "Matches", "Sendable now", ""]}>
        {lists.map((l, i) => (
          <tr key={l.id}>
            <td><strong>{l.name}</strong>{l.description && <div className="text-xs text-black/60">{l.description}</div>}</td>
            <td className="text-xs">{Object.entries(l.filter).map(([k, v]) => <span key={k} className="mr-1"><Badge>{k}: {String(v)}</Badge></span>)}</td>
            <td className="tabular-nums">{fmt(counts[i].total)}</td>
            <td className="tabular-nums font-bold">{fmt(counts[i].sendable)}</td>
            <td className="whitespace-nowrap">
              <Link className="mr-3 text-xs underline" href={`/blast/contacts?${new URLSearchParams(l.filter as Record<string, string>)}`}>View</Link>
              <form action={remove} className="inline"><input type="hidden" name="id" value={l.id} /><button className="text-xs underline">Delete</button></form>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
