import { NextResponse } from "next/server";
import { databaseUrl, one } from "@/lib/db";
import { firebaseSignupReady } from "@/lib/firebase/config";

/**
 * Is the live site wired up? Says only whether each piece is configured and
 * reachable, never any address, key or row, so it is safe to leave public.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  let db: string;
  if (!databaseUrl() && process.env.VERCEL) db = "missing: no DATABASE_URL in this environment";
  else {
    try {
      const r = await one<{ n: number }>(`select count(*)::int as n from campaigns`);
      db = r ? "ok" : "no answer";
    } catch (e) {
      const err = e as { code?: string; errno?: string };
      db = `error ${err.code ?? err.errno ?? (e instanceof Error ? e.name : "unknown")}`;
    }
  }
  const body = {
    db,
    signup: firebaseSignupReady ? "ok" : "missing Firebase or Maps settings",
    secrets: {
      APP_SECRET: !!process.env.APP_SECRET,
      BLAST_PASSWORD: !!process.env.BLAST_PASSWORD,
      CRON_SECRET: !!process.env.CRON_SECRET,
    },
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
