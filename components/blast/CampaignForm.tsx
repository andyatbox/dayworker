import type { Design, Step } from "@/lib/mail/render";
import { btn, input, label } from "./ui";

export type CampaignDraft = {
  name: string;
  code: string;
  list_id: number | null;
  sender_ids: number[];
  daily_cap: number;
  track_opens: boolean;
  design: Design;
  steps: Step[];
};

const MERGE = "{{first_name|there}} {{business_name}} {{area}} {{trade}} {{invite_link}} {{app_link}} {{sender_first}}";

/** Parses the form below back into a draft. Steps with no body are dropped. */
export function readCampaignForm(fd: FormData): CampaignDraft {
  const steps: Step[] = [];
  for (let i = 0; i < 4; i++) {
    const body = String(fd.get(`body_${i}`) ?? "").trim();
    if (!body) continue;
    steps.push({
      delay_days: Number(fd.get(`delay_${i}`) ?? 3) || 0,
      subject: String(fd.get(`subject_${i}`) ?? "").trim(),
      body,
      subject_es: String(fd.get(`subject_es_${i}`) ?? "").trim(),
      body_es: String(fd.get(`body_es_${i}`) ?? "").trim(),
    });
  }
  return {
    name: String(fd.get("name") ?? "").trim() || "Untitled campaign",
    code: String(fd.get("code") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40) || `c-${Date.now().toString(36)}`,
    list_id: Number(fd.get("list_id")) || null,
    sender_ids: fd.getAll("sender_ids").map(Number).filter(Boolean),
    daily_cap: Math.max(1, Number(fd.get("daily_cap")) || 100),
    track_opens: fd.get("track_opens") === "on",
    design: fd.get("design") === "branded" ? "branded" : "plain",
    steps,
  };
}

export default function CampaignForm({
  action,
  draft,
  lists,
  senders,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<void>;
  draft: CampaignDraft;
  lists: { id: number; name: string }[];
  senders: { id: number; name: string; email: string; mode: string }[];
  submitLabel: string;
}) {
  const steps = [...draft.steps, ...Array(Math.max(0, 4 - draft.steps.length)).fill(null)].slice(0, 4) as (Step | null)[];
  return (
    <form action={action} className="grid gap-6">
      <div className="grid gap-4 border-2 border-black bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className={label}>Name</label>
          <input name="name" defaultValue={draft.name} className={input} required />
        </div>
        <div>
          <label className={label}>Code: shows in App Store / Play reports</label>
          <input name="code" defaultValue={draft.code} className={input} pattern="[a-z0-9-]{1,40}" required />
        </div>
        <div>
          <label className={label}>List</label>
          <select name="list_id" defaultValue={draft.list_id ?? ""} className={input}>
            <option value="">Choose a list…</option>
            {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Max sends per day (this campaign)</label>
          <input name="daily_cap" type="number" min={1} defaultValue={draft.daily_cap} className={input} />
        </div>
        <div className="md:col-span-2">
          <p className={label}>Send from</p>
          <div className="flex flex-wrap gap-3">
            {senders.map((s) => (
              <label key={s.id} className="flex items-center gap-2 border-2 border-black px-3 py-2 text-sm">
                <input type="checkbox" name="sender_ids" value={s.id} defaultChecked={draft.sender_ids.includes(s.id)} className="accent-black" />
                {s.name} &lt;{s.email}&gt; {s.mode !== "smtp" && <em className="text-xs">(dry run)</em>}
              </label>
            ))}
            {!senders.length && <p className="text-sm text-black/60">Add a mailbox first.</p>}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className={label}>Design</label>
          <select name="design" defaultValue={draft.design} className={input}>
            <option value="plain">Plain text, from a person (best for cold email)</option>
            <option value="branded">Branded: header image and buttons</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end text-sm md:col-span-2">
          <input type="checkbox" name="track_opens" defaultChecked={draft.track_opens} className="accent-black" />
          Track opens (adds a pixel + HTML part. Leave off for cold email; opens are unreliable anyway)
        </label>
      </div>

      <p className="text-xs text-black/60">Merge fields: <code>{MERGE}</code>. A follow-up with an empty subject is sent as a reply in the same thread. Contacts marked Spanish get the ES version when one is written. In the branded design, a line that is only <code>[Label]({"{{invite_link}}"})</code> becomes a button.</p>

      {steps.map((s, i) => (
        <fieldset key={i} className="grid gap-3 border-2 border-black bg-white p-4 lg:grid-cols-2">
          <legend className="bg-black px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-yellow">
            Email {i + 1}{i === 0 ? " (first touch)" : " (follow-up)"}
          </legend>
          <div className="lg:col-span-2 flex flex-wrap items-end gap-3">
            {i > 0 && (
              <div className="w-48">
                <label className={label}>Days after previous</label>
                <input name={`delay_${i}`} type="number" min={1} defaultValue={s?.delay_days ?? 3} className={input} />
              </div>
            )}
            {i === 0 && <input type="hidden" name="delay_0" value="0" />}
          </div>
          <div>
            <label className={label}>Subject (EN){i > 0 && ", blank = reply in thread"}</label>
            <input name={`subject_${i}`} defaultValue={s?.subject ?? ""} className={input} />
            <label className={`${label} mt-3`}>Body (EN)</label>
            <textarea name={`body_${i}`} defaultValue={s?.body ?? ""} rows={10} className={`${input} font-mono text-[13px]`} />
          </div>
          <div>
            <label className={label}>Subject (ES)</label>
            <input name={`subject_es_${i}`} defaultValue={s?.subject_es ?? ""} className={input} />
            <label className={`${label} mt-3`}>Body (ES)</label>
            <textarea name={`body_es_${i}`} defaultValue={s?.body_es ?? ""} rows={10} className={`${input} font-mono text-[13px]`} />
          </div>
        </fieldset>
      ))}

      <div><button className={`${btn} px-6 py-3`}>{submitLabel}</button></div>
    </form>
  );
}
