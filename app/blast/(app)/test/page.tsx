import { redirect } from "next/navigation";
import { q, one, pgJson } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { config } from "@/lib/config";
import { BRANDED_STEPS } from "@/lib/campaigns";
import { normEmail, token } from "@/lib/util";
import { Card, PageTitle, Table, Warning, btn, input, label, when } from "@/components/blast/ui";

/**
 * Test invites: the real invitation, made out to a teammate or partner, so they
 * can try the whole path (email → link → form filled in with their details →
 * account) before any campaign goes out.
 *
 * Nothing here is ever sent by the system. The invite is saved with status
 * "test", which the sender never picks up, under a draft campaign that is never
 * set active. You send it yourself: copy the personal link into an email, or
 * download the ready-made email and send it from your own mail app.
 */
const TEST_CODE = "test-invites";

export default async function TestInvites({ searchParams }: { searchParams: Promise<{ made?: string; from?: string }> }) {
  const { made, from } = await searchParams;
  const tests = await q<{ id: number; campaign_id: number; token: string; email: string; first_name: string | null; business_name: string | null; stage: string; created_at: string }>(
    `select s.id, s.campaign_id, s.token, ct.email, ct.first_name, ct.business_name, ct.stage, s.due_at as created_at
     from sends s join contacts ct on ct.id = s.contact_id
     where s.status = 'test' order by s.id desc limit 50`,
  );
  const fresh = made ? tests.find((t) => t.id === Number(made)) : undefined;
  const eml = (t: { id: number; campaign_id: number }) =>
    `/blast/campaigns/${t.campaign_id}/eml?send=${t.id}${from ? `&from=${encodeURIComponent(from)}` : ""}`;

  async function make(fd: FormData) {
    "use server";
    await requireAdmin();
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const email = normEmail(v("email"));
    if (!email) redirect("/blast/test");
    const lang = v("lang") === "es" ? "es" : "en";

    // The built-in branded invitation, as a draft campaign that never sends.
    const campaign =
      (await one<{ id: number }>(`select id from campaigns where code = $1`, [TEST_CODE])) ??
      (await one<{ id: number }>(
        `insert into campaigns (name, code, status, design, steps) values ('Test invites', $1, 'draft', 'branded', $2::jsonb) returning id`,
        [TEST_CODE, pgJson(BRANDED_STEPS)],
      ));
    const contact = await one<{ id: number }>(
      `insert into contacts (email, first_name, last_name, business_name, lang, source, tags)
       values ($1, $2, $3, $4, $5, 'test', '{test}')
       on conflict (email) do update set first_name = excluded.first_name, last_name = excluded.last_name,
         business_name = excluded.business_name, lang = excluded.lang,
         tags = (select array(select distinct unnest(contacts.tags || '{test}'))), updated_at = now()
       returning id`,
      [email, v("first") || null, v("last") || null, v("business") || null, lang],
    );
    const send = await one<{ id: number }>(
      `insert into sends (campaign_id, contact_id, step, token, status) values ($1, $2, 0, $3, 'test')
       on conflict (campaign_id, contact_id, step) do update set status = 'test'
       returning id`,
      [campaign!.id, contact!.id, token()],
    );
    const sender = v("sender");
    redirect(`/blast/test?made=${send!.id}${sender ? `&from=${encodeURIComponent(sender)}` : ""}`);
  }

  return (
    <>
      <PageTitle
        title="Test invites"
        sub="The real invitation, made out to a teammate or partner. Nothing here is sent by the system: you send it yourself."
      />

      {config.siteUrl.includes("localhost") && (
        <Warning>These links point to this computer ({config.siteUrl}), so they only work here. Make test invites on the live site to send them to someone.</Warning>
      )}

      {fresh && (
        <Card title={`Invite for ${fresh.first_name ?? fresh.email} is ready`} className="mb-6">
          <ol className="grid gap-4 text-sm">
            <li>
              <p className={label}>Quickest: paste this link into an email to {fresh.email}</p>
              <code className="block break-all bg-yellow/50 p-2 text-xs">{config.siteUrl}/i/{fresh.token}</code>
            </li>
            <li>
              <p className={label}>Or send the full designed email</p>
              <a className={btn} href={eml(fresh)}>Download the email</a>
              <p className="mt-2 text-black/70">
                Open the downloaded file in Mail, then choose <strong>Message → Send Again</strong>. It opens as a new email from your
                address, already addressed to them. Press Send.
              </p>
            </li>
          </ol>
          <p className="mt-4 text-xs text-black/60">
            When they click, the site opens with the sign-up form filled in with their name, business and email, set to Hiring
            contractor. Signing up makes a real app account: ask the developer to delete it afterward.
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <Card title="Make a test invite">
          <form action={make} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>First name</label><input name="first" className={input} required /></div>
              <div><label className={label}>Last name</label><input name="last" className={input} /></div>
            </div>
            <div><label className={label}>Business</label><input name="business" className={input} placeholder="Their company" /></div>
            <div><label className={label}>Their email</label><input name="email" type="email" className={input} required /></div>
            <div>
              <label className={label}>Language</label>
              <select name="lang" className={input}><option value="en">English</option><option value="es">Spanish</option></select>
            </div>
            <div><label className={label}>Your name (signs the email)</label><input name="sender" defaultValue={from ?? ""} className={input} placeholder="First Last" /></div>
            <button className={btn}>Make invite</button>
          </form>
        </Card>

        <Card title="Test invites so far">
          <Table head={["Who", "Made", "Status", ""]} empty="None yet.">
            {tests.map((t) => (
              <tr key={t.id} className="border-t border-black/10">
                <td className="py-2 pr-3">{t.first_name ?? "—"} {t.business_name ? <span className="text-black/60">· {t.business_name}</span> : null}<br /><span className="text-xs text-black/60">{t.email}</span></td>
                <td className="py-2 pr-3 text-xs">{when(t.created_at)}</td>
                <td className="py-2 pr-3 text-xs">{t.stage === "new" ? "not clicked" : t.stage}</td>
                <td className="py-2 text-right text-xs"><a className="underline" href={`/blast/test?made=${t.id}${from ? `&from=${encodeURIComponent(from)}` : ""}`}>Link & email</a></td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
