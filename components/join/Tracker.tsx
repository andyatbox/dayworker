"use client";

import { useEffect } from "react";
import { track } from "./track-client";

/**
 * For campaign traffic only (track() drops everything else): the page view on
 * load, which is the "visited" step of the email funnel (link scanners never
 * run it), each section of the site once as it scrolls into view, and any
 * click on an element marked data-track="name".
 */
export default function Tracker() {
  useEffect(() => {
    track("page_view", { w: window.innerWidth });

    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.id;
          if (e.isIntersecting && !seen.has(id)) {
            seen.add(id);
            track("section_view", { section: id });
          }
        }
      },
      { threshold: 0.35 },
    );
    document.querySelectorAll<HTMLElement>("main section[id]").forEach((el) => io.observe(el));

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-track]");
      if (el) track("cta", { name: el.dataset.track });
    };
    document.addEventListener("click", onClick);
    return () => {
      io.disconnect();
      document.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
