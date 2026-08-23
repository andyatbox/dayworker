"use client";

import { useEffect, type RefObject } from "react";

/**
 * Drifts `mover` inside `frame`: vertically with scroll position, horizontally
 * with mouse X. Both values are lerped every frame so the drift stays slow and
 * eased while the rest of the page animates hard.
 */
export function useParallax(
  frame: RefObject<HTMLElement | null>,
  mover: RefObject<HTMLElement | null>,
  strengthX = 26,
  strengthY = 46
) {
  useEffect(() => {
    let raf = 0;
    let mouseX = 0; // -1 .. 1
    let cx = 0;
    let cy = 0;

    const onMouse = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    };
    window.addEventListener("mousemove", onMouse, { passive: true });

    const tick = () => {
      const f = frame.current;
      const m = mover.current;
      if (f && m) {
        const r = f.getBoundingClientRect();
        const vh = window.innerHeight;
        // 0 when the frame enters from below, 1 when it leaves above
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        const ty = (p - 0.5) * 2 * strengthY;
        const tx = mouseX * strengthX;
        cx += (tx - cx) * 0.06;
        cy += (ty - cy) * 0.1;
        m.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
    };
  }, [frame, mover, strengthX, strengthY]);
}

/** Inset applied to the mover so the image can drift without exposing an edge. */
export function moverInset(strengthX: number, strengthY: number) {
  return {
    top: -strengthY - 8,
    bottom: -strengthY - 8,
    left: -strengthX - 8,
    right: -strengthX - 8,
  };
}
