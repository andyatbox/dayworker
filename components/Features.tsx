"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import Reveal from "./Reveal";
import { useSiteCopy } from "./Lang";

/** Screens, in order; their words (tab, tag, title, body, alt) are in siteCopy. */
const SCREENS = [
  "/images/features/1-job-search.jpg",
  "/images/features/2-worker-search.jpg",
  "/images/features/3-job-posts.jpg",
  "/images/features/4-dash.jpg",
  "/images/features/5-badges.jpg",
  "/images/features/6-messenger.jpg",
];

/** How long each screen holds while auto-playing. The active pill fills over the same time. */
const HOLD = 5000;
/** The screen change. */
const WIPE = 820;
const EASE = "cubic-bezier(0.76, 0, 0.24, 1)";
/**
 * The wipe's leading edge drops this much (as a % of the frame's height) from
 * the screen's left side to its right — the angle of the yellow slash above.
 */
const SLANT = 14;
/** Thickness of the yellow squeegee riding that edge. */
const BAND = 7;
/**
 * The phone's glass, as % of the frame (phone.png's transparent cut-out runs
 * from 101px to 974px of 1080). The wipe starts and ends just past it, so
 * none of its run is spent on the black around the phone.
 */
const GLASS_TOP = 9.4;
const GLASS_BOTTOM = 90.2;

type Dir = 1 | -1;
type Slide = { index: number; prev: number; dir: Dir; n: number; animate: boolean };

/**
 * Wipe geometry at edge position `t` (% of the frame, measured at the screen's
 * left side). Going forward the new screen comes up from below, the band just
 * above its edge; going back it comes down from above, the band below.
 */
const reveal = (t: number, dir: Dir) =>
  dir === 1
    ? `polygon(0% ${t}%, 100% ${t + SLANT}%, 100% 200%, 0% 200%)`
    : `polygon(0% -100%, 100% -100%, 100% ${t + SLANT}%, 0% ${t}%)`;
const band = (t: number, dir: Dir) =>
  dir === 1
    ? `polygon(0% ${t - BAND}%, 100% ${t + SLANT - BAND}%, 100% ${t + SLANT}%, 0% ${t}%)`
    : `polygon(0% ${t}%, 100% ${t + SLANT}%, 100% ${t + SLANT + BAND}%, 0% ${t + BAND}%)`;
/** Edge travel: from just outside the glass on one side to just outside it on the other. */
const travel = (dir: Dir): [number, number] =>
  dir === 1
    ? [GLASS_BOTTOM + BAND + 1, GLASS_TOP - SLANT - 1]
    : [GLASS_TOP - SLANT - BAND - 1, GLASS_BOTTOM + 1];

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The features slideshow: a phone that stays put on the left, its six screens
 * changing under the glass, and the feature's label, name and description on
 * the right under a row of pill tabs.
 *
 * Auto-plays while it's on screen, from the first feature every time it comes
 * back into view. Picking a pill turns auto-play off; the switch turns it back on.
 *
 * The screens sit under phone.png, whose black surround and transparent glass
 * do the masking. A change wipes the new screen up across the glass behind a
 * yellow squeegee at the slash's angle, the old screen pushing away and
 * dimming under it, while the phone swivels a few degrees and a glare runs
 * across the glass.
 */
export default function Features() {
  const t = useSiteCopy().features;
  const FEATURES = t.items.map((f, i) => ({ ...f, src: SCREENS[i] }));
  const section = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const shots = useRef<(HTMLImageElement | null)[]>([]);
  const squeegee = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const running = useRef<Animation[]>([]);

  const [slide, setSlide] = useState<Slide>({ index: 0, prev: -1, dir: 1, n: 0, animate: false });
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(false);
  const playing = auto && inView;

  const go = useCallback((to: number, dir: Dir) => {
    setSlide((s) => (s.index === to ? s : { index: to, prev: s.index, dir, n: s.n + 1, animate: true }));
  }, []);

  /** A pill, clicked or reached by arrow key: shows that feature and stops auto-play. */
  const pick = useCallback(
    (to: number) => {
      setAuto(false);
      go(to, to > slide.index ? 1 : -1);
    },
    [go, slide.index],
  );

  // Starts over each time it comes back into view: back on the first feature
  // (set while it's out of sight, so nobody sees the jump), auto-play back on.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let out = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.35) {
          if (out) {
            out = false;
            setAuto(true);
          }
          setInView(true);
        } else if (!e.isIntersecting) {
          if (!out) {
            out = true;
            setSlide((s) => ({ index: 0, prev: -1, dir: 1, n: s.n + 1, animate: false }));
          }
          setInView(false);
        }
      },
      { threshold: [0, 0.35] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      setSlide((s) => ({ index: (s.index + 1) % FEATURES.length, prev: s.index, dir: 1, n: s.n + 1, animate: true }));
    }, HOLD);
    return () => window.clearTimeout(id);
  }, [playing, slide.n]);

  // The screen change. Runs before paint, so the new screen never shows
  // uncovered for a frame; a change that lands mid-wipe cancels the running
  // one, which snaps it to its finished state and wipes from there.
  useLayoutEffect(() => {
    running.current.forEach((a) => a.cancel());
    running.current = [];
    const { index, prev, dir, n, animate } = slide;
    const clear = () => setSlide((s) => (s.n === n ? { ...s, prev: -1 } : s));
    if (!animate || prev < 0) return;

    const layer = layers.current[index];
    const shotIn = shots.current[index];
    const shotOut = shots.current[prev];
    const sq = squeegee.current;
    const gl = glare.current;
    const phone = body.current;
    if (!layer || !shotIn || !shotOut || !sq || !gl || !phone || reducedMotion()) {
      clear();
      return;
    }

    const [from, to] = travel(dir);
    const wipe = { duration: WIPE, easing: EASE };
    const anims = [
      layer.animate([{ clipPath: reveal(from, dir) }, { clipPath: reveal(to, dir) }], wipe),
      sq.animate(
        [
          { clipPath: band(from, dir), opacity: 1 },
          { clipPath: band(to, dir), opacity: 1 },
        ],
        wipe,
      ),
      // The new screen rides in a little behind its edge and settles; the old
      // one is pushed the other way and dims as it's covered.
      shotIn.animate([{ transform: `translateY(${5 * dir}%) scale(1.06)` }, { transform: "none" }], wipe),
      shotOut.animate(
        [
          { transform: "none", filter: "brightness(1)" },
          { transform: `translateY(${-3 * dir}%) scale(1.05)`, filter: "brightness(0.35)" },
        ],
        wipe,
      ),
      phone.animate(
        [
          { transform: "perspective(1600px) rotateY(0deg) rotateZ(0deg) scale(1)" },
          {
            transform: `perspective(1600px) rotateY(${-7 * dir}deg) rotateZ(${-0.8 * dir}deg) scale(0.985)`,
            offset: 0.38,
          },
          { transform: "perspective(1600px) rotateY(0deg) rotateZ(0deg) scale(1)" },
        ],
        { duration: WIPE + 260, easing: "cubic-bezier(0.45, 0, 0.2, 1)" },
      ),
      gl.animate(
        [
          { backgroundPosition: "100% 0", opacity: 1 },
          { backgroundPosition: "0% 0", opacity: 1 },
        ],
        { duration: 700, delay: WIPE * 0.55, easing: "cubic-bezier(0.3, 0, 0.2, 1)" },
      ),
    ];
    running.current = anims;
    anims[0].finished.then(clear, () => {});
    // Keyed on the change itself; `clear` rewrites `prev` without starting another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide.n]);

  const onKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = FEATURES.length - 1;
    const to =
      e.key === "ArrowRight" ? (slide.index === last ? 0 : slide.index + 1)
      : e.key === "ArrowLeft" ? (slide.index === 0 ? last : slide.index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (to < 0) return;
    e.preventDefault();
    pick(to);
    tabs.current[to]?.focus();
  };

  return (
    <section id="features" ref={section} aria-label={t.label} className="relative overflow-hidden bg-black text-white">
      {/* Carries the yellow of the section above down at an angle: full width,
          fixed 64px height, so the wedge shallows out as the viewport widens.
          The file carries preserveAspectRatio="none" — without it the artwork
          keeps its ratio and sits centred at 600px inside whatever box it's
          given, however the box itself is sized. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-16"
        style={{
          backgroundImage: "url(/images/yellow-slash.svg)",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Viewer left, words right; stacked on a phone held upright. The
          section comes to about 75% of the screen: the wedge, then the
          viewer, whose own black surround is the padding. */}
      <div className="grid items-center justify-center gap-x-[clamp(1.5rem,6vw,6rem)] gap-y-4 px-5 pb-14 pt-16 sm:grid-cols-[auto_minmax(0,34rem)] sm:pb-0 md:px-10">
        <Reveal dir="right" className="justify-self-center sm:justify-self-start">
          <div className="relative aspect-[729/1080] w-[min(76vw,calc(54svh_*_0.675))] sm:w-[min(44vw,calc((75svh_-_4rem)_*_0.675))]">
            <div ref={body} className="absolute inset-0">
              {/* The screens and their effects, cut to just past the glass so
                  nothing of the JPEGs' surround can show at the frame's
                  anti-aliased outer edge, even mid-swivel; every side of this
                  box lies on opaque black or bezel in phone.png. */}
              <div className="absolute inset-0" style={{ clipPath: "inset(7% 17% 7% 18%)" }}>
                {FEATURES.map((f, i) => {
                  const on = i === slide.index;
                  const under = i === slide.prev;
                  return (
                    <div
                      key={f.src}
                      ref={(el) => {
                        layers.current[i] = el;
                      }}
                      className="absolute inset-0 overflow-hidden"
                      style={{ zIndex: on ? 2 : under ? 1 : 0, visibility: on || under ? "visible" : "hidden" }}
                    >
                      <img
                        ref={(el) => {
                          shots.current[i] = el;
                        }}
                        src={f.src}
                        alt={on ? f.alt : ""}
                        width={729}
                        height={1080}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="h-full w-full select-none"
                      />
                    </div>
                  );
                })}
                <div ref={squeegee} aria-hidden="true" className="absolute inset-0 z-[3] bg-yellow opacity-0" />
                <div
                  ref={glare}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-[3] opacity-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.34) 50%, transparent 62%)",
                    backgroundSize: "300% 100%",
                  }}
                />
              </div>
              <img
                src="/images/features/phone.png"
                alt=""
                aria-hidden="true"
                width={729}
                height={1080}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="pointer-events-none absolute inset-0 z-[4] h-full w-full select-none"
              />
            </div>
          </div>
        </Reveal>

        <Reveal dir="left" className="flex flex-col items-start sm:py-10">
          {/* Every panel shares one grid cell, so the column is always the
              height of the longest and nothing below it jumps. */}
          <div className="grid w-full">
            {FEATURES.map((f, i) => {
              const on = i === slide.index;
              return (
                <div
                  key={f.src}
                  role="tabpanel"
                  id={`feature-panel-${i}`}
                  aria-labelledby={`feature-tab-${i}`}
                  aria-hidden={!on}
                  inert={!on}
                  className={`col-start-1 row-start-1 flex flex-col items-start ${on ? "visible" : "invisible"}`}
                >
                  <span
                    className={`bg-yellow px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.3em] text-black transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none md:text-xs ${
                      on ? "translate-y-0 opacity-100 delay-150" : "translate-y-2 opacity-0"
                    }`}
                  >
                    {f.tag}
                  </span>
                  <h3 className="mt-5 overflow-hidden pb-1 text-[clamp(2rem,4.2vw,3.75rem)] font-extrabold uppercase leading-[0.95] tracking-[0.02em]">
                    <span
                      className={`block transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${
                        on ? "translate-y-0 delay-200" : "translate-y-[105%]"
                      }`}
                    >
                      {f.title}
                    </span>
                  </h3>
                  <p
                    className={`mt-4 max-w-[40ch] text-base leading-relaxed text-white/80 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none md:text-lg ${
                      on ? "translate-y-0 opacity-100 delay-300" : "translate-y-2 opacity-0"
                    }`}
                  >
                    {f.body}
                  </p>
                </div>
              );
            })}
          </div>

          <div role="tablist" aria-label={t.label} onKeyDown={onKeys} className="mt-9 flex flex-wrap gap-2">
            {FEATURES.map((f, i) => {
              const on = i === slide.index;
              return (
                <button
                  key={f.src}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`feature-tab-${i}`}
                  aria-selected={on}
                  aria-controls={`feature-panel-${i}`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => pick(i)}
                  className={`pill relative overflow-hidden whitespace-nowrap border-2 border-yellow px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-yellow transition-colors duration-100 ease-linear md:text-[11px] ${
                    on ? "" : "hover:bg-yellow/20"
                  }`}
                >
                  {f.tab}
                  {/* The active pill, inverted. While auto-playing it fills
                      left to right over the hold, so the pill doubles as the
                      countdown to the next screen. */}
                  {on && (
                    <span
                      key={`${slide.n}-${playing}`}
                      aria-hidden="true"
                      className="pill-fill absolute inset-0 flex items-center justify-center bg-yellow text-black"
                      style={playing ? { animationDuration: `${HOLD}ms` } : { animation: "none" }}
                    >
                      {f.tab}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={auto}
            onClick={() => setAuto((a) => !a)}
            className="mt-6 inline-flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/70 transition-colors duration-100 ease-linear hover:text-white md:text-[11px]"
          >
            <span
              aria-hidden="true"
              className={`pill relative h-5 w-9 border-2 border-yellow transition-colors duration-150 ease-linear ${
                auto ? "bg-yellow" : "bg-transparent"
              }`}
            >
              <span
                className={`pill absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 transition-[transform,background-color] duration-150 ease-out ${
                  auto ? "translate-x-[17px] bg-black" : "translate-x-[2px] bg-yellow"
                }`}
              />
            </span>
            {t.autoplay}
          </button>
        </Reveal>
      </div>
    </section>
  );
}
