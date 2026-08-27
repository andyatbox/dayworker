"use client";

import { useEffect } from "react";

/**
 * Publishes the real visible height as --app-vh.
 *
 * iOS reports a layout viewport that includes the strip behind the collapsing
 * URL bar, so a 100vh/100svh hero lets the next section peek out from under it.
 * window.innerHeight is what's actually visible, so that's what we measure.
 *
 * Deliberately not remeasured on every resize: iOS fires one each time the URL
 * bar collapses mid-scroll, and reacting to those would resize the hero while
 * the user is scrolling it. Only a width change or an orientation flip counts.
 */
export default function ViewportHeight() {
  useEffect(() => {
    let lastWidth = window.innerWidth;

    const apply = () => {
      document.documentElement.style.setProperty(
        "--app-vh",
        `${window.innerHeight}px`
      );
    };

    const onResize = () => {
      if (window.innerWidth === lastWidth) return; // URL-bar collapse, ignore
      lastWidth = window.innerWidth;
      apply();
    };

    apply();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);

  return null;
}
