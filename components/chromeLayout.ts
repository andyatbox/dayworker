import { SHOW_ACCOUNT_CTA } from "./featureFlags";

/**
 * Geometry for the pinned chrome in the top-right corner: the jump-to strip,
 * the app-download box beneath it, and the video button beneath that. They read
 * as one connected column, so each one's resting place is derived from the
 * heights above it rather than written out by hand.
 */

/** Top inset the column sits at. Drives the header's own padding and the
 *  mark's pin on the other side, so the row stays level. */
export const TOP_INSET = 30;

/** House keyline. Stacked boxes overlap by one so they share a single stroke. */
export const BORDER = 3;

/** The app-download slab, and the video slab sized to match it. */
export const APP_BOX_H = 79;

/** The account box, when SHOW_ACCOUNT_CTA is on. */
export const ACCOUNT_BOX_H = 58;

/**
 * How far below the strip the chrome starts out in the hero's flow. The strip
 * is pinned and never moves, so this is exactly the distance the app box rides
 * up before it parks — the whole of the scroll it has to play with.
 */
export const START_GAP = 50;

/**
 * Live height of the jump-to strip, published by TopNav each frame. The strip
 * is sized by its own links and drops out entirely below 900px, so the boxes
 * stacking beneath it measure it rather than assume a number. 0 when it is not
 * rendered, which is what collapses the column back to the top inset on narrow
 * screens.
 */
export const navHeightRef = { current: 0 };

/** Height of the chrome stack: app box, plus the account box when it shows. */
export const CHROME_H =
  APP_BOX_H + (SHOW_ACCOUNT_CTA ? ACCOUNT_BOX_H - BORDER : 0);

/** Where the chrome parks: flush under the strip, sharing its bottom stroke. */
export function chromeRestTop() {
  const nav = navHeightRef.current;
  return nav > 0 ? TOP_INSET + nav - BORDER : TOP_INSET;
}

/** Where the video button parks: flush under the chrome stack in turn. */
export function videoRestTop() {
  return chromeRestTop() + CHROME_H - BORDER;
}
