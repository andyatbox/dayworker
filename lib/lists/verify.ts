import { promises as dns } from "node:dns";
import { q } from "../db";
import { FREE_MAIL } from "./signals";

/**
 * Free first-pass verification: syntax, typo domains, disposable domains,
 * addresses nobody reads, and whether the domain accepts mail at all (MX).
 *
 * It cannot tell whether a particular mailbox exists — only an SMTP probe
 * can, and probing from a home or cloud IP gets that IP listed. For the first
 * big send, run the `valid` segment through a paid verifier (~$0.003/address)
 * and import the result as suppressions; the sender also auto-pauses on
 * bounces as the backstop.
 */
const TYPO_DOMAINS = new Set([
  "gmial.com", "gmai.com", "gmail.co", "gmail.cm", "gamil.com", "gnail.com", "yahoo.co",
  "yaho.com", "hotmial.com", "hotmail.co", "outlok.com", "aol.co", "icloud.co",
]);
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "yopmail.com",
  "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com",
]);
const DEAD_LOCALS = /^(no-?reply|do-?not-?reply|postmaster|abuse|webmaster|mailer-daemon|hostmaster)$/;
const ROLE_LOCALS = /^(info|office|admin|sales|contact|support|billing|accounts?|hr|jobs|careers|estimates?|service|hello|mail)$/;

type Verdict = { status: "valid" | "risky" | "invalid"; reason: string | null };

const mxCache = new Map<string, Promise<boolean | null>>();

/** true = accepts mail, false = definitely not, null = couldn't tell (retry later). */
function hasMx(domain: string): Promise<boolean | null> {
  if (FREE_MAIL.has(domain)) return Promise.resolve(true);
  let p = mxCache.get(domain);
  if (!p) {
    p = dns
      .resolveMx(domain)
      .then((mx) => mx.length > 0)
      .catch(async (err: NodeJS.ErrnoException) => {
        if (err.code === "ENOTFOUND" || err.code === "ENODATA") {
          // No MX: RFC 5321 falls back to the A record.
          return dns.resolve4(domain).then((a) => a.length > 0, () => false);
        }
        return null;
      });
    mxCache.set(domain, p);
  }
  return p;
}

export async function verifyEmail(email: string): Promise<Verdict | null> {
  const m = /^([^\s@]+)@([a-z0-9.-]+\.[a-z]{2,})$/i.exec(email);
  if (!m) return { status: "invalid", reason: "syntax" };
  const [, local, domain] = m;
  if (TYPO_DOMAINS.has(domain)) return { status: "invalid", reason: "typo-domain" };
  if (DISPOSABLE.has(domain)) return { status: "invalid", reason: "disposable" };
  if (DEAD_LOCALS.test(local)) return { status: "invalid", reason: "unmonitored" };
  const mx = await hasMx(domain);
  if (mx === null) return null;
  if (!mx) return { status: "invalid", reason: "no-mail-server" };
  // Shared inboxes are normal for small contractors (the owner reads info@),
  // but they draw more complaints, so they're sent last.
  if (ROLE_LOCALS.test(local)) return { status: "risky", reason: "role-address" };
  return { status: "valid", reason: null };
}

/** Verifies up to `limit` unverified contacts. Call repeatedly until 0 remain. */
export async function verifyPending(limit = 3000) {
  const rows = await q<{ id: number; email: string }>(
    `select id, email from contacts where email is not null and verify_status = 'unverified'
     order by fit_score desc limit $1`,
    [limit],
  );
  const counts: Record<string, number> = { valid: 0, risky: 0, invalid: 0, retry: 0 };
  const results: { id: number; status: string; reason: string | null }[] = [];

  // Bounded concurrency so a big list doesn't flood the resolver.
  let i = 0;
  await Promise.all(
    Array.from({ length: 24 }, async () => {
      while (i < rows.length) {
        const r = rows[i++];
        const v = await verifyEmail(r.email);
        if (!v) {
          counts.retry++;
          continue;
        }
        counts[v.status]++;
        results.push({ id: r.id, status: v.status, reason: v.reason });
      }
    }),
  );

  for (let j = 0; j < results.length; j += 2000) {
    await q(
      `update contacts c set verify_status = x.status, verify_reason = x.reason, updated_at = now()
       from jsonb_to_recordset($1::jsonb) as x(id int, status text, reason text)
       where c.id = x.id`,
      [JSON.stringify(results.slice(j, j + 2000))],
    );
  }
  const [{ remaining }] = await q<{ remaining: number }>(
    `select count(*)::int as remaining from contacts where email is not null and verify_status = 'unverified'`,
  );
  return { checked: rows.length, ...counts, remaining };
}
