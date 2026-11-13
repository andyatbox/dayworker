import { redirect } from "next/navigation";
import { q, one } from "@/lib/db";
import { deliver, type SenderRow } from "@/lib/mail/transport";
import { warmupCap, sentToday } from "@/lib/mail/tick";
import { Badge, Card, PageTitle, Table, Warning, btn, btnGhost, input, label } from "@/components/blast/ui";

export default async function Senders({ searchParams }: { searchParams: Promise<{ edit?: string; msg?: string }> }) {
  const { edit, msg } = await searchParams;
  const senders = await q<SenderRow & { paused_reason: string | null }>(`select * from senders order by id`);
  const today = await Promise.all(senders.map((s) => sentToday(s.id)));
  const editing = edit ? senders.find((s) => s.id === Number(edit)) : undefined;

  async function upsert(fd: FormData) {
    "use server";
    const v = (k: string) => String(fd.get(k) ?? "").trim() || null;
    const id = Number(fd.get("id")) || null;
    const vals = [
      v("name"), v("email")?.toLowerCase(), fd.get("mode") === "smtp" ? "smtp" : "dry_run", v("smtp_host"), Number(fd.get("smtp_port")) || 465,
      v("smtp_user"), v("smtp_pass_env"), v("imap_host"), Number(fd.get("imap_port")) || 993, Math.min(60, Number(fd.get("daily_max")) || 30),
      v("warmup_start") ?? new Date().toISOString().slice(0, 10), v("signature"),
    ];
    if (id) {
      await q(`update senders set name=$2, email=$3, mode=$4, smtp_host=$5, smtp_port=$6, smtp_user=$7, smtp_pass_env=$8, imap_host=$9, imap_port=$10,
        daily_max=$11, warmup_start=$12, signature=$13 where id=$1`, [id, ...vals]);
    } else {
      await q(`insert into senders (name, email, mode, smtp_host, smtp_port, smtp_user, smtp_pass_env, imap_host, imap_port, daily_max, warmup_start, signature)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, vals);
    }
    redirect("/blast/senders?msg=Saved");
  }
  async function toggle(fd: FormData) {
    "use server";
    const id = Number(fd.get("id"));
    await q(`update senders set status = case when status = 'active' then 'paused' else 'active' end, paused_reason = null where id = $1`, [id]);
    redirect("/blast/senders");
  }
  async function test(fd: FormData) {
    "use server";
    const s = await one<SenderRow>(`select * from senders where id = $1`, [Number(fd.get("id"))]);
    const to = String(fd.get("to") ?? "").trim();
    if (!s || !to) return;
    let m: string;
    try {
      await deliver(s, { to, subject: "Dayworker Blast test", text: `Test from ${s.name} via ${s.mode}.\n\nIf you can read this, the mailbox is wired up.`, token: `test${Date.now()}` });
      m = s.mode === "smtp" ? `Test sent to ${to}. Check it arrived in the inbox (not spam).` : "Dry-run mailbox: nothing was sent. Switch mode to SMTP to send for real.";
    } catch (e) {
      m = `Failed: ${e instanceof Error ? e.message : e}`;
    }
    redirect(`/blast/senders?msg=${encodeURIComponent(m)}`);
  }

  const f = editing ?? ({} as Partial<SenderRow>);
  return (
    <>
      <PageTitle title="Mailboxes" sub="Each mailbox ramps up on its own: 5 emails on day one, +2 a day, up to its max (30 recommended). Bounce rate over 2% pauses it automatically." />
      {msg && <div className="mb-6"><Warning>{msg}</Warning></div>}

      <Table head={["Mailbox", "Mode", "Today / cap", "Warm-up from", "Status", ""]}>
        {senders.map((s, i) => (
          <tr key={s.id}>
            <td><strong>{s.name}</strong><div className="text-xs text-black/60">{s.email}</div></td>
            <td><Badge tone={s.mode === "smtp" ? "dark" : "plain"}>{s.mode === "smtp" ? "live SMTP" : "dry run"}</Badge></td>
            <td className="tabular-nums">{today[i]} / {warmupCap(s)} <span className="text-xs text-black/60">(max {s.daily_max})</span></td>
            <td>{new Date(s.warmup_start).toISOString().slice(0, 10)}</td>
            <td><Badge tone={s.status === "active" ? "good" : "bad"}>{s.status}</Badge>{s.paused_reason && <div className="text-xs">{s.paused_reason}</div>}</td>
            <td className="whitespace-nowrap">
              <a className="mr-3 text-xs underline" href={`?edit=${s.id}`}>Edit</a>
              <form action={toggle} className="mr-3 inline"><input type="hidden" name="id" value={s.id} /><button className="text-xs underline">{s.status === "active" ? "Pause" : "Resume"}</button></form>
              <form action={test} className="inline-flex gap-1"><input type="hidden" name="id" value={s.id} /><input name="to" placeholder="test to…" className="w-36 border border-black px-1 text-xs" /><button className="text-xs underline">Send test</button></form>
            </td>
          </tr>
        ))}
        {!senders.length && <tr><td colSpan={6} className="py-6 text-center text-black/60">No mailboxes yet. Add one below. Dry run lets you rehearse campaigns before the real mailbox exists.</td></tr>}
      </Table>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card title={editing ? `Edit ${editing.email}` : "Add a mailbox"} className="lg:col-span-2">
          <form action={upsert} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={f.id ?? ""} />
            <div><label className={label}>From name (a real person)</label><input name="name" defaultValue={f.name ?? ""} placeholder="First Last" className={input} required /></div>
            <div><label className={label}>Email address</label><input name="email" type="email" defaultValue={f.email ?? ""} placeholder="first@your-sending-domain.com" className={input} required /></div>
            <div>
              <label className={label}>Mode</label>
              <select name="mode" defaultValue={f.mode ?? "dry_run"} className={input}><option value="dry_run">Dry run (records, never sends)</option><option value="smtp">Live SMTP</option></select>
            </div>
            <div><label className={label}>Daily max (after warm-up)</label><input name="daily_max" type="number" min={1} max={60} defaultValue={f.daily_max ?? 30} className={input} /></div>
            <div><label className={label}>SMTP host</label><input name="smtp_host" defaultValue={f.smtp_host ?? "smtp.purelymail.com"} className={input} /></div>
            <div><label className={label}>SMTP port</label><input name="smtp_port" type="number" defaultValue={f.smtp_port ?? 465} className={input} /></div>
            <div><label className={label}>SMTP user (blank = email)</label><input name="smtp_user" defaultValue={f.smtp_user ?? ""} className={input} /></div>
            <div><label className={label}>Env var holding the password</label><input name="smtp_pass_env" defaultValue={f.smtp_pass_env ?? "SMTP_PASS_SENDER1"} className={input} /></div>
            <div><label className={label}>IMAP host (for replies & bounces)</label><input name="imap_host" defaultValue={f.imap_host ?? "imap.purelymail.com"} className={input} /></div>
            <div><label className={label}>IMAP port</label><input name="imap_port" type="number" defaultValue={f.imap_port ?? 993} className={input} /></div>
            <div><label className={label}>Warm-up started</label><input name="warmup_start" type="date" defaultValue={f.warmup_start ? new Date(f.warmup_start).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)} className={input} /></div>
            <div className="md:col-span-2"><label className={label}>Signature</label><textarea name="signature" rows={3} defaultValue={f.signature ?? ""} placeholder={"First Last\nTitle, Dayworker\ndayworker.co"} className={input} /></div>
            <div className="flex gap-2 md:col-span-2"><button className={btn}>{editing ? "Save" : "Add mailbox"}</button>{editing && <a href="/blast/senders" className={btnGhost}>Cancel</a>}</div>
          </form>
        </Card>
        <Card title="Mailbox setup (Purelymail on a sending domain)">
          <ol className="list-decimal space-y-2 pl-4 text-sm leading-relaxed">
            <li>Add the sending domain in Purelymail and copy the DNS records it lists into GoDaddy. Then add a user per real person and turn on two-factor sign-in.</li>
            <li>Create an <strong>app password</strong> (Purelymail → Account → Security).</li>
            <li>Put it in an env var (e.g. <code>SMTP_PASS_SENDER1</code>) in <code>.env.local</code> / Vercel. Never paste it here.</li>
            <li>Host <code>smtp.purelymail.com</code>:465, IMAP <code>imap.purelymail.com</code>:993. Daily max 30.</li>
            <li>Leave mode on <strong>Dry run</strong> for the first week while you send a few normal emails by hand; then switch to Live SMTP and set <strong>Warm-up started</strong> to that day, so the ramp starts at 5 a day.</li>
          </ol>
        </Card>
      </div>
    </>
  );
}
