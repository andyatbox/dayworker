"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The mark: a white, black-stroked box that loops between the round logo and
 * the logotype, snapping its width to fit whichever is showing. Under 768px
 * there isn't room for the logotype, so it settles on the round mark alone at
 * a slightly smaller size and stops cycling.
 *
 * It sits in flow directly above the tagline and rides the hero up as the page
 * scrolls, then clamps at the header offset and stays there for the rest of the
 * document — sticky behaviour, driven manually because the hero's content block
 * is absolutely positioned and so can't anchor a real `position: sticky`.
 */
const NARROW = 102; // round mark (64) + 16px each side + strokes
const WIDE = 252; // logotype (~192) + 27px each side + strokes
const BOX_H = 95;

/** Small-screen sizes, a shade under the desktop mark. */
const SM_NARROW = 92;
const SM_BOX_H = 85;

/** Matches the header's top inset, so the mark pins level with the nav strip. */
const REST_TOP = 12;
const HOLD_MS = 6000;

export default function LogoSwap() {
  const holder = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLAnchorElement>(null);
  const [wide, setWide] = useState(false);
  // Which mark is showing. Cut — never crossfaded, or the two marks ghost
  // through each other — at the midpoint of the box's width animation.
  const [mark, setMark] = useState(false);
  const [small, setSmall] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setSmall(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (small) {
      // Park on the round mark; nothing to cycle to.
      setWide(false);
      setMark(false);
      return;
    }
    const id = setInterval(() => setWide((w) => !w), HOLD_MS);
    return () => clearInterval(id);
  }, [small]);

  useEffect(() => {
    if (small) return;
    const t = setTimeout(() => setMark(wide), 160);
    return () => clearTimeout(t);
  }, [wide, small]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const h = holder.current;
      const b = box.current;
      if (h && b) {
        const r = h.getBoundingClientRect();
        // Pins level with the jump-to strip, at the header's own top inset.
        b.style.top = `${Math.max(REST_TOP, r.top)}px`;
        b.style.left = `${r.left}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const height = small ? SM_BOX_H : BOX_H;

  const logo = (
    <a
      ref={box}
      href="#top"
      aria-label="Dayworker home"
      className="fixed z-[60] block overflow-hidden border-[3px] border-black bg-white/70 backdrop-blur-md"
      style={{
        height,
        width: small ? SM_NARROW : wide ? WIDE : NARROW,
        transition: "width 320ms cubic-bezier(0.85, 0, 0.15, 1)",
      }}
    >
      <img
        src="/logos/DW-Logo.svg"
        alt="Dayworker"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ height: small ? 57 : 64, width: small ? 57 : 64, opacity: mark ? 0 : 1 }}
      />
      {!small && (
        <img
          src="/logos/DW-Black-Logotype.svg"
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[42px] w-auto max-w-none -translate-x-1/2 -translate-y-1/2"
          style={{ opacity: mark ? 1 : 0, marginTop: 5 }}
        />
      )}
    </a>
  );

  return (
    <div ref={holder} style={{ height }}>
      {mounted && createPortal(logo, document.body)}
    </div>
  );
}
