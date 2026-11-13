import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { q, one } from "@/lib/db";
import { config } from "@/lib/config";
import { stopSequences, suppress } from "@/lib/track";
import { Badge, Card, PageTitle, Table, btn, btnGhost, input, label, stageLabel, stageTone, when } from "@/components/blast/ui";

type Contact = {
  id: number; email: string | null; first_name: string | null; last_name: string | null; business_name: string | null;
  phone: string | null; address: string | null; city: string | null; state: string | null; zip: string | null; region: string | null;
  borough: string | null; trades: string[]; license_type: string | null; license_number: string | null; license_status: string | null;
  source: string; lang: string; fit_score: number; verify_status: string; verify_reason: string | null; stage: string; tags: string[];
  notes: string | null; created_at: Date; last_contacted_at: Date | null;
};

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const c = await one<Contact>(`select * from contacts where id = $1`, [id]);
  if (!c) notFound();
  const suppressed = c.email ? await one<{ reason: string }>(`select reason from suppressions where email = $1`, [c.email]) : undefined;
  const sends = await q<{ id: number; step: number; status: string; token: string; subject: string | null; body: string | null; sent_at: Date | null; due_at: Date; clicked_at: Date | null; replied_at: Date | null; error: string | null; name: string }>(
    `select s.*, c.name from sends s join campaigns c on c.id = s.campaign_id where s.contact_id = $1 order by s.id`,
    [id],
  );
  const events = await q<{ type: string; created_at: Date; meta: Record<string, unknown>; path: string | null }>(
    `select type, created_at, meta, path from events where contact_id = $1 order by id desc limit 60`,
    [id],
  );
  const regs = await q<{ role: string; created_at: Date; trades: string[]; crew_need: string | null; ref_code: string }>(
    `select role, created_at, trades, crew_need, ref_code from registrations where contact_id = $1 order by id desc`,
    [id],
  );
  const invite = sends.find((s) => s.step === 0);

  async function update(formData: FormData) {
    "use server";
    await q(`update contacts set lang = $2, notes = $3, updated_at = now() where id = $1`, [id, formData.get("lang") === "es" ? "es" : "en", String(formData.get("notes") ?? "")]);
    redirect(`/blast/contacts/${id}`);
  }
  async function doSuppress() {
    "use server";
    if (!c?.email) return;
    await suppress(c.email, "manual", "admin");
    await q(`update contacts set stage = 'unsubscribed' where id = $1`, [id]);
    await stopSequences(id, "suppressed by admin");
    redirect(`/blast/contacts/${id}`);
  }
  async function markReplied() {
    "use server";
    await q(`update contacts set stage = 'replied' where id = $1 and stage in ('new','contacted','clicked')`, [id]);
    await q(`update sends set replied_at = coalesce(replied_at, now()) where contact_id = $1 and status = 'sent'`, [id]);
    await stopSequences(id, "replied (marked by admin)");
    redirect(`/blast/contacts/${id}`);
  }

  const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.business_name || c.email || `Contact ${id}`;

  return (
    <>
      <PageTitle title={name} sub={<>{c.business_name} · {c.email ?? "no email"} · <Badge tone={stageTone(c.stage)}>{stageLabel(c.stage)}</Badge> {suppressed && <Badge tone="bad">suppressed: {suppressed.reason}</Badge>}</>}>
        <Link className={btnGhost} href="/blast/contacts">← Contacts</Link>
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Details">
          <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
            {[
              ["Phone", c.phone], ["Address", [c.address, c.city, c.state, c.zip].filter(Boolean).join(", ")],
              ["Region", [c.borough, c.region].filter(Boolean).join(" · ")], ["Trades", c.trades.join(", ")],
              ["License", [c.license_type, c.license_number, c.license_status].filter(Boolean).join(" · ")],
              ["Source", c.source], ["Fit score", String(c.fit_score)], ["Email check", `${c.verify_status}${c.verify_reason ? ` (${c.verify_reason})` : ""}`],
              ["Tags", c.tags.join(", ")], ["Added", when(c.created_at)], ["Last emailed", when(c.last_contacted_at)],
            ].map(([k, v]) => (
              <div key={k} className="contents"><dt className="text-black/60">{k}</dt><dd>{v || "—"}</dd></div>
            ))}
          </dl>
          {invite && (
            <div className="mt-4 border-t-2 border-black pt-3 text-sm">
              <p className={label}>Personal invite link (paste into a reply)</p>
              <code className="block break-all bg-yellow/50 p-2 text-xs">{config.siteUrl}/i/{invite.token}</code>
            </div>
          )}
        </Card>

        <Card title="Actions">
          <form action={update} className="grid gap-3">
            <div>
              <label className={label}>Language</label>
              <select name="lang" defaultValue={c.lang} className={input}><option value="en">English</option><option value="es">Spanish</option></select>
            </div>
            <div>
              <label className={label}>Notes</label>
              <textarea name="notes" defaultValue={c.notes ?? ""} rows={4} className={input} />
            </div>
            <button className={btn}>Save</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 border-t-2 border-black pt-4">
            <form action={markReplied}><button className={btnGhost}>Mark replied (stop emails)</button></form>
            {c.email && !suppressed && <form action={doSuppress}><button className={btnGhost}>Suppress forever</button></form>}
          </div>
        </Card>

        <Card title="Sign-ups">
          {regs.length ? regs.map((r) => (
            <div key={r.ref_code} className="mb-2 text-sm">
              <Badge tone="good">{r.role}</Badge> {when(r.created_at)}<div className="text-xs text-black/60">{r.trades.join(", ")} · need: {r.crew_need ?? "—"} · ref {r.ref_code}</div>
            </div>
          )) : <p className="text-sm text-black/60">Not signed up yet.</p>}
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-xs font-extrabold uppercase tracking-[0.16em]">Emails</h2>
      <Table head={["Campaign", "Step", "Status", "When", "Subject", "Clicked", "Replied"]}>
        {sends.map((s) => (
          <tr key={s.id}>
            <td>{s.name}</td>
            <td>{s.step + 1}</td>
            <td><Badge tone={s.status === "sent" ? "dark" : s.status === "failed" ? "bad" : "plain"}>{s.status}</Badge>{s.error && <div className="text-xs text-black/60">{s.error}</div>}</td>
            <td className="whitespace-nowrap">{s.sent_at ? when(s.sent_at) : `due ${when(s.due_at)}`}</td>
            <td>
              {s.subject ?? "—"}
              {s.body && <details className="mt-1"><summary className="cursor-pointer text-xs underline">view</summary><pre className="mt-2 whitespace-pre-wrap bg-[#f6f5ef] p-3 text-xs">{s.body}</pre></details>}
            </td>
            <td>{when(s.clicked_at)}</td>
            <td>{when(s.replied_at)}</td>
          </tr>
        ))}
        {!sends.length && <tr><td colSpan={7} className="py-6 text-center text-black/60">Not in any campaign.</td></tr>}
      </Table>

      <h2 className="mb-3 mt-8 text-xs font-extrabold uppercase tracking-[0.16em]">Activity</h2>
      <Table head={["When", "Event", "Detail"]}>
        {events.map((e, i) => (
          <tr key={i}>
            <td className="whitespace-nowrap">{when(e.created_at)}</td>
            <td><Badge>{e.type}</Badge></td>
            <td className="text-xs text-black/70">{[e.path, ...Object.entries(e.meta ?? {}).filter(([k]) => k !== "ua").map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)].filter(Boolean).join(" · ")}</td>
          </tr>
        ))}
        {!events.length && <tr><td colSpan={3} className="py-6 text-center text-black/60">No activity yet.</td></tr>}
      </Table>
    </>
  );
}
