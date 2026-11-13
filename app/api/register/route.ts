import { NextResponse, type NextRequest } from "next/server";
import { one, q, pgArray } from "@/lib/db";
import { TRADES } from "@/lib/copy";
import { regionFor } from "@/lib/lists/geo";
import { advanceStage, attribution, recordEvent, stopSequences } from "@/lib/track";
import { normEmail, normPhone, token } from "@/lib/util";

/**
 * Our copy of a web sign-up, sent by the form once Firebase has created the
 * account (`uid`). Firebase holds the account itself; this keeps campaign
 * attribution, the crew-invite code and the CRM stage. Never receives the
 * password.
 */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "bad request" }, { status: 400 });

  // Bots fill the hidden field or submit faster than a person can type.
  if (b.website || (typeof b.elapsedMs === "number" && b.elapsedMs < 2500)) {
    return NextResponse.json({ ok: true, refCode: token(5) });
  }

  const role = b.role === "worker" ? "worker" : "contractor";
  const email = normEmail(b.email);
  const name = String(b.name ?? "").trim().slice(0, 120);
  const business = String(b.business ?? "").trim().slice(0, 160);
  const zip = String(b.zip ?? "").trim();
  if (!email || !name || !/^\d{5}$/.test(zip) || (role === "contractor" && !business)) {
    return NextResponse.json({ error: "missing fields" }, { status: 422 });
  }
  const phone = normPhone(b.phone) || null;
  const lang = b.lang === "es" ? "es" : "en";
  const trades: string[] = Array.isArray(b.trades) ? b.trades.filter((x: unknown) => TRADES.some((t) => t.key === x)) : [];
  const need = ["now", "month", "season", "exploring"].includes(b.need) ? b.need : null;
  const referredBy = typeof b.ref === "string" && /^[\w-]{3,20}$/.test(b.ref) ? b.ref : null;
  // Firebase UIDs are 28 characters; the emulator's are similar.
  const uid = typeof b.uid === "string" && /^[\w-]{10,128}$/.test(b.uid) ? b.uid : null;
  const status = uid ? "account" : "reserved";

  const att = await attribution();
  const { region, borough } = regionFor(zip);
  const [firstName, ...rest] = name.split(/\s+/);

  // One contact per email, whether they came from a list or straight here.
  const contact = await one<{ id: number }>(
    `insert into contacts (email, first_name, last_name, business_name, phone, zip, region, borough, trades,
       source, lang, stage, verify_status, tags)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], 'landing', $10, 'registered', 'valid', $11::text[])
     on conflict (email) do update set
       first_name    = coalesce(contacts.first_name, excluded.first_name),
       last_name     = coalesce(contacts.last_name, excluded.last_name),
       business_name = coalesce(nullif(excluded.business_name, ''), contacts.business_name),
       phone         = coalesce(excluded.phone, contacts.phone),
       zip           = excluded.zip,
       region        = excluded.region,
       lang          = excluded.lang,
       verify_status = 'valid',
       trades        = array(select distinct unnest(contacts.trades || excluded.trades)),
       tags          = array(select distinct unnest(contacts.tags || excluded.tags)),
       updated_at    = now()
     returning id`,
    [email, firstName, rest.join(" ") || null, business || null, phone, zip, region, borough, pgArray(trades), lang, pgArray([role, "registered"])],
  );
  const contactId = contact!.id;

  const existing = await one<{ ref_code: string }>(`select ref_code from registrations where email = $1 and role = $2`, [email, role]);
  let refCode = existing?.ref_code;
  if (existing) {
    await q(
      `update registrations set name=$3, business_name=$4, phone=$5, zip=$6, trades=$7::text[], crew_need=$8, lang=$9,
         consent_email=$10, consent_sms=$11, firebase_uid=coalesce($12, firebase_uid),
         status=case when $12::text is null then status else $13 end
       where email=$1 and role=$2`,
      [email, role, name, business || null, phone, zip, pgArray(trades), need, lang, !!b.consentEmail, !!b.consentSms, uid, status],
    );
  } else {
    refCode = token(5);
    await q(
      `insert into registrations (contact_id, campaign_id, send_id, visitor_id, role, name, business_name, email, phone, zip,
         trades, crew_need, lang, consent_email, consent_sms, referred_by, ref_code, utm, firebase_uid, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::text[],$12,$13,$14,$15,$16,$17,$18::jsonb,$19,$20)`,
      [
        contactId, att.campaignId, att.sendId, att.visitorId, role, name, business || null, email, phone, zip,
        pgArray(trades), need, lang, !!b.consentEmail, !!b.consentSms, referredBy, refCode,
        JSON.stringify(att.campaignCode ? { campaign: att.campaignCode } : {}),
        uid,
        status,
      ],
    );
  }

  // Registered people never get another cold email — including the invited
  // contact if they signed up under a different address.
  for (const id of new Set([contactId, att.contactId].filter(Boolean) as number[])) {
    await advanceStage(id, "registered");
    await stopSequences(id, "registered");
  }
  await recordEvent("register", { ...att, contactId }, { meta: { role, lang, trades: trades.length, referredBy, repeat: !!existing, account: !!uid } });

  return NextResponse.json({ ok: true, refCode });
}
