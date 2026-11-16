"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Btn from "./Btn";
import { PlayIcon } from "./Icons";
import Collapse from "./Collapse";
import { SLAB_CLASS, parkedStore, videoRestTop } from "./chromeLayout";
import { useParked } from "./useParked";
import { useSiteCopy } from "./Lang";

/**
 * The hero's video CTA. It starts down beside the tagline and rides up with the
 * page until it parks beneath the chrome above it, dropping "Dayworker" from
 * the label as it lands so the parked button stays compact. Being the last
 * slab to park, it's the one that says when the whole column has (parkedStore),
 * which folds the labels above it too.
 *
 * Clamped by hand rather than with `position: sticky`, which would stop holding
 * the moment the hero scrolled past — the same reason LogoSwap and StickyChrome
 * do it this way.
 */
export default function StickyVideo({ onClick }: { onClick: () => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const parked = useParked();
  const t = useSiteCopy().hero;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const h = holder.current;
      const b = box.current;
      if (h && b) {
        const r = h.getBoundingClientRect();
        // Derived each frame from the boxes above, which depend on the
        // measured strip and on whether the account box is showing.
        const rest = videoRestTop();
        b.style.top = `${Math.max(rest, r.top)}px`;
        // Right-anchored to the holder, which spans its grid column, so the
        // button stays flush with the chrome above. Its width is its label's.
        b.style.right = `${document.documentElement.clientWidth - r.right}px`;
        parkedStore.set(r.top <= rest);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const button = (
    <div
      ref={box}
      data-video-slab
      className={`intro fixed z-[60] flex items-center gap-3 border-[2px] border-black bg-white/70 px-3 backdrop-blur-md ${SLAB_CLASS}`}
    >
      <Btn
        onClick={onClick}
        className="max-sm:gap-2 max-sm:px-4 max-sm:py-2.5 max-sm:text-[10px] max-sm:tracking-[0.12em]"
      >
        <PlayIcon className="h-[1.1em] w-[1.1em]" />
        <span className="whitespace-nowrap">
          {t.videoLead && <Collapse hide={parked}>{t.videoLead}</Collapse>}
          {t.video}
          {t.videoTail && <Collapse hide={parked}>{t.videoTail}</Collapse>}
        </span>
      </Btn>
    </div>
  );

  return (
    <div ref={holder} className={`w-full ${SLAB_CLASS}`}>
      {mounted && createPortal(button, document.body)}
    </div>
  );
}
