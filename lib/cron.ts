import { timingSafeEqual } from "node:crypto";
import { config } from "./config";

/** Cron calls carry CRON_SECRET as a Bearer token (Vercel Cron does this itself) or ?key=. */
export function cronAuthorized(req: Request) {
  if (!config.cronSecret) return false;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(req.url).searchParams.get("key") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(config.cronSecret);
  return a.length === b.length && timingSafeEqual(a, b);
}
