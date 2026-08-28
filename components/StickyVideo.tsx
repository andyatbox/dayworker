"use client";

import { useEffect, useRef, useState } from "react";
import Btn from "./Btn";
import { PlayIcon } from "./Icons";

/**
 * Where it settles: the chrome stack runs 12 → 146 (12 top inset, a 79px app
 * box and a 58px account box sharing one 3px border), and this shares a border
 * with it in turn, so the three read as one connected column.
 */
const REST_TOP = 12 + 79 + 58 - 3 - 3;

/** Slab height, matching the app box above it. */
const BOX_H = 79;

/**
 * The hero's video CTA. It starts down beside the tagline and rides up with the
 * page until it parks beneath the account box, dropping "Dayworker" from the
 * label as it lands so the parked button stays compact.
 *
 * Clamped by hand rather than with `position: sticky`, which would stop holding
 * the moment the hero scrolled past — the same reason LogoSwap and StickyChrome
 * do it this way.
 */
export default function StickyVideo({ onClick }: { onClick: () => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [parked, setParked] = useState(false);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const h = holder.current;
      const b = box.current;
      if (h && b) {
        const r = h.getBoundingClientRect();
        b.style.top = `${Math.max(REST_TOP, r.top)}px`;
        // Right-anchored to the holder, which spans its grid column, so the
        // button stays flush with the chrome above whatever its width.
        b.style.right = `${document.documentElement.clientWidth - r.right}px`;
        const next = r.top <= REST_TOP;
        setParked((p) => (p === next ? p : next));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={holder} className="w-full" style={{ height: BOX_H }}>
      <div
        ref={box}
        className="fixed z-50 flex items-center gap-3 border-[3px] border-black bg-white/70 px-3 backdrop-blur-md"
        style={{ height: BOX_H }}
      >
        <Btn onClick={onClick} className="attention">
          <PlayIcon className="h-[1.1em] w-[1.1em]" />
          {/* One text node, so the collapsing word doesn't leave the button's
              own flex gap behind it. The 1fr→0fr grid track animates to the
              word's own width — capping a max-width instead would need a
              magic number, and anything short of the tracked uppercase text
              clips its trailing space, welding the two words together. */}
          <span className="whitespace-nowrap">
            <span
              className="inline-grid align-bottom transition-[grid-template-columns,opacity] duration-[260ms] ease-[cubic-bezier(0.85,0,0.15,1)]"
              style={{
                gridTemplateColumns: parked ? "0fr" : "1fr",
                opacity: parked ? 0 : 1,
              }}
            >
              <span className="min-w-0 overflow-hidden">Dayworker&nbsp;</span>
            </span>
            Video
          </span>
        </Btn>
      </div>
    </div>
  );
}
