import { redirect } from "next/navigation";
import { q, one, pgJson } from "@/lib/db";
import { BRANDED_STEPS, STARTER_STEPS } from "@/lib/campaigns";
import CampaignForm, { readCampaignForm } from "@/components/blast/CampaignForm";
import Link from "next/link";
import { PageTitle, btnDark, btnGhost } from "@/components/blast/ui";

export default async function NewCampaign({ searchParams }: { searchParams: Promise<{ design?: string }> }) {
  const branded = (await searchParams).design === "branded";
  const lists = await q<{ id: number; name: string }>(`select id, name from lists order by id`);
  const senders = await q<{ id: number; name: string; email: string; mode: string }>(`select id, name, email, mode from senders order by id`);

  async function create(fd: FormData) {
    "use server";
    const d = readCampaignForm(fd);
    const c = await one<{ id: number }>(
      `insert into campaigns (name, code, list_id, sender_ids, daily_cap, track_opens, design, steps)
       values ($1, $2, $3, $4::int[], $5, $6, $7, $8::jsonb) returning id`,
      [d.name, d.code, d.list_id, `{${d.sender_ids.join(",")}}`, d.daily_cap, d.track_opens, d.design, pgJson(d.steps)],
    );
    redirect(`/blast/campaigns/${c!.id}`);
  }

  return (
    <>
      <PageTitle title="New campaign" sub="Starts as a draft with the Founding Member invite loaded. Nothing sends until you enroll contacts and set it active.">
        <Link className={branded ? btnGhost : btnDark} href="/blast/campaigns/new">Plain 3-email sequence</Link>
        <Link className={branded ? btnDark : btnGhost} href="/blast/campaigns/new?design=branded">Branded single email</Link>
      </PageTitle>
      <CampaignForm
        key={branded ? "branded" : "plain"}
        action={create}
        lists={lists}
        senders={senders}
        submitLabel="Create draft"
        draft={{
          name: "NYC contractors: Founding invite",
          code: `founding-nyc-${new Date().toISOString().slice(5, 10)}`,
          list_id: lists[0]?.id ?? null,
          sender_ids: senders.map((s) => s.id),
          daily_cap: 100,
          track_opens: false,
          design: branded ? "branded" : "plain",
          steps: branded ? BRANDED_STEPS : STARTER_STEPS,
        }}
      />
    </>
  );
}
