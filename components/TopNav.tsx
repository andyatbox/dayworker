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
 * Jump-to strip spanning the content region. It never wraps and never becomes a
 * burger: when the links can no longer fit on one line it removes itself, which
 * is what happens on narrow screens.
 */
export default function TopNav() {
  const bar = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [fits, setFits] = useState(true);

  useEffect(() => {
    const measure = () => {
      const b = bar.current;
      const l = list.current;
      if (!b || !l) return;
      // Measure against the bar's inner width; the list is nowrap, so its
      // scrollWidth is the width it actually wants.
      const available = b.clientWidth - 2 * 16;
      setFits(l.scrollWidth <= available);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (bar.current) ro.observe(bar.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <nav
      ref={bar}
      aria-label="Section navigation"
      className="pointer-events-auto border-[3px] border-black bg-white/70 backdrop-blur-md"
      style={{ display: fits ? undefined : "none" }}
    >
      <ul ref={list} className="flex w-max items-center gap-6 whitespace-nowrap px-4 py-3 md:gap-8">
        {LINKS.map(([label, href]) => (
          <li key={href}>
            <a
              href={href}
              className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-black transition-colors duration-100 ease-linear hover:bg-black hover:text-yellow"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
