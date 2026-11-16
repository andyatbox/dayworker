"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Btn from "./Btn";
import AppDownload from "./AppDownload";
import SignupButton from "./join/SignupButton";
import { SHOW_ACCOUNT_CTA } from "./featureFlags";
import { CHROME_CLASS, SLAB_CLASS, chromeRestTop } from "./chromeLayout";
import { useParked } from "./useParked";
import { LangToggle, useLang } from "./Lang";

/** Tinted-blur slab, matching the hero's video CTA. */
const BOX =
  "flex items-center gap-3 border-[2px] border-black bg-white/70 px-3 backdrop-blur-md";

/**
 * Phones get the house small button inside the compact slab, and the app
 * button drops its store marks so its label still fits beside the mark.
 */
const SM_BTN = "max-sm:gap-2 max-sm:px-4 max-sm:py-2.5 max-sm:text-[10px] max-sm:tracking-[0.12em]";

/**
 * The language switch, then the ways in, stacked: get the app & sign up, and sign up now beneath it (the
 * form, so mouse-and-keyboard devices only; a phone is better off in the app).
 * They start in the hero's flow at the top of the page and ride up with it
 * until they park at PARK_TOP, level with the mark; the video box below shares
 * their bottom stroke, so the column reads as one piece. Each slab is as wide
 * as its own label, right-aligned; once parked, the labels shorten and the
 * slabs with them.
 * Sticky behaviour driven manually, the same way LogoSwap works, because a
 * real `position: sticky` would stop holding once the hero scrolled past.
 */
export default function StickyChrome() {
  const holder = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const parked = useParked();
  const { lang } = useLang();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const h = holder.current;
      const b = box.current;
      if (h && b) {
        const r = h.getBoundingClientRect();
        const rest = chromeRestTop();
        b.style.top = `${Math.max(rest, r.top)}px`;
        // Right-aligned to the holder; clientWidth excludes any scrollbar.
        b.style.right = `${document.documentElement.clientWidth - r.right}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const chrome = (
    <div ref={box} className="intro fixed z-[60] flex flex-col items-end">
      {/* The language switch heads the column; the slabs sit a gap below. */}
      <div className="mb-2">
        <LangToggle />
      </div>

      <div className={`${BOX} ${SLAB_CLASS}`}>
        <AppDownload from="chrome" lang={lang} short={parked} className={`${SM_BTN} max-sm:[&>svg]:hidden`} />
      </div>

      {/* Pulled up by one border width so the boxes share a single stroke. */}
      <div className={`${BOX} ${SLAB_CLASS} -mt-[2px] touch:hidden`}>
        <SignupButton from="chrome" lang={lang} short={parked} className={SM_BTN} />
      </div>

      {SHOW_ACCOUNT_CTA && (
        <div className={`${BOX} -mt-[2px] h-[58px]`}>
          <Btn href="#signup" small>
            Get started
          </Btn>
          <Btn href="#signin" small>
            Sign in
          </Btn>
        </div>
      )}
    </div>
  );

  return (
    <div ref={holder} className={`w-full ${CHROME_CLASS}`}>
      {mounted && createPortal(chrome, document.body)}
    </div>
  );
}
