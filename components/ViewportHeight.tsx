"use client";

import { useEffect } from "react";

/**
 * Publishes the real visible height as --app-vh.
 *
 * iOS reports a layout viewport that includes the strip behind the collapsing
 * URL bar, so a 100vh/100svh hero runs under the browser chrome and lets the
 * next section show through beneath the bar. window.innerHeight is what's
 * actually visible, and it's tracked live: Safari changes it as the bar
 * collapses and expands, and the hero has to follow or it stops matching.
 */
export default function ViewportHeight() {
  useEffect(() => {
    let raf = 0;

    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty(
          "--app-vh",
          `${window.innerHeight}px`
        );
      });
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    // Safari resizes the visual viewport as the URL bar moves without always
    // firing a window resize.
    window.visualViewport?.addEventListener("resize", apply);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      window.visualViewport?.removeEventListener("resize", apply);
    };
  }, []);

  return null;
}
