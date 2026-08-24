"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";

/**
 * The mark: a white, black-stroked box that loops between the round logo and
 * the logotype, snapping its width to fit whichever is showing.
 *
 * It sits in flow directly above the tagline and rides the hero up as the page
 * scrolls, then clamps at the header offset and stays there for the rest of the
 * document — sticky behaviour, driven manually because the hero's content block
 * is absolutely positioned and so can't anchor a real `position: sticky`.
 */
const NARROW = 102; // round mark (64) + 16px each side + strokes
const WIDE = 252; // logotype (~192) + 27px each side + strokes
const BOX_H = 95;
const HOLD_MS = 6000;

export default function LogoSwap() {
  const holder = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLAnchorElement>(null);
  const [wide, setWide] = useState(false);
  // Which mark is showing. Cut — never crossfaded, or the two marks ghost
  // through each other — at the midpoint of the box's width animation.
  const [mark, setMark] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setWide((w) => !w), HOLD_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMark(wide), 160);
    return () => clearTimeout(t);
  }, [wide]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const h = holder.current;
      const b = box.current;
      if (h && b) {
        const r = h.getBoundingClientRect();
        // Clamp level with the header's chrome row, read from the DOM so the
        // mark follows it when the jump-to strip above hides itself on narrow
        // screens. Falls back to the header's own top inset.
        const row = document.querySelector("[data-chrome-row]");
        const restTop = row
          ? row.getBoundingClientRect().top
          : window.innerWidth >= 768
            ? 32
            : 20;
        b.style.top = `${Math.max(restTop, r.top)}px`;
        b.style.left = `${r.left}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={holder} style={{ height: BOX_H }}>
      <a
        ref={box}
        href="#top"
        aria-label="Dayworker home"
        className="fixed z-50 block overflow-hidden border-[3px] border-black bg-white/70 backdrop-blur-md"
        style={{
          height: BOX_H,
          width: wide ? WIDE : NARROW,
          transition: "width 320ms cubic-bezier(0.85, 0, 0.15, 1)",
        }}
      >
        <img
          src="/logos/DW-Logo.svg"
          alt="Dayworker"
          className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2"
          style={{ opacity: mark ? 0 : 1 }}
        />
        <img
          src="/logos/DW-Black-Logotype.svg"
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[42px] w-auto max-w-none -translate-x-1/2 -translate-y-1/2"
          style={{ opacity: mark ? 1 : 0, marginTop: 5 }}
        />
      </a>
    </div>
  );
}
