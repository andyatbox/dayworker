import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { attribution } from "@/lib/track";
import { shortBusiness } from "@/lib/util";

/**
 * Who the visitor is, for the invitation pop-up and the sign-up form's
 * prefill. Answers only from the signed email cookie (dw_att), so a visitor
 * only ever sees the details of the email they were sent. The home page stays
 * static; this is the one per-visitor request, and only campaign traffic makes
 * it.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const att = await attribution();
  const tracked = !!(att.contactId || att.campaignCode);
  const contact = att.contactId
    ? await one<{ first_name: string | null; business_name: string | null; email: string | null; zip: string | null; trades: string[]; lang: string; stage: string; tags: string[] }>(
        `select first_name, business_name, email, zip, trades, lang, stage, tags from contacts where id = $1`,
        [att.contactId],
      )
    : undefined;

  const body = contact
    ? {
        invited: true,
        tracked,
        joined: ["registered", "app", "member"].includes(contact.stage),
        first: contact.first_name?.split(/\s+/)[0] ?? "",
        business: shortBusiness(contact.business_name),
        email: contact.email ?? "",
        zip: contact.zip ?? "",
        trades: contact.trades ?? [],
        // Invitation emails only go to hiring contractors.
        role: "contractor",
        lang: contact.lang === "es" ? "es" : "en",
      }
    : { invited: false, tracked };

  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
