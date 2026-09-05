"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { START_GAP, TOP_INSET, navHeightRef } from "./chromeLayout";

const LINKS: [string, string][] = [
  ["Video", "#top"],
  ["About", "#about"],
  ["Features", "#features"],
  ["Job posts", "#contractors"],
  ["Sign up", "#signup"],
];

/**
 * Jump-to strip, sized to its links and right-aligned. Unlike the boxes below
 * it — which start in the hero's flow and ride up before they park — this is
 * pinned at the top inset for the life of the page and never moves.
 *
 * It still keeps a holder in the hero's flow, carrying its own height plus the
 * gap the chrome starts out below it, so the boxes underneath begin in the
 * right place. And it publishes its measured height, because the strip is sized
 * by its own content and the whole column stacks against its bottom edge.
 *
 * Below 900px it drops out entirely — no wrapping, no burger — and the holder
 * collapses to nothing with it.
 */
export default function TopNav() {
  const holder = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const h = holder.current;
      const n = nav.current;
      if (h && n) {
        // display:none under 900px, so this is 0 exactly when the strip is gone.
        const height = n.offsetHeight;
        if (navHeightRef.current !== height) {
          navHeightRef.current = height;
          h.style.height = height > 0 ? `${height + START_GAP}px` : "0px";
        }
        // Right-aligned to the holder; clientWidth excludes any scrollbar.
        const r = h.getBoundingClientRect();
        n.style.right = `${document.documentElement.clientWidth - r.right}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const strip = (
    <nav
      ref={nav}
      aria-label="Section navigation"
      className="fixed z-[60] hidden w-max border-[3px] border-black bg-white/70 backdrop-blur-md min-[900px]:block"
      style={{ top: TOP_INSET }}
    >
      <ul className="flex w-max items-center gap-1 whitespace-nowrap px-2 py-1">
        {LINKS.map(([label, href]) => (
          <li key={href}>
            <a
              href={href}
              className="block px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-black transition-colors duration-100 ease-linear hover:bg-black hover:text-yellow"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div ref={holder} className="w-full">
      {mounted && createPortal(strip, document.body)}
    </div>
  );
}
