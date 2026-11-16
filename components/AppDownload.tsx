"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Btn from "./Btn";
import { lenisRef } from "./SmoothScroll";
import { AppleIcon, GooglePlayIcon, CloseIcon } from "./Icons";
import { copy, type Lang } from "@/lib/copy";
import { track } from "./join/track-client";
import { ShortLabel } from "./Collapse";

type Props = {
  big?: boolean;
  outlined?: boolean;
  className?: string;
  /**
   * Names the placement (chrome, signup, contractors, invite, success) so the
   * email dashboard can tell where a download came from, and which path it
   * belongs to: everything but `success` is someone choosing the app over the
   * sign-up form.
   */
  from: string;
  lang?: Lang;
  /** Folds the label to "Get the app" (the parked chrome). */
  short?: boolean;
  /** Overrides the button's face. The QR dialog keeps the download wording
   *  regardless, since that is what the dialog is for. */
  children?: ReactNode;
};

/** Touch devices start true: that's the plain link, so it's what renders on the
 *  server and what a client without JS keeps. */
export function useTouch() {
  const [touch, setTouch] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return touch;
}

/**
 * Download button. On a touch device it just goes to /app, where the phone can
 * install the thing it's holding. On a pointer device that link is a dead end,
 * so it opens a QR to hand the download across to a phone instead.
 *
 * For campaign traffic the QR is drawn per visitor (/api/qr): it carries their
 * signed email link, so a scan on a phone that has none of this browser's
 * cookies is still credited to the contractor the email went to. Everyone else
 * gets the site's own QR.
 */
export default function AppDownload({ big, outlined, className, from, lang = "en", short = false, children }: Props) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState("/images/DW-QR.svg");
  const touch = useTouch();
  const t = copy[lang].cta;

  const close = useCallback(() => {
    setOpen(false);
    lenisRef.current?.start();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const label = (fold: boolean) => (
    <>
      <AppleIcon />
      <ShortLabel full={t.app} short={t.appShort} hide={fold} />
      <GooglePlayIcon />
    </>
  );

  return (
    <>
      <Btn
        href={`/app?from=${from}`}
        big={big}
        outlined={outlined}
        className={className}
        onClick={(e) => {
          if (from !== "success") track("path_select", { path: "app", from });
          if (touch) return;
          e.preventDefault();
          if (/(?:^|;\s*)(dw_inv|dw_src)=/.test(document.cookie)) setQr(`/api/qr?from=${from}`);
          setOpen(true);
          track("qr_open", { from });
          lenisRef.current?.stop();
        }}
      >
        {children ?? label(short)}
      </Btn>

      {/* Portalled to the body: these buttons sit inside the tinted-blur boxes,
          and backdrop-filter makes an ancestor a containing block for fixed
          children — inset-0 would resolve to the button's box, not the
          viewport. */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-5"
          role="dialog"
          aria-modal="true"
          aria-label={t.dialog}
          data-layer="qr"
          data-lenis-prevent
          onClick={close}
        >
          <div
            className="relative flex w-full max-w-[440px] flex-col items-center gap-8 border-[3px] border-black bg-white px-8 py-12"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label={t.close}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center bg-yellow text-black transition-colors duration-100 ease-linear hover:bg-black hover:text-yellow"
            >
              <CloseIcon className="h-4 w-4" />
            </button>

            <img
              src={qr}
              alt={t.qrAlt}
              className="w-[230px] max-w-full"
            />

            <p className="max-w-[30ch] text-center text-base leading-relaxed">
              {t.qr}
            </p>

            <Btn href={`/app?from=${from}`} outlined>
              {label(false)}
            </Btn>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
