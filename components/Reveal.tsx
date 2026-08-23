"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Dir = "up" | "down" | "left" | "right";

const OFFSETS: Record<Dir, string> = {
  up: "translate3d(0, 72px, 0)",
  down: "translate3d(0, -72px, 0)",
  left: "translate3d(72px, 0, 0)",
  right: "translate3d(-72px, 0, 0)",
};

/**
 * Grid elements slide in from all directions when they hit the viewport.
 * Short duration + hard bezier keeps the motion quick and jolty against
 * the slow page scroll.
 */
export default function Reveal({
  children,
  dir = "up",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  dir?: Dir;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -5% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: on ? 1 : 0,
        transform: on ? "none" : OFFSETS[dir],
        transition: `transform 320ms cubic-bezier(0.85, 0, 0.15, 1) ${delay}ms, opacity 240ms linear ${delay}ms`,
        willChange: on ? undefined : "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}
