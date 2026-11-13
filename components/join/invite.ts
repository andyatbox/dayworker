"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Lang } from "@/lib/copy";

/**
 * Who's visiting, for the sign-up layer. Only people who came from a campaign
 * (an email link sets dw_inv, a ?c= code sets dw_src) cost a request; everyone
 * else browsing dayworker.co gets the empty answer straight away and is never
 * tracked.
 */
export type Invite = {
  /** Arrived from their own email link. */
  invited: boolean;
  /** Campaign traffic of any kind, email or ?c= code. Drives tracking. */
  tracked: boolean;
  /** Already signed up or in the app, so there's nothing to invite them to. */
  joined: boolean;
  /** Changes with every email click, so each click shows the invitation once. */
  visit: string;
  first: string;
  business: string;
  email: string;
  zip: string;
  trades: string[];
  role: "contractor" | "worker";
  lang: Lang;
};

const cookie = (name: string) => document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] ?? "";

function urlLang(): Lang | null {
  const l = new URLSearchParams(location.search).get("lang");
  return l === "es" || l === "en" ? l : null;
}

/** A crew-invite link says role=worker; that beats whatever we know. */
function urlRole(): Invite["role"] | null {
  const r = new URLSearchParams(location.search).get("role");
  return r === "worker" || r === "contractor" ? r : null;
}

function empty(): Invite {
  return { invited: false, tracked: false, joined: false, visit: "", first: "", business: "", email: "", zip: "", trades: [], role: urlRole() ?? "contractor", lang: urlLang() ?? "en" };
}

let state: Invite | null = null;
let pending: Promise<Invite> | null = null;
const subs = new Set<() => void>();

export function loadInvite() {
  pending ??= (async () => {
    const base = empty();
    if (!cookie("dw_inv") && !cookie("dw_src")) return base;
    try {
      const res = await fetch("/api/invite", { cache: "no-store" });
      const data = (await res.json()) as Partial<Invite>;
      // Invitation emails go to hiring contractors only, so a visit that
      // arrives prefilled from one always starts on "Hiring contractor".
      const role = data.invited ? "contractor" : (urlRole() ?? data.role ?? base.role);
      return { ...base, ...data, visit: cookie("dw_inv"), role, lang: urlLang() ?? data.lang ?? base.lang };
    } catch {
      return base;
    }
  })().then((v) => {
    state = v;
    subs.forEach((f) => f());
    return v;
  });
  return pending;
}

/** null until known. */
export function useInvite() {
  useEffect(() => {
    loadInvite();
  }, []);
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
    () => null,
  );
}

/**
 * The QR dialog can open on top of the invitation or the sign-up panel. While
 * it's up, Escape is its alone, so the layer underneath stays put.
 */
export const qrOpen = () => !!document.querySelector('[data-layer="qr"]');

/** Every "Sign up now" button opens the one sign-up panel through this. */
export const SIGNUP_EVENT = "dw:signup";

export function openSignup(from: string) {
  window.dispatchEvent(new CustomEvent(SIGNUP_EVENT, { detail: { from } }));
}
