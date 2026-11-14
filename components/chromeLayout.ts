import { SHOW_ACCOUNT_CTA } from "./featureFlags";

/**
 * Geometry for the pinned chrome in the top-right corner: a stack of slabs —
 * get the app & sign up, sign up now (not on touch devices), and the video
 * button. They read as one connected column, so each one's resting place is
 * derived from the heights above it rather than written out by hand.
 */

/**
 * Where the column starts, at the top of the page: drives the header's own
 * padding, so the column begins here in the hero's flow.
 */
export const TOP_INSET = 30;

/**
 * Where the column parks once you scroll — it rides up from TOP_INSET and
 * holds here for the rest of the page. The mark on the other side pins to the
 * same number, so the two stay level across the top.
 */
export const PARK_TOP = 15;

/** House keyline. Stacked boxes overlap by one so they share a single stroke. */
export const BORDER = 2;

/**
 * One slab: the app box, the sign-up box and the video box are all this tall.
 * Phones get the compact size so three slabs still leave the page readable.
 * The matching Tailwind heights live in SLAB_CLASS; keep the two in step.
 */
export const APP_BOX_H = 79;
export const APP_BOX_H_SM = 58;
export const SLAB_CLASS = "h-[58px] sm:h-[79px]";

/** The account box, when SHOW_ACCOUNT_CTA is on. */
export const ACCOUNT_BOX_H = 58;



/**
 * Whether the column has parked: true once the last slab (video) has ridden up
 * to its resting place. StickyVideo publishes it; every slab's label reads it.
 */
let parked = false;
const subs = new Set<() => void>();
export const parkedStore = {
  get: () => parked,
  set(v: boolean) {
    if (v === parked) return;
    parked = v;
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  },
};

/** Slab height at the current viewport (Tailwind's sm breakpoint). */
export function slabH() {
  return typeof window !== "undefined" && window.innerWidth < 640 ? APP_BOX_H_SM : APP_BOX_H;
}

/**
 * Height of the chrome stack: the app box and, on mouse devices, the sign-up
 * box sharing a stroke, plus the account box when it shows. CHROME_CLASS
 * (.chrome-holder in globals.css) is the same sum in CSS, for the holder that
 * reserves the space in the hero.
 */
export function chromeH() {
  const n = window.matchMedia("(pointer: coarse)").matches ? 1 : 2;
  return slabH() * n - BORDER * (n - 1) + (SHOW_ACCOUNT_CTA ? ACCOUNT_BOX_H - BORDER : 0);
}
export const CHROME_CLASS = SHOW_ACCOUNT_CTA ? "chrome-holder with-account" : "chrome-holder";

/** Where the chrome parks: at the top of the page, level with the mark. */
export function chromeRestTop() {
  return PARK_TOP;
}

/** Where the video button parks: flush under the chrome stack in turn. */
export function videoRestTop() {
  return chromeRestTop() + chromeH() - BORDER;
}
