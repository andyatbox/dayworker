import Papa from "papaparse";
import { q, pgArray, pgJson } from "../db";
import { normEmail, normPhone, titleCase } from "../util";
import { regionFor } from "./geo";
import { FREE_MAIL, esLikely } from "./signals";

/**
 * Generic CSV import for everything that isn't an API: FOIL/OPRA responses,
 * Google Places exports, trade-association directories, the app's existing
 * users (as suppressions), verifier results, union-signatory lists, and the
 * app's own user export (to credit sign-ups that happened in the app).
 *
 * Headers are matched loosely, so most exports import without editing.
 */
const HEADERS: Record<string, RegExp> = {
  email: /^(e-?mail|email address|business email|contact email)$/i,
  first_name: /^(first|first name|firstname|fname|given name)$/i,
  last_name: /^(last|last name|lastname|lname|surname|family name)$/i,
  name: /^(name|full name|contact name|owner)$/i,
  business_name: /^(business|business name|company|company name|organization|dba)$/i,
  phone: /^(phone|phone number|telephone|business phone|mobile|cell)$/i,
  address: /^(address|street|street address|address 1)$/i,
  city: /^(city|town|locality)$/i,
  state: /^(state|st|province)$/i,
  zip: /^(zip|zip code|zipcode|postal code|postcode)$/i,
  trades: /^(trade|trades|category|categories|specialty|type)$/i,
  license_number: /^(license|license id|license number|license no|license #)$/i,
  license_status: /^(status|license status)$/i,
  reason: /^(reason|note)$/i,
  created_at: /^(created|created ?at|created_at|createdat|creation time|sign ?up date|joined|date joined)$/i,
  role: /^(role|user ?type|usertype|account type)$/i,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Epoch seconds, epoch ms, or any date string → ISO; null if unreadable. */
function toIso(v: string): string | null {
  if (!v) return null;
  const n = Number(v);
  const d = Number.isFinite(n) ? new Date(n > 1e12 ? n : n * 1000) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mapHeaders(fields: string[]) {
  const map: Record<string, string> = {};
  for (const f of fields) {
    // Some exports pack "Address" as "Street, Town, ST 12345" — handled below.
    const key = Object.keys(HEADERS).find((k) => HEADERS[k].test(f.trim()));
    if (key && !map[key]) map[key] = f;
  }
  return map;
}

export type ImportMode = "contacts" | "suppress" | "app";

export async function importCsv(text: string, opts: { mode: ImportMode; source: string; tag?: string }) {
  text = text.replace(/^﻿/, "");
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  let h = mapHeaders(parsed.meta.fields ?? []);
  let rows = parsed.data;
  if (!h.email) {
    // Headerless exports (e.g. Firebase `auth:export --format=csv`): use the column that holds emails.
    const raw = Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
    const sample = raw.slice(0, 50);
    const col = (raw[0] ?? []).findIndex((_, i) => sample.filter((r) => EMAIL_RE.test((r[i] ?? "").trim())).length > sample.length / 2);
    if (col < 0) throw new Error(`No email column found. Columns: ${(parsed.meta.fields ?? []).join(", ")}`);
    rows = raw.map((r) => ({ email: r[col] ?? "" }));
    h = { email: "email" };
  }
  const get = (row: Record<string, string>, k: string) => (h[k] ? (row[h[k]] ?? "").trim() : "");

  if (opts.mode === "suppress") {
    const emails = [...new Set(rows.map((r) => normEmail(get(r, "email"))).filter(Boolean))];
    for (let i = 0; i < emails.length; i += 2000) {
      await q(
        `insert into suppressions (email, reason, source)
         select e, $2, $3 from unnest($1::text[]) as e
         on conflict (email) do nothing`,
        [`{${emails.slice(i, i + 2000).map((e) => `"${e}"`).join(",")}}`, opts.tag || "imported", opts.source],
      );
    }
    return { rows: rows.length, suppressed: emails.length };
  }

  if (opts.mode === "app") return importAppAccounts(rows, get, opts.source);

  const byEmail = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const email = normEmail(get(r, "email"));
    if (!email || byEmail.has(email)) continue;
    let first = get(r, "first_name");
    let last = get(r, "last_name");
    if (!first && get(r, "name")) [first, last = ""] = get(r, "name").split(/\s+(.+)/);
    let zip = get(r, "zip");
    let city = get(r, "city");
    let state = get(r, "state");
    const addr = get(r, "address");
    if (!zip) {
      const m = /,\s*([^,]+),\s*([A-Z]{2})\s+(\d{5})/.exec(addr);
      if (m) [, city, state, zip] = m;
    }
    const { region, borough } = regionFor(zip);
    const domain = email.split("@")[1];
    const tags = [opts.tag, FREE_MAIL.has(domain) ? "small-shop" : "", esLikely(last) ? "es-likely" : ""].filter(Boolean);
    byEmail.set(email, {
      email,
      first_name: titleCase(first) || null,
      last_name: titleCase(last) || null,
      business_name: titleCase(get(r, "business_name")) || null,
      phone: normPhone(get(r, "phone")) || null,
      address: addr.split(",")[0] || null,
      city: titleCase(city) || null,
      state: state.toUpperCase() || null,
      zip: zip.slice(0, 5) || null,
      region,
      borough,
      trades: get(r, "trades").split(/[;|]/).map((t) => t.trim()).filter(Boolean),
      license_number: get(r, "license_number") || null,
      license_status: get(r, "license_status") || null,
      fit_score: 2 + (FREE_MAIL.has(domain) ? 1 : 0),
      tags,
    });
  }
  const records = [...byEmail.values()];
  for (let i = 0; i < records.length; i += 1000) {
    await q(
      `insert into contacts (email, first_name, last_name, business_name, phone, address, city, state, zip,
         region, borough, trades, license_number, license_status, source, fit_score, tags)
       select x.email, x.first_name, x.last_name, x.business_name, x.phone, x.address, x.city, x.state, x.zip,
         x.region, x.borough, x.trades, x.license_number, x.license_status, $2, x.fit_score, x.tags
       from jsonb_to_recordset($1::jsonb) as x(email text, first_name text, last_name text, business_name text,
         phone text, address text, city text, state text, zip text, region text, borough text, trades text[],
         license_number text, license_status text, fit_score int, tags text[])
       on conflict (email) do update set
         first_name    = coalesce(contacts.first_name, excluded.first_name),
         last_name     = coalesce(contacts.last_name, excluded.last_name),
         business_name = coalesce(contacts.business_name, excluded.business_name),
         phone         = coalesce(contacts.phone, excluded.phone),
         zip           = coalesce(contacts.zip, excluded.zip),
         region        = coalesce(contacts.region, excluded.region),
         trades        = array(select distinct unnest(contacts.trades || excluded.trades)),
         tags          = array(select distinct unnest(contacts.tags || excluded.tags)),
         updated_at    = now()`,
      [pgJson(records.slice(i, i + 1000)), opts.source],
    );
  }
  return { rows: rows.length, contacts: records.length };
}

/**
 * The app's user export → conversions. Closes the loop on people who took the
 * fast path (straight to the store) and never filled in the landing form:
 *
 * - every app user goes on the do-not-cold-email list, matched or not
 * - matched contacts become `member`, any queued emails stop
 * - the account is credited to the last campaign that emailed them before it
 *   was created (no credit if they had the account first)
 * - `via` says whether they signed up on our page first or went straight to the app
 *
 * Safe to re-import the same export; each contact is credited once.
 */
async function importAppAccounts(rows: Record<string, string>[], get: (r: Record<string, string>, k: string) => string, source: string) {
  const accounts = new Map<string, { email: string; created_at: string | null; role: string | null }>();
  for (const r of rows) {
    const email = normEmail(get(r, "email"));
    if (!email || accounts.has(email)) continue;
    accounts.set(email, { email, created_at: toIso(get(r, "created_at")), role: get(r, "role").toLowerCase() || null });
  }
  const list = [...accounts.values()];
  const out = { rows: rows.length, accounts: list.length, newlyMatched: 0, straightToApp: 0, finishedFromPage: 0, creditedToCampaign: 0 };

  for (let i = 0; i < list.length; i += 1000) {
    const chunk = pgJson(list.slice(i, i + 1000));
    await q(
      `insert into suppressions (email, reason, source)
       select x.email, 'app user', $2 from jsonb_to_recordset($1::jsonb) as x(email text)
       on conflict (email) do nothing`,
      [chunk, source],
    );
    const hits = await q<{ contact_id: number; via: string; campaign_id: number | null }>(
      `with acct as (
         select * from jsonb_to_recordset($1::jsonb) as x(email text, created_at timestamptz, role text)
       ), m as (
         select c.id as contact_id, a.created_at, a.role,
           case when exists (select 1 from registrations r where r.email = a.email or r.contact_id = c.id) then 'page' else 'app' end as via,
           (select s.campaign_id from sends s
             where s.contact_id = c.id and s.sent_at is not null and s.sent_at <= coalesce(a.created_at, now())
             order by s.sent_at desc limit 1) as campaign_id
         from acct a join contacts c on c.email = a.email
         where not exists (select 1 from events e where e.type = 'app_account' and e.contact_id = c.id)
       )
       insert into events (type, contact_id, campaign_id, meta, created_at)
       select 'app_account', contact_id, campaign_id, jsonb_build_object('via', via, 'role', role, 'source', $2::text), coalesce(created_at, now())
       from m
       returning contact_id, meta->>'via' as via, campaign_id`,
      [chunk, source],
    );
    if (!hits.length) continue;
    const ids = `{${hits.map((x) => x.contact_id).join(",")}}`;
    await q(`update contacts set stage = 'member', updated_at = now() where id = any($1::int[]) and stage not in ('unsubscribed', 'bounced')`, [ids]);
    await q(`update sends set status = 'stopped', error = 'in app' where contact_id = any($1::int[]) and status = 'queued'`, [ids]);
    out.newlyMatched += hits.length;
    out.straightToApp += hits.filter((x) => x.via === "app").length;
    out.finishedFromPage += hits.filter((x) => x.via === "page").length;
    out.creditedToCampaign += hits.filter((x) => x.campaign_id).length;
  }
  await q(`update registrations set status = 'in_app' where email = any($1::text[]) and status <> 'in_app'`, [pgArray(list.map((a) => a.email))]);
  return out;
}
