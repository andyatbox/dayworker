import Link from "next/link";
import { q } from "@/lib/db";
import { joinedSql } from "@/lib/funnel";
import { Badge, PageTitle, Table, btn, fmt, pct } from "@/components/blast/ui";

export default async function Campaigns() {
  const rows = await q<{ id: number; name: string; code: string; status: string; list: string | null; steps: unknown[]; enrolled: number; sent: number; queued: number; joined: number; replies: number }>(`
    select c.id, c.name, c.code, c.status, l.name as list, c.steps,
      (select count(distinct contact_id)::int from sends where campaign_id = c.id) as enrolled,
      (select count(*)::int from sends where campaign_id = c.id and status = 'sent') as sent,
      (select count(*)::int from sends where campaign_id = c.id and status = 'queued') as queued,
      ${joinedSql("c.id")} as joined,
      (select count(*)::int from sends where campaign_id = c.id and replied_at is not null) as replies
    from campaigns c left join lists l on l.id = c.list_id order by c.id desc`);
  return (
    <>
      <PageTitle title="Campaigns" sub="A campaign is a list, one or more mailboxes, and a short sequence of plain-text emails.">
        <Link href="/blast/campaigns/new" className={btn}>New campaign</Link>
      </PageTitle>
      <Table head={["Campaign", "Status", "List", "Emails", "Enrolled", "Sent", "Queued", "Joined", "Replies"]}>
        {rows.map((c) => (
          <tr key={c.id}>
            <td><Link href={`/blast/campaigns/${c.id}`} className="font-bold underline">{c.name}</Link><div className="text-xs text-black/60">{c.code}</div></td>
            <td><Badge tone={c.status === "active" ? "good" : c.status === "paused" ? "warn" : "plain"}>{c.status}</Badge></td>
            <td className="text-sm">{c.list ?? "—"}</td>
            <td>{c.steps.length}</td>
            <td>{fmt(c.enrolled)}</td>
            <td>{fmt(c.sent)}</td>
            <td>{fmt(c.queued)}</td>
            <td className="font-bold">{fmt(c.joined)} <span className="font-normal text-black/50">{pct(c.joined, c.enrolled)}</span></td>
            <td>{fmt(c.replies)}</td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={9} className="py-8 text-center text-black/60">No campaigns yet.</td></tr>}
      </Table>
    </>
  );
}
