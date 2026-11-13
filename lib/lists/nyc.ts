import { q, pgJson } from "../db";
import { config } from "../config";
import { normEmail, normPhone, titleCase } from "../util";
import { regionFor, IN_MARKET } from "./geo";
import { FREE_MAIL, esLikely, bizKey, phoneKey } from "./signals";

const SOCRATA = "https://data.cityofnewyork.us/resource";

async function socrata<T>(dataset: string, where: string): Promise<T[]> {
  const out: T[] = [];
  const page = 5000;
  for (let offset = 0; ; offset += page) {
    const params = new URLSearchParams({
      $where: where,
      $limit: String(page),
      $offset: String(offset),
      $order: ":id",
    });
    const res = await fetch(`${SOCRATA}/${dataset}.json?${params}`, {
      headers: config.socrataToken ? { "X-App-Token": config.socrataToken } : {},
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`NYC Open Data ${dataset}: HTTP ${res.status}`);
    const rows = (await res.json()) as T[];
    out.push(...rows);
    if (rows.length < page) return out;
  }
}

/* ------------------------------------------------------------------ */
/* DOB License Info (t8hj-ruu2) — the licences that carry an email.   */
/* ------------------------------------------------------------------ */

/** Licence types that hire labour, with the trade label and base priority. */
const DOB_TYPES: Record<string, { trade: string; fit: number }> = {
  "GENERAL CONTRACTOR": { trade: "General Contracting", fit: 3 },
  "SUPERINTENDENT OF CONSTRUCTION": { trade: "Construction Superintendent", fit: 2 },
  "MASTER PLUMBER": { trade: "Plumbing", fit: 2 },
  "ELECTRICAL FIRM": { trade: "Electrical", fit: 2 },
  "FIRE SUPPRESSION CONTRACTOR": { trade: "Fire Suppression", fit: 1 },
  "OIL BURNER INSTALLER": { trade: "HVAC", fit: 1 },
};

type DobRow = {
  license_type: string;
  license_number: string;
  license_status: string;
  first_name?: string;
  last_name?: string;
  business_name?: string;
  business_house_number?: string;
  business_street_name?: string;
  license_business_city?: string;
  business_state?: string;
  business_zip_code?: string;
  business_email?: string;
  business_phone_number?: string;
};

type ContactIn = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  region: string;
  borough: string | null;
  trades: string[];
  license_type: string;
  license_number: string;
  license_status: string;
  fit_score: number;
  tags: string[];
};

export async function syncNycDob() {
  const types = Object.keys(DOB_TYPES).map((t) => `'${t}'`).join(",");
  const rows = await socrata<DobRow>(
    "t8hj-ruu2",
    `license_status='ACTIVE' AND business_email IS NOT NULL AND license_type in (${types})`,
  );

  // One record per email: the same person often holds several licences.
  const byEmail = new Map<string, ContactIn>();
  for (const r of rows) {
    const email = normEmail(r.business_email);
    const meta = DOB_TYPES[r.license_type];
    if (!email || !meta) continue;
    const zip = (r.business_zip_code ?? "").slice(0, 5) || null;
    const { region, borough } = regionFor(zip);
    const domain = email.split("@")[1];
    let fit = meta.fit + (FREE_MAIL.has(domain) ? 1 : 0) + (IN_MARKET.includes(region) ? 1 : -2);
    const tags = [`dob:${r.license_type.toLowerCase().replace(/[^a-z]+/g, "-")}`];
    if (FREE_MAIL.has(domain)) tags.push("small-shop");
    if (esLikely(r.last_name)) tags.push("es-likely");

    const prev = byEmail.get(email);
    if (prev) {
      prev.trades = [...new Set([...prev.trades, meta.trade])];
      prev.tags = [...new Set([...prev.tags, ...tags])];
      prev.fit_score = Math.max(prev.fit_score, fit);
      continue;
    }
    byEmail.set(email, {
      email,
      first_name: titleCase(r.first_name) || null,
      last_name: titleCase(r.last_name) || null,
      business_name: titleCase(r.business_name) || null,
      phone: normPhone(r.business_phone_number) || null,
      address: titleCase([r.business_house_number, r.business_street_name].filter(Boolean).join(" ")) || null,
      city: titleCase(r.license_business_city) || null,
      state: (r.business_state ?? "").toUpperCase() || null,
      zip,
      region,
      borough,
      trades: [meta.trade],
      license_type: r.license_type,
      license_number: r.license_number,
      license_status: r.license_status,
      fit_score: fit,
      tags,
    });
  }

  const records = [...byEmail.values()];
  let upserted = 0;
  for (let i = 0; i < records.length; i += 1000) {
    const batch = records.slice(i, i + 1000);
    const res = await q<{ inserted: boolean }>(
      `insert into contacts (email, first_name, last_name, business_name, phone, address, city, state, zip,
         region, borough, trades, license_type, license_number, license_status, source, fit_score, tags)
       select x.email, x.first_name, x.last_name, x.business_name, x.phone, x.address, x.city, x.state, x.zip,
         x.region, x.borough, x.trades, x.license_type, x.license_number, x.license_status, 'nyc-dob', x.fit_score, x.tags
       from jsonb_to_recordset($1::jsonb) as x(email text, first_name text, last_name text, business_name text,
         phone text, address text, city text, state text, zip text, region text, borough text, trades text[],
         license_type text, license_number text, license_status text, fit_score int, tags text[])
       on conflict (email) do update set
         first_name     = coalesce(contacts.first_name, excluded.first_name),
         last_name      = coalesce(contacts.last_name, excluded.last_name),
         business_name  = coalesce(contacts.business_name, excluded.business_name),
         phone          = coalesce(contacts.phone, excluded.phone),
         address        = coalesce(contacts.address, excluded.address),
         city           = coalesce(contacts.city, excluded.city),
         state          = coalesce(contacts.state, excluded.state),
         zip            = coalesce(contacts.zip, excluded.zip),
         region         = coalesce(contacts.region, excluded.region),
         borough        = coalesce(contacts.borough, excluded.borough),
         trades         = array(select distinct unnest(contacts.trades || excluded.trades)),
         tags           = array(select distinct unnest(contacts.tags || excluded.tags)),
         license_type   = excluded.license_type,
         license_number = excluded.license_number,
         license_status = excluded.license_status,
         fit_score      = greatest(contacts.fit_score, excluded.fit_score),
         updated_at     = now()
       returning (xmax = 0) as inserted`,
      [pgJson(batch)],
    );
    upserted += res.length;
  }
  return { fetched: rows.length, uniqueEmails: records.length, upserted };
}

/* ------------------------------------------------------------------ */
/* DCWP Home Improvement Contractors (w7w3-xahh) — phone only.        */
/* Small residential shops: the most likely non-union, most likely    */
/* to need day labour. Matched DOB contacts get tagged `hic`; the     */
/* rest are stored email-less, waiting on website enrichment.         */
/* ------------------------------------------------------------------ */

type DcwpRow = {
  license_nbr: string;
  business_name?: string;
  dba_trade_name?: string;
  contact_phone?: string;
  address_building?: string;
  address_street_name?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_borough?: string;
};

export async function syncNycDcwp() {
  const rows = await socrata<DcwpRow>(
    "w7w3-xahh",
    `business_category='Home Improvement Contractor' AND license_status='Active'`,
  );

  const known = await q<{ id: number; business_name: string | null; phone: string | null }>(
    `select id, business_name, phone from contacts where email is not null`,
  );
  const byPhone = new Map<string, number>();
  const byName = new Map<string, number>();
  for (const c of known) {
    const p = phoneKey(c.phone);
    if (p) byPhone.set(p, c.id);
    const n = bizKey(c.business_name);
    if (n.length > 3) byName.set(n, c.id);
  }

  const matchedIds = new Set<number>();
  const orphans: Record<string, unknown>[] = [];
  for (const r of rows) {
    const id = byPhone.get(phoneKey(r.contact_phone)) ?? byName.get(bizKey(r.business_name)) ?? byName.get(bizKey(r.dba_trade_name));
    if (id) {
      matchedIds.add(id);
      continue;
    }
    const zip = (r.address_zip ?? "").slice(0, 5) || null;
    const { region, borough } = regionFor(zip);
    orphans.push({
      ext_key: `dcwp:${r.license_nbr}`,
      business_name: titleCase(r.dba_trade_name || r.business_name) || null,
      phone: normPhone(r.contact_phone) || null,
      address: titleCase([r.address_building, r.address_street_name].filter(Boolean).join(" ")) || null,
      city: titleCase(r.address_city) || null,
      state: (r.address_state ?? "").toUpperCase() || null,
      zip,
      region,
      // DCWP's own borough field says "Outside NYC" (or a stale borough) for suburban shops; trust the ZIP.
      borough,
      license_number: r.license_nbr,
      fit_score: 3 + (IN_MARKET.includes(region) ? 1 : -2),
    });
  }

  if (matchedIds.size) {
    await q(
      `update contacts set
         tags = array(select distinct unnest(tags || '{hic}'::text[])),
         trades = array(select distinct unnest(trades || '{Home Improvement}'::text[])),
         fit_score = fit_score + case when 'hic' = any(tags) then 0 else 2 end,
         updated_at = now()
       where id = any($1::int[])`,
      [`{${[...matchedIds].join(",")}}`],
    );
  }

  for (let i = 0; i < orphans.length; i += 1000) {
    await q(
      `insert into contacts (ext_key, business_name, phone, address, city, state, zip, region, borough,
         trades, license_type, license_number, license_status, source, fit_score, tags, verify_status)
       select x.ext_key, x.business_name, x.phone, x.address, x.city, x.state, x.zip, x.region, x.borough,
         '{Home Improvement}', 'HOME IMPROVEMENT CONTRACTOR', x.license_number, 'ACTIVE', 'nyc-dcwp',
         x.fit_score, '{hic,needs-email}', 'no_email'
       from jsonb_to_recordset($1::jsonb) as x(ext_key text, business_name text, phone text, address text,
         city text, state text, zip text, region text, borough text, license_number text, fit_score int)
       on conflict (ext_key) do update set
         phone = coalesce(contacts.phone, excluded.phone),
         borough = excluded.borough,
         license_status = 'ACTIVE',
         updated_at = now()`,
      [pgJson(orphans.slice(i, i + 1000))],
    );
  }

  return { fetched: rows.length, matchedToEmailContacts: matchedIds.size, phoneOnly: orphans.length };
}
