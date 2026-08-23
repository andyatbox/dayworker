"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useParallax, moverInset } from "./useParallax";

type Shot = { src: string; alt: string };

type Props = {
  images: Shot[];
  className?: string;
  strengthY?: number;
  strengthX?: number;
  /** Hold on each frame, ms. */
  interval?: number;
};

/** Vertical columns the incoming frame is cut into. */
const SLICES = 7;
const SLICE_MS = 380;
const STAGGER_MS = 45;

/**
 * The audience hero: the same parallax frame as ParallaxImage, but cycling
 * through several shots. The incoming image is cut into vertical columns that
 * drop in alternately from top and bottom on a hard bezier — a grid-flavoured
 * wipe rather than a soft crossfade, matching the page's jolty display motion.
 *
 * Only cycles while the frame is on screen.
 */
export default function ParallaxSlideshow({
  images,
  className = "",
  strengthY = 46,
  strengthX = 26,
  interval = 3800,
}: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const mover = useRef<HTMLDivElement>(null);
  useParallax(frame, mover, strengthX, strengthY);

  const [idx, setIdx] = useState(0);
  const [prev, setPrev] = useState(0);
  const [live, setLive] = useState(false);

  // Only run while on screen.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setLive(e.isIntersecting),
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Decode every frame up front so a column never wipes in on a blank image.
  useEffect(() => {
    if (!live) return;
    images.forEach(({ src }) => {
      const img = new Image();
      img.src = src;
    });
  }, [live, images]);

  useEffect(() => {
    if (!live || images.length < 2) return;
    const id = setInterval(() => {
      setIdx((i) => {
        setPrev(i);
        return (i + 1) % images.length;
      });
    }, interval);
    return () => clearInterval(id);
  }, [live, images.length, interval]);

  const imgCls =
    "h-full w-full object-cover grayscale transition-[filter] duration-100 ease-linear group-hover:grayscale-0";

  return (
    <div ref={frame} className={`group relative overflow-hidden bg-black ${className}`}>
      <div
        ref={mover}
        className="absolute will-change-transform"
        style={moverInset(strengthX, strengthY)}
      >
        {/* Outgoing frame, still whole underneath. */}
        <img src={images[prev].src} alt={images[prev].alt} className={`absolute inset-0 ${imgCls}`} />

        {/* Incoming frame, cut into columns. Keyed so the animation restarts. */}
        <div key={idx} className="absolute inset-0">
          {Array.from({ length: SLICES }, (_, i) => (
            <div
              key={i}
              className="absolute inset-y-0 overflow-hidden"
              style={{
                left: `${(i * 100) / SLICES}%`,
                width: `${100 / SLICES}%`,
                animation: `${i % 2 ? "slice-up" : "slice-down"} ${SLICE_MS}ms cubic-bezier(0.85, 0, 0.15, 1) ${
                  i * STAGGER_MS
                }ms both`,
              }}
            >
              <img
                src={images[idx].src}
                alt={i === 0 ? images[idx].alt : ""}
                aria-hidden={i !== 0}
                className={`absolute inset-y-0 max-w-none ${imgCls}`}
                style={{ left: `${-i * 100}%`, width: `${SLICES * 100}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
