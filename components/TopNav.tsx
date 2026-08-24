"use client";

import { useEffect, useRef, useState } from "react";

const LINKS: [string, string][] = [
  ["Reel", "#top"],
  ["About", "#about"],
  ["Features", "#features"],
  ["Workers", "#workers"],
  ["Job posts", "#contractors"],
  ["Get started", "#signup"],
];

/**
 * Jump-to strip, right-aligned in the content region. It never wraps and never
 * becomes a burger: once the links can no longer sit on one line it removes
 * itself, which is what happens on narrow screens.
 */
export default function TopNav() {
  // Always-present, full-width slot. Measuring the nav itself would be
  // circular — hiding it collapses it to zero width, which reads as "fits"
  // and flips it straight back on.
  const slot = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const need = useRef(0);
  const [fits, setFits] = useState(true);

  useEffect(() => {
    const measure = () => {
      const s = slot.current;
      const l = list.current;
      if (!s || !l) return;
      // Only refresh the requirement while the list is actually laid out.
      if (l.scrollWidth > 0) need.current = l.scrollWidth;
      if (need.current > 0) setFits(need.current <= s.clientWidth);
    };

    measure();
    // Web fonts land after first paint and change the width.
    document.fonts?.ready.then(measure).catch(() => {});

    const ro = new ResizeObserver(measure);
    if (slot.current) ro.observe(slot.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={slot} className="w-full">
      <nav
        aria-label="Section navigation"
        className="pointer-events-auto ml-auto w-max border-[3px] border-black bg-white/70 backdrop-blur-md"
        style={{ display: fits ? undefined : "none" }}
      >
        <ul
          ref={list}
          className="flex w-max items-center gap-1 whitespace-nowrap px-2 py-1"
        >
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
    </div>
  );
}
