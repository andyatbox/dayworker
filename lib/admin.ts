import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sign, unsign } from "./util";

/**
 * One shared admin password (BLAST_PASSWORD) and a signed, httpOnly session
 * cookie. Enough for a small team; swap for Supabase Auth if it grows.
 */
const COOKIE = "dw_blast";
const TTL_MS = 1000 * 60 * 60 * 24 * 14;

export async function isAdmin() {
  const v = unsign((await cookies()).get(COOKIE)?.value);
  const ts = v?.startsWith("admin:") ? Number(v.slice(6)) : 0;
  return ts > 0 && Date.now() - ts < TTL_MS;
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/blast/login");
}

export async function startSession() {
  (await cookies()).set(COOKIE, sign(`admin:${Date.now()}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: TTL_MS / 1000,
    path: "/",
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}
