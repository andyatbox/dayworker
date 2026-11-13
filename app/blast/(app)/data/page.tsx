import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import { config } from "@/lib/config";
import { SOURCES, runSource, type SourceKey } from "@/lib/lists/run";
import { importCsv } from "@/lib/lists/csv";
import { runTick } from "@/lib/mail/tick";
import { checkInboxes } from "@/lib/mail/inbox";
import { Badge, Card, PageTitle, Table, Warning, btn, btnDark, btnGhost, input, label, when } from "@/components/blast/ui";

export default async function Data({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const runs = await q<{ id: number; source: string; status: string; stats: Record<string, unknown>; error: string | null; started_at: Date; finished_at: Date | null }>(
    `select * from sync_runs order by id desc limit 15`,
  );
  const bySource = await q<{ source: string; n: number; with_email: number }>(
    `select source, count(*)::int as n, count(email)::int as with_email from contacts group by source order by 2 desc`,
  );

  async function sync(fd: FormData) {
    "use server";
    const key = String(fd.get("source")) as SourceKey;
    let m: string;
    try {
      m = `${SOURCES[key].label}: ${JSON.stringify(await runSource(key))}`;
    } catch (e) {
      m = `Failed: ${e instanceof Error ? e.message : e}`;
    }
    redirect(`/blast/data?msg=${encodeURIComponent(m)}`);
  }
  async function upload(fd: FormData) {
    "use server";
    const file = fd.get("file") as File | null;
    if (!file || !file.size) redirect("/blast/data?msg=Choose%20a%20CSV%20file");
    let m: string;
    try {
      const stats = await importCsv(await file!.text(), {
        mode: fd.get("mode") === "suppress" ? "suppress" : fd.get("mode") === "app" ? "app" : "contacts",
        source: String(fd.get("source") || "csv").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
        tag: String(fd.get("tag") || "").trim() || undefined,
      });
      m = `Imported ${file!.name}: ${JSON.stringify(stats)}`;
    } catch (e) {
      m = `Import failed: ${e instanceof Error ? e.message : e}`;
    }
    redirect(`/blast/data?msg=${encodeURIComponent(m)}`);
  }
  async function tick() {
    "use server";
    const r = await runTick({ force: true });
    redirect(`/blast/data?msg=${encodeURIComponent(`Send run: ${JSON.stringify(r)}`)}`);
  }
  async function inbox() {
    "use server";
    const r = await checkInboxes();
    redirect(`/blast/data?msg=${encodeURIComponent(`Inbox check: ${JSON.stringify(r)}`)}`);
  }

  const checks: [string, boolean, string][] = [
    ["Sending switched on (SENDING=on)", config.sendingOn, config.sendingOn ? "on" : "on hold: nothing is sent"],
    ["Postal address (COMPANY_ADDRESS)", !!config.companyAddress, "required by CAN-SPAM"],
    ["Public URL (SITE_URL, https://www.dayworker.co)", !config.siteUrl.includes("localhost"), config.siteUrl],
    ["App Store campaign token (APPLE_PROVIDER_TOKEN)", !!config.appleProviderToken, "App Store Connect → Analytics → Campaigns"],
    ["Production database (DATABASE_URL)", !!process.env.DATABASE_URL, process.env.DATABASE_URL ? "Postgres" : "local PGlite (.data/pglite)"],
    ["Cron secret (CRON_SECRET)", !!process.env.CRON_SECRET, "protects /api/cron/*"],
    ["Blast password (BLAST_PASSWORD)", !!process.env.BLAST_PASSWORD, "signs you in to /blast"],
  ];

  return (
    <>
      <PageTitle title="Data & setup" sub="Pull contractor lists, import CSVs, run the sender by hand, and check what's left to configure." />
      {msg && <div className="mb-6 break-all"><Warning>{msg}</Warning></div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Contractor sources">
          <div className="grid gap-3">
            {(Object.keys(SOURCES) as SourceKey[]).map((k) => (
              <form key={k} action={sync} className="flex items-start justify-between gap-4 border-b border-black/10 pb-3">
                <div><p className="font-bold">{SOURCES[k].label}</p><p className="text-xs text-black/60">{SOURCES[k].detail}</p></div>
                <input type="hidden" name="source" value={k} />
                <button className={btn}>Run</button>
              </form>
            ))}
          </div>
          <p className="mt-3 text-xs text-black/60">Production runs these nightly via <code>/api/cron/sync</code>. Long Island & Jersey City lists arrive as FOIL / OPRA spreadsheets or Google Places exports; import them below.</p>
        </Card>

        <Card title="Import CSV">
          <form action={upload} className="grid gap-3">
            <div><label className={label}>File (.csv; save Excel files as CSV)</label><input name="file" type="file" accept=".csv,text/csv" className={input} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label}>Import as</label>
                <select name="mode" className={input}><option value="contacts">Contacts</option><option value="suppress">Do-not-email list</option><option value="app">App accounts (sign-ups in the app)</option></select>
              </div>
              <div><label className={label}>Source name</label><input name="source" placeholder="nassau-foil" className={input} /></div>
              <div><label className={label}>Tag / reason</label><input name="tag" placeholder="app-users" className={input} /></div>
            </div>
            <button className={btn}>Import</button>
          </form>
          <p className="mt-3 text-xs text-black/60">Columns are matched by name (email, first name, business, phone, zip, category…). Import the Suffolk 2025 list as <strong>Do-not-email</strong> so it never gets a cold invite.</p>
          <p className="mt-2 text-xs text-black/60"><strong>App accounts:</strong> the app&apos;s user export (an email column; a created date and role if available). It counts sign-ups that happened in the app as conversions, credits the campaign that emailed them, stops their emails and keeps every app user off cold email. Re-import weekly; each person is counted once.</p>
        </Card>

        <Card title="Contacts by source">
          <Table head={["Source", "Contacts", "With email"]}>
            {bySource.map((s) => <tr key={s.source}><td>{s.source}</td><td>{s.n.toLocaleString()}</td><td>{s.with_email.toLocaleString()}</td></tr>)}
          </Table>
        </Card>

        <Card title="Sending engine">
          <p className="text-sm">Production calls <code>/api/cron/tick</code> every 10–15 minutes (free GitHub Actions schedule, see <code>.github/workflows/cron.yml</code>). Each run sends a few emails per mailbox inside weekday business hours, then checks inboxes for replies and bounces.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={tick}><button className={btnDark}>Run send now (ignores hours)</button></form>
            <form action={inbox}><button className={btnGhost}>Check inboxes now</button></form>
          </div>
        </Card>

        <Card title="Setup checklist" className="lg:col-span-2">
          <ul className="grid gap-2 text-sm md:grid-cols-2">
            {checks.map(([name, ok, note]) => (
              <li key={name} className="flex items-start gap-2"><Badge tone={ok ? "good" : "warn"}>{ok ? "ok" : "todo"}</Badge><span><strong>{name}</strong><br /><span className="text-xs text-black/60">{note}</span></span></li>
            ))}
          </ul>
        </Card>
      </div>

      <h2 className="mb-3 mt-10 text-xs font-extrabold uppercase tracking-[0.16em]">Recent runs</h2>
      <Table head={["Started", "Source", "Status", "Result"]}>
        {runs.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap">{when(r.started_at)}</td>
            <td>{r.source}</td>
            <td><Badge tone={r.status === "done" ? "good" : r.status === "failed" ? "bad" : "warn"}>{r.status}</Badge></td>
            <td className="text-xs">{r.error ?? JSON.stringify(r.stats)}</td>
          </tr>
        ))}
        {!runs.length && <tr><td colSpan={4} className="py-6 text-center text-black/60">No runs yet.</td></tr>}
      </Table>
    </>
  );
}
