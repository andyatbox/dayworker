"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { copy } from "@/lib/copy";
import { lenisRef } from "../SmoothScroll";
import { CloseIcon } from "../Icons";
import AppDownload from "../AppDownload";
import SignupButton from "./SignupButton";
import { SIGNUP_EVENT, qrOpen, useInvite } from "./invite";
import { track } from "./track-client";

const SEEN = "dw_invite_seen";

/** Both buttons one width, one line, even on a small phone. */
const BTN = "w-full whitespace-nowrap max-sm:gap-2 max-sm:px-3 max-sm:text-[11px] max-sm:tracking-[0.1em]";

/**
 * The personal invitation, for someone who just clicked the link in their
 * email: who it's for, the Founding Member offer, and the same two ways in as
 * the rest of the site. Shown once per email click (each click stamps a new
 * dw_inv), never to someone who has already joined, and out of the way the
 * moment they choose either path or close it.
 */
export default function InviteModal() {
  const invite = useInvite();
  const [open, setOpen] = useState(false);

  const close = useCallback((how: string) => {
    setOpen(false);
    lenisRef.current?.start();
    track("invite_close", { how });
  }, []);

  useEffect(() => {
    if (!invite?.invited || invite.joined) return;
    let seen = "";
    try {
      seen = localStorage.getItem(SEEN) ?? "";
    } catch {}
    if (seen && seen === invite.visit) return;
    // A beat after load, so the site is there behind it.
    const t = setTimeout(() => {
      try {
        localStorage.setItem(SEEN, invite.visit);
      } catch {}
      setOpen(true);
      lenisRef.current?.stop();
      track("invite_view");
    }, 700);
    return () => clearTimeout(t);
  }, [invite]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !qrOpen()) close("escape");
    };
    // "Sign up now" hands over to the sign-up panel.
    const onSignup = () => {
      setOpen(false);
      track("invite_close", { how: "signup" });
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(SIGNUP_EVENT, onSignup);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(SIGNUP_EVENT, onSignup);
    };
  }, [open, close]);

  if (!open || !invite) return null;
  const t = copy[invite.lang];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/85 p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-title"
      data-lenis-prevent
      onClick={() => close("backdrop")}
    >
      <div
        className="relative my-auto w-full max-w-[560px] border-[3px] border-black bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b-[3px] border-black bg-yellow py-3 pl-5 pr-3 md:pl-8">
          <img src="/logos/DW-Black-Logotype.svg" alt="Dayworker" className="h-6 w-auto" />
          <button
            type="button"
            onClick={() => close("x")}
            aria-label={t.cta.close}
            className="flex h-10 w-10 items-center justify-center bg-black text-yellow transition-colors duration-100 ease-linear hover:bg-white hover:text-black"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-6 md:gap-6 md:px-8 md:py-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.3em]">
            <span className="bg-black px-2 py-1 text-white">{t.invite.eyebrow}</span>
          </p>
          <h2 id="invite-title" className="display text-[clamp(2.4rem,7vw,3.8rem)]">
            {t.invite.title(invite.first)}
          </h2>
          <p className="text-base leading-relaxed md:text-xl">{t.invite.body(invite.business)}</p>
          <p className="border-l-[6px] border-black bg-yellow px-4 py-3 text-sm font-extrabold leading-relaxed md:text-base">
            {t.invite.offer}
          </p>

          <div className="flex flex-col gap-3">
            <AppDownload from="invite" lang={invite.lang} outlined className={BTN} />
            <SignupButton from="invite" lang={invite.lang} outlined className={BTN} />
          </div>
          <button
            type="button"
            onClick={() => close("later")}
            className="self-center text-sm font-semibold underline underline-offset-4 hover:bg-yellow"
          >
            {t.invite.later}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
