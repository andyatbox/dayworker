import Papa from "papaparse";
import { q } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

/** CSV of every sign-up, shaped for handing to the app team for account creation. */
export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const rows = await q<Record<string, unknown>>(
    `select r.created_at, r.role, r.name, r.business_name, r.email, r.phone, r.zip, array_to_string(r.trades, '; ') as trades,
       r.crew_need, r.lang, r.consent_email, r.consent_sms, c.code as campaign, r.referred_by, r.ref_code, r.status
     from registrations r left join campaigns c on c.id = r.campaign_id order by r.id`,
  );
  return new Response(Papa.unparse(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="dayworker-signups-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
