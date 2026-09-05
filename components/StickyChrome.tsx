"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Btn from "./Btn";
import AppDownload from "./AppDownload";
import { SHOW_ACCOUNT_CTA } from "./featureFlags";
import { APP_BOX_H, CHROME_H, chromeRestTop } from "./chromeLayout";

/** Tinted-blur slab, matching the hero's video CTA. */
const BOX =
  "flex items-center gap-3 border-[3px] border-black bg-white/70 px-3 backdrop-blur-md";

/**
 * App and account boxes. They start in the hero's flow, a gap below the jump-to
 * strip, and ride up with it until they park flush against the strip's bottom
 * edge — sharing its stroke, so the column reads as one piece. Sticky behaviour
 * driven manually, the same way LogoSwap works, because a real `position:
 * sticky` would stop holding once the hero scrolled past.
 */
export default function StickyChrome() {
  const holder = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const h = holder.current;
      const b = box.current;
      if (h && b) {
        const r = h.getBoundingClientRect();
        // Read each frame: the strip is measured, not assumed, and it goes
        // away below 900px.
        b.style.top = `${Math.max(chromeRestTop(), r.top)}px`;
        // Right-aligned to the holder; clientWidth excludes any scrollbar.
        b.style.right = `${document.documentElement.clientWidth - r.right}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const chrome = (
    <div ref={box} className="fixed z-[60] flex flex-col items-end">
      <div className={BOX} style={{ height: APP_BOX_H }}>
        <AppDownload />
      </div>

      {/* Pulled up by one border width so the two boxes share a single stroke. */}
      {SHOW_ACCOUNT_CTA && (
        <div className={`${BOX} -mt-[3px] h-[58px]`}>
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
    <div ref={holder} className="w-full" style={{ height: CHROME_H }}>
      {mounted && createPortal(chrome, document.body)}
    </div>
  );
}
