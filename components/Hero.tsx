"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lenisRef } from "./SmoothScroll";
import Btn from "./Btn";
import { PlayIcon, CloseIcon } from "./Icons";
import LogoSwap from "./LogoSwap";
import TopNav from "./TopNav";
import StickyChrome from "./StickyChrome";

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
  const player = useRef<HTMLIFrameElement>(null);

  /**
   * Gumlet forces mute whenever autoplay is on, so the film would otherwise
   * start silent. Once it's rolling we unmute over player.js postMessage —
   * the click that opened the overlay is the user activation the browser
   * requires. Fired a few times because the player only accepts commands
   * after it has finished booting, which is a little after iframe load.
   */
  const unmute = useCallback(() => {
    const w = player.current?.contentWindow;
    if (!w) return;
    const send = (method: string, value?: unknown) =>
      w.postMessage(
        JSON.stringify({ context: "player.js", version: "0.0.11", method, value }),
        "*"
      );
    send("unmute");
    send("setVolume", 100);
  }, []);

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
    <section
      id="top"
      className="relative h-[var(--app-vh,100svh)] min-h-[620px] overflow-hidden bg-black"
    >
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
          width: "max(100vw, calc(var(--app-vh, 100svh) * 16 / 9))",
          height: "max(var(--app-vh, 100svh), calc(100vw * 9 / 16))",
        }}
      />

      {/* Top chrome, in the hero's own flow: the strip scrolls away with the
          hero while the boxes below it pin near the top. */}
      <div className="relative z-40 flex flex-col items-end gap-3 px-5 pt-3 md:px-10">
        <TopNav />
        <StickyChrome />
      </div>

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
          {/* Same treatment as the app button: house Btn inside a tinted-blur
              slab with a hard keyline. */}
          <div className="flex h-[79px] items-center gap-3 border-[3px] border-black bg-white/70 px-3 backdrop-blur-md">
            <Btn onClick={show} className="attention">
              <PlayIcon className="h-[1.1em] w-[1.1em]" />
              <span>Dayworker video</span>
            </Btn>
          </div>
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
            style={{ width: "min(100vw, calc(var(--app-vh, 100svh) * 16 / 9))" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* captions=false and caption_language=off both switch the burnt-in
                English track to `disabled`; sent together so the player keeps
                honouring one if the other is ever dropped. */}
            <iframe
              ref={player}
              title="Dayworker video"
              src={`https://play.gumlet.io/embed/${FILM_ID}?autoplay=true&loop=false&disable_player_controls=false&captions=false&caption_language=off`}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
              referrerPolicy="origin"
              className="h-full w-full border-none"
              onLoad={() => {
                unmute();
                [250, 700, 1500].forEach((t) => setTimeout(unmute, t));
              }}
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
