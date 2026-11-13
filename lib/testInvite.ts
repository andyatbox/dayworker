import { one, pgJson } from "./db";
import { BRANDED_STEPS } from "./campaigns";
import { normEmail, sign, token, unsign } from "./util";

/**
 * Test invites: the real invitation made out to a teammate or partner. Saved
 * with status "test" under a draft campaign, so the sender never sends them.
 * Made from /blast → Test invites, or from a demo link (below).
 */
const TEST_CODE = "test-invites";

export type TestPerson = { first?: string; last?: string; business?: string; email: string; lang?: "en" | "es" };

export async function makeTestInvite(p: TestPerson) {
  const email = normEmail(p.email);
  if (!email) return undefined;
  const lang = p.lang === "es" ? "es" : "en";
  const campaign =
    (await one<{ id: number }>(`select id from campaigns where code = $1`, [TEST_CODE])) ??
    (await one<{ id: number }>(
      `insert into campaigns (name, code, status, design, steps) values ('Test invites', $1, 'draft', 'branded', $2::jsonb)
       on conflict (code) do update set name = excluded.name returning id`,
      [TEST_CODE, pgJson(BRANDED_STEPS)],
    ));
  const contact = await one<{ id: number }>(
    `insert into contacts (email, first_name, last_name, business_name, lang, source, tags)
     values ($1, $2, $3, $4, $5, 'test', '{test}')
     on conflict (email) do update set first_name = excluded.first_name, last_name = excluded.last_name,
       business_name = excluded.business_name, lang = excluded.lang,
       tags = (select array(select distinct unnest(contacts.tags || '{test}'))), updated_at = now()
     returning id`,
    [email, p.first?.trim() || null, p.last?.trim() || null, p.business?.trim() || null, lang],
  );
  return one<{ id: number; campaign_id: number; token: string }>(
    `insert into sends (campaign_id, contact_id, step, token, status) values ($1, $2, 0, $3, 'test')
     on conflict (campaign_id, contact_id, step) do update set status = 'test'
     returning id, campaign_id, token`,
    [campaign!.id, contact!.id, token()],
  );
}

/**
 * A demo link carries the person's details itself, signed with APP_SECRET so
 * only we can make one: dayworker.co/i/<demo token>. Its first click saves a
 * test invite and then behaves exactly like a click from a real email.
 */
export function demoToken(p: TestPerson) {
  const short = { f: p.first, l: p.last, b: p.business, e: p.email, g: p.lang };
  return sign(`d~${Buffer.from(JSON.stringify(short)).toString("base64url")}`);
}

export function readDemoToken(t: string): TestPerson | undefined {
  const v = unsign(t);
  if (!v?.startsWith("d~")) return undefined;
  try {
    const s = JSON.parse(Buffer.from(v.slice(2), "base64url").toString()) as Record<string, string | undefined>;
    return s.e ? { first: s.f, last: s.l, business: s.b, email: s.e, lang: s.g === "es" ? "es" : "en" } : undefined;
  } catch {
    return undefined;
  }
}
