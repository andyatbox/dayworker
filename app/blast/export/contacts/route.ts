import Papa from "papaparse";
import type { NextRequest } from "next/server";
import { q } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { cleanFilter, whereFor } from "@/lib/segments";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const filter = cleanFilter(Object.fromEntries(req.nextUrl.searchParams));
  const params: unknown[] = [];
  const rows = await q<Record<string, unknown>>(
    `select email, first_name, last_name, business_name, phone, address, city, state, zip, region, borough,
       array_to_string(trades, '; ') as trades, license_type, license_number, source, lang, fit_score, verify_status, stage,
       array_to_string(tags, '; ') as tags
     from contacts c where ${whereFor(filter, params)} order by fit_score desc, id`,
    params,
  );
  return new Response(Papa.unparse(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="dayworker-contacts-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
