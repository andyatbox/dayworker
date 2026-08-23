"use client";

import { useCallback, useEffect, useState } from "react";
import { lenisRef } from "./SmoothScroll";
import { PlayIcon, CloseIcon } from "./Icons";
import LogoSwap from "./LogoSwap";

/** Gumlet asset ids. The montage loops silently behind the hero; the film
 *  plays with controls in the overlay. */
const MONTAGE_ID = "6a8b4d8ccad008e012bd14d4";
const FILM_ID = "6a8b4d8ccad008e012bd14d1";

/**
 * Full-viewport landing: the montage runs muted and looping underneath;
 * every piece of type sits on a solid yellow block. The big CTA opens the
 * full Dayworker Video in a fit-to-frame overlay (never cropped, never
 * letterboxed — the frame itself takes the video's aspect).
 */
export default function Hero() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    lenisRef.current?.start();
  }, []);

  const show = useCallback(() => {
    setOpen(true);
    lenisRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <section id="top" className="relative h-[100svh] min-h-[620px] overflow-hidden bg-black">
      {/* Montage, hosted on Gumlet. An iframe can't be object-fit: cover, so the
          16:9 frame is sized to overflow whichever axis is short and then
          centred — the same result, cropping rather than letterboxing.
          Non-interactive so clicks fall through to the page. */}
      <iframe
        title="Dayworker montage"
        src={`https://play.gumlet.io/embed/${MONTAGE_ID}?background=true&autoplay=true&loop=true&muted=true&disable_player_controls=true`}
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="origin"
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-none"
        style={{
          width: "max(100vw, calc(100svh * 16 / 9))",
          height: "max(100svh, calc(100vw * 9 / 16))",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 grid grid-cols-1 items-end gap-8 px-5 pb-10 md:grid-cols-2 md:px-10 md:pb-14">
        <div>
          <LogoSwap />
          <h1 className="display tagline max-w-[13ch] text-[clamp(2.6rem,6vw,6rem)]">
            <span className="blocked">The blue-collar</span>
            <br />
            <span className="blocked">pro network.</span>
          </h1>
        </div>

        <div className="flex md:justify-end">
          <button
            type="button"
            onClick={show}
            className="group flex select-none items-center gap-3 border-[3px] border-black bg-white/70 px-4 py-3 text-left text-black backdrop-blur-md transition-colors duration-100 ease-linear hover:bg-black hover:text-yellow md:px-5 md:py-3.5"
          >
            <span className="pill flex h-9 w-9 shrink-0 items-center justify-center border-[3px] border-black bg-black text-yellow transition-colors duration-100 ease-linear group-hover:border-yellow md:h-10 md:w-10">
              <PlayIcon className="h-3.5 w-3.5 translate-x-[2px] md:h-4 md:w-4" />
            </span>
            <span className="text-xs font-extrabold uppercase leading-tight tracking-[0.1em] md:text-sm">
              Dayworker video
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Dayworker video"
          data-lenis-prevent
          onClick={close}
        >
          {/* Frame locked to 16:9 and bounded by the viewport, so the video
              exactly fits — no crop, no letterbox. */}
          <div
            className="aspect-video"
            style={{ width: "min(100vw, calc(100svh * 16 / 9))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              title="Dayworker video"
              src={`https://play.gumlet.io/embed/${FILM_ID}?autoplay=true&loop=false&disable_player_controls=false`}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
              referrerPolicy="origin"
              className="h-full w-full border-none"
            />
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close video"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center bg-yellow text-black transition-colors duration-100 ease-linear hover:bg-white md:right-4 md:top-4"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </section>
  );
}
