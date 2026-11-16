"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { lenisRef } from "./SmoothScroll";
import { CloseIcon } from "./Icons";
import LogoSwap from "./LogoSwap";
import StickyChrome from "./StickyChrome";
import StickyVideo from "./StickyVideo";
import Marquee from "./Marquee";
import { TOP_INSET, parkedStore } from "./chromeLayout";

/** The film plays with controls in the overlay, hosted on Gumlet. */
const FILM_ID = "6a8b4d8ccad008e012bd14d1";

/** The montage that loops silently behind the hero, hosted on Gumlet: a 16:9
 *  cut for landscape screens and a 9:16 cut for portrait ones. */
const MONTAGE = {
  landscape: { id: "6af8962a6e19706a0b162945", ratio: 16 / 9 },
  portrait: { id: "6af89f7b485a59fbc95926b6", ratio: 9 / 16 },
};

const PORTRAIT = "(orientation: portrait)";

/** Portrait or landscape; null until known in the browser, so only one cut
 *  ever loads. Follows the device as it's turned. */
function useOrientation(): keyof typeof MONTAGE | null {
  return useSyncExternalStore(
    (f) => {
      const mq = window.matchMedia(PORTRAIT);
      mq.addEventListener("change", f);
      return () => mq.removeEventListener("change", f);
    },
    () => (window.matchMedia(PORTRAIT).matches ? "portrait" : "landscape"),
    () => null,
  );
}

/** How long the montage plays alone before the type and buttons fade in. */
const INTRO_MS = 2000;

const TAGLINE = "display tagline text-[clamp(2.6rem,6vw,4.375rem)]";

/**
 * The tagline takes one box on one line when it fits beside the video button,
 * and two stacked boxes otherwise. Measured rather than set by breakpoint, since
 * it depends on the display face's real width.
 */
function useOneLine() {
  const grid = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const slabW = useRef(290);
  const [oneLine, setOneLine] = useState(false);
  // The h1's line box runs a few pixels below its last stroked box; the
  // tagline drops by that much so its box sits on the same bottom margin as
  // the video button, the same distance from the ticker as from the sides.
  const [lift, setLift] = useState(0);
  const checkRef = useRef<() => void>(() => {});

  useEffect(() => {
    const g = grid.current;
    const m = measure.current;
    if (!g || !m) return;
    let watched: HTMLElement | null = null;
    const check = () => {
      // The video button's resting width; it shortens once parked, so only
      // read it while it's down here beside the tagline. It mounts a moment
      // after the hero, so start watching it as soon as it's there.
      const slab = document.querySelector<HTMLElement>("[data-video-slab]");
      if (slab && slab !== watched) {
        watched = slab;
        ro.observe(slab);
      }
      if (slab && !parkedStore.get()) slabW.current = slab.offsetWidth;
      const cs = getComputedStyle(g);
      const inner = g.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const side = window.matchMedia("(min-width: 768px)").matches;
      setOneLine(side && m.getBoundingClientRect().width + parseFloat(cs.columnGap) + slabW.current <= inner);
      const h1 = g.querySelector("h1");
      const boxes = h1 ? [...h1.querySelectorAll(".blocked")].flatMap((e) => [...e.getClientRects()]) : [];
      const last = boxes[boxes.length - 1];
      setLift(side && h1 && last ? Math.max(0, h1.getBoundingClientRect().bottom - last.bottom) : 0);
    };
    checkRef.current = check;
    const ro = new ResizeObserver(check);
    ro.observe(g);
    check();
    document.fonts?.ready.then(check);
    const late = setTimeout(check, 500);
    return () => {
      ro.disconnect();
      clearTimeout(late);
    };
  }, []);

  // The h1 is swapped when the line count changes; measure the new one.
  useEffect(() => {
    const id = requestAnimationFrame(() => checkRef.current());
    return () => cancelAnimationFrame(id);
  }, [oneLine]);

  return { grid, measure, oneLine, lift };
}

/**
 * Full-viewport landing: the montage runs muted and looping underneath;
 * every piece of type sits on a solid yellow block. The trades ticker runs
 * along the foot, inside the screen, with the tagline and video CTA sitting
 * on top of it. The big CTA opens the
 * full Dayworker Video in a fit-to-frame overlay (never cropped, never
 * letterboxed — the frame itself takes the video's aspect).
 */
export default function Hero() {
  const [open, setOpen] = useState(false);
  const { grid, measure, oneLine, lift } = useOneLine();
  const orientation = useOrientation();
  const montage = orientation && MONTAGE[orientation];
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

  // The intro: everything on the montage fades in after a beat. Straight in
  // if the page opens partway down, where there's no landing to stage.
  useEffect(() => {
    const el = document.documentElement;
    const go = () => el.setAttribute("data-intro", "");
    if (window.scrollY > 40) return go();
    const t = setTimeout(go, INTRO_MS);
    return () => clearTimeout(t);
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
      className="relative flex h-[var(--app-vh,100svh)] min-h-[600px] flex-col overflow-hidden bg-black md:min-h-[660px]"
    >
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-hidden [container-type:size]">
          {/* Montage, hosted on Gumlet. start_high_res starts it at full quality
              (Gumlet otherwise opens low and climbs slowly); it still steps down
              if the connection can't keep up. An iframe can't be object-fit: cover, so the
              frame is sized to overflow whichever axis is short and then
              centred — the same result, cropping rather than letterboxing. Fills
              the screen above the ticker (sized in container units, so it covers
              exactly this box). Non-interactive so clicks fall through to the page. */}
          {montage && (
            <iframe
              key={montage.id}
              title="Dayworker montage"
              src={`https://play.gumlet.io/embed/${montage.id}?background=true&autoplay=true&loop=true&muted=true&disable_player_controls=true&start_high_res=true`}
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="origin"
              aria-hidden="true"
              tabIndex={-1}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-none"
              style={{
                width: `max(100cqw, calc(100cqh * ${montage.ratio}))`,
                height: `max(100cqh, calc(100cqw / ${montage.ratio}))`,
              }}
            />
          )}
        </div>

        {/* Top chrome: the CTA boxes start here in the hero's flow and ride
            up to park at the top of the page for the rest of it. */}
        <div
          className="relative z-40 flex flex-col items-end px-5 md:px-10"
          style={{ paddingTop: TOP_INSET }}
        >
          <StickyChrome />
        </div>

        <div
          ref={grid}
          className="absolute inset-x-0 bottom-0 grid grid-cols-1 items-end gap-8 px-5 pb-5 md:grid-cols-[minmax(0,1fr)_auto] md:px-10 md:pb-10"
        >
          <div className="intro" style={{ marginBottom: -lift }}>
            <LogoSwap />
            {oneLine ? (
              <h1 className={`${TAGLINE} whitespace-nowrap`}>
                <span className="blocked">The blue-collar pro network.</span>
              </h1>
            ) : (
              <h1 className={`${TAGLINE} max-w-[13ch]`}>
                <span className="blocked">The blue-collar</span>
                <br />
                <span className="blocked">pro network.</span>
              </h1>
            )}
          </div>
          {/* The one-line tagline, unseen, to measure whether it fits. */}
          <div aria-hidden="true" className={`${TAGLINE} pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap`}>
            <span ref={measure} className="blocked">The blue-collar pro network.</span>
          </div>

          <StickyVideo onClick={show} />
        </div>
      </div>

      <Marquee />

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
              src={`https://play.gumlet.io/embed/${FILM_ID}?autoplay=true&loop=false&disable_player_controls=false&captions=false&caption_language=off&start_high_res=true`}
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
