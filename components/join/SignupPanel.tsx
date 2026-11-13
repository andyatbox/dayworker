"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { copy, TRADES } from "@/lib/copy";
import { lenisRef } from "../SmoothScroll";
import { CloseIcon } from "../Icons";
import JoinForm, { type Role } from "./JoinForm";
import { SIGNUP_EVENT, qrOpen, useInvite } from "./invite";
import { track } from "./track-client";

/**
 * The full sign-up form, in a panel that slides in from the right. Every "Sign
 * up now" button opens it through openSignup(), and a crew-invite link
 * (?ref=…) or ?signup opens it on arrival. Mouse-and-keyboard devices only;
 * touch devices are pointed at the app instead.
 *
 * Stays mounted once opened, so closing it by accident doesn't lose what was
 * typed.
 */
export default function SignupPanel() {
  const invite = useInvite();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  // The role picked in the form; until then, the one the visit arrived with.
  const [picked, setPicked] = useState<Role | null>(null);
  const panel = useRef<HTMLElement>(null);

  const show = useCallback((from: string) => {
    setOpen(true);
    lenisRef.current?.stop();
    track("signup_open", { from });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    lenisRef.current?.start();
  }, []);

  useEffect(() => {
    setMounted(true);
    const onOpen = (e: Event) => show((e as CustomEvent<{ from: string }>).detail?.from ?? "button");
    window.addEventListener(SIGNUP_EVENT, onOpen);
    // A link can open it on arrival, except on a phone, where the app is the
    // way in and the page's own buttons say so.
    const sp = new URLSearchParams(location.search);
    const touch = matchMedia("(pointer: coarse)").matches;
    if (!touch && (sp.has("ref") || sp.has("signup"))) show(sp.has("ref") ? "crew_invite" : "link");
    return () => window.removeEventListener(SIGNUP_EVENT, onOpen);
  }, [show]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !qrOpen()) close();
    };
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!mounted) return null;
  const lang = invite?.lang ?? "en";
  const t = copy[lang];
  const role = picked ?? invite?.role ?? "contractor";

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] transition-[visibility] duration-300 ${open ? "visible" : "invisible"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t.signup.eyebrow}
        tabIndex={-1}
        data-lenis-prevent
        className={`absolute inset-y-0 right-0 flex w-full max-w-[680px] flex-col overflow-y-auto overscroll-contain border-l-[3px] border-black bg-white outline-none transition-transform duration-300 ease-[cubic-bezier(0.85,0,0.15,1)] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b-[3px] border-black bg-yellow px-5 py-3 md:px-10">
          <span className="text-xs font-extrabold uppercase tracking-[0.3em]">{t.signup.eyebrow}</span>
          <button
            type="button"
            onClick={close}
            aria-label={t.cta.close}
            className="flex h-10 w-10 items-center justify-center bg-black text-yellow transition-colors duration-100 ease-linear hover:bg-white hover:text-black"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-8 px-5 py-8 md:px-10 md:py-12">
          {!done && (
            <div>
              <h2 className="display text-[clamp(2.2rem,5vw,3.6rem)]">{t.signup.title}</h2>
              <p className="mt-4 text-base leading-relaxed md:text-lg">
                {role === "contractor" ? t.signup.subContractor : t.signup.subWorker}
              </p>
              {/* Workers never pay, so the Founding Member offer is for hiring contractors only. */}
              {role === "contractor" && (
                <p className="mt-5 border-[3px] border-black bg-yellow px-4 py-3 text-sm font-extrabold leading-relaxed">
                  {t.signup.offerContractor}
                </p>
              )}
            </div>
          )}
          {/* Rendered once we know who's visiting, so an invited contractor's
              details arrive already filled in. */}
          {invite && (
            <JoinForm
              key={invite.visit || "visitor"}
              lang={lang}
              onRole={setPicked}
              defaults={{
                role: invite.role,
                name: invite.first,
                business: invite.business,
                email: invite.email,
                zip: invite.zip,
                trades: invite.trades.filter((x) => TRADES.some((tr) => tr.key === x)),
              }}
              onDone={() => {
                setDone(true);
                panel.current?.scrollTo({ top: 0 });
              }}
            />
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
