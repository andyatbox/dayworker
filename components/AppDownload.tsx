"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Btn from "./Btn";
import { lenisRef } from "./SmoothScroll";
import { AppleIcon, GooglePlayIcon, CloseIcon } from "./Icons";

type Props = {
  big?: boolean;
  outlined?: boolean;
  /** Overrides the button's face. The QR dialog keeps the download wording
   *  regardless, since that is what the dialog is for. */
  children?: ReactNode;
};

/**
 * Download button. On a touch device it just goes to /app, where the phone can
 * install the thing it's holding. On a pointer device that link is a dead end,
 * so it opens a QR to hand the download across to a phone instead.
 *
 * Starts in the touch state: that's the plain link, so it's what renders on the
 * server and what a client without JS keeps.
 */
export default function AppDownload({ big, outlined, children }: Props) {
  const [open, setOpen] = useState(false);
  const [touch, setTouch] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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

  const label = (
    <>
      <AppleIcon />
      <span>Download the app</span>
      <GooglePlayIcon />
    </>
  );

  return (
    <>
      <Btn
        href="/app"
        big={big}
        outlined={outlined}
        onClick={(e) => {
          if (touch) return;
          e.preventDefault();
          setOpen(true);
          lenisRef.current?.stop();
        }}
      >
        {children ?? label}
      </Btn>

      {/* Portalled to the body: these buttons sit inside the tinted-blur boxes,
          and backdrop-filter makes an ancestor a containing block for fixed
          children — inset-0 would resolve to the button's box, not the
          viewport. */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Download the Dayworker app"
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
              aria-label="Close"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center bg-yellow text-black transition-colors duration-100 ease-linear hover:bg-black hover:text-yellow"
            >
              <CloseIcon className="h-4 w-4" />
            </button>

            <img
              src="/images/DW-QR.svg"
              alt="QR code linking to the Dayworker app"
              className="w-[230px] max-w-full"
            />

            <p className="max-w-[26ch] text-center text-base leading-relaxed">
              Scan the QR code to download to your mobile device
            </p>

            <Btn href="/app" outlined>
              {label}
            </Btn>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
