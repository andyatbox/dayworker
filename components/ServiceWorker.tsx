"use client";

import { useEffect } from "react";

/**
 * Registers the worker in public/sw.js. It is not here for offline support —
 * it is what makes Chrome consider the site installable, which is the gate in
 * front of the native-app banner declared in site.webmanifest.
 *
 * Held until load so it never competes with the page's own resources.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // A failed registration costs nothing here: the site works without it,
        // and only the install banner depends on it.
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
