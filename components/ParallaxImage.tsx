"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";
import { useParallax, moverInset } from "./useParallax";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Max vertical travel in px, driven by scroll position. */
  strengthY?: number;
  /** Max horizontal travel in px, driven by mouse X (eased). */
  strengthX?: number;
};

/**
 * A hard-edged rectangular frame; the image bleeds past the frame and drifts
 * with scroll and mouse. Greyscale is a CSS filter rather than a second
 * black-and-white file, and the colour snaps back in on hover.
 */
export default function ParallaxImage({
  src,
  alt,
  className = "",
  strengthY = 46,
  strengthX = 26,
}: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const mover = useRef<HTMLDivElement>(null);
  useParallax(frame, mover, strengthX, strengthY);

  return (
    <div ref={frame} className={`group relative overflow-hidden bg-black ${className}`}>
      <div
        ref={mover}
        className="absolute will-change-transform"
        style={moverInset(strengthX, strengthY)}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover grayscale transition-[filter] duration-100 ease-linear group-hover:grayscale-0"
        />
      </div>
    </div>
  );
}
