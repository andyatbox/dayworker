import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "./config";

/** URL-safe random token for send links, visitor ids and share codes. */
export function token(bytes = 9) {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Fails closed: with no APP_SECRET (production without the env var) every
 * signature would be computable by anyone, the /blast session included, so
 * nothing is signed and nothing verifies.
 */
export function sign(value: string) {
  if (!config.appSecret) throw new Error("APP_SECRET is not set");
  const mac = createHmac("sha256", config.appSecret).update(value).digest("base64url");
  return `${value}.${mac}`;
}

export function unsign(signed: string | undefined): string | undefined {
  if (!signed || !config.appSecret) return;
  const i = signed.lastIndexOf(".");
  if (i < 1) return;
  const value = signed.slice(0, i);
  const a = Buffer.from(sign(value));
  const b = Buffer.from(signed);
  return a.length === b.length && timingSafeEqual(a, b) ? value : undefined;
}

export function normEmail(email: string | null | undefined) {
  const e = (email ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e) ? e : "";
}

export function normPhone(phone: string | number | null | undefined) {
  if (phone == null) return "";
  // Spreadsheet exports store phones as floats ("6.312881226E9").
  const raw = typeof phone === "number" || /e\d+$/i.test(String(phone))
    ? Math.round(Number(phone)).toString()
    : String(phone);
  const digits = raw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : "";
}

export function titleCase(s: string | null | undefined) {
  return (s ?? "")
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(Llc|Inc|Corp|Ltd|Nyc|Ny|Nj|Hvac|Ii|Iii)\b/g, (m) => m.toUpperCase())
    .trim();
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** "Acme Builders LLC" → "Acme Builders". Reads like a person typed it, not a mail merge. */
export function shortBusiness(name: string | null | undefined): string {
  return (name ?? "").replace(/(?<!&)(?:[\s,.]+(?:l\.?l\.?c|inc|corp|corporation|co|ltd|llp|pc)\.?)+$/i, "").trim();
}
