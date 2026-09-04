/**
 * Temporary switches for work that is paused rather than dropped. Flip one back
 * to `true` to restore it — nothing behind these flags has been deleted.
 */

/**
 * The account CTAs: the "Get started" / "Sign in" box in the sticky chrome, and
 * the matching "Get started" on the closing "Let's get to work" board. Hidden
 * while sign-up is unavailable.
 *
 * The sticky column's geometry is chained — StickyChrome's reserved height and
 * StickyVideo's parking offset are both derived from this flag — so the video
 * button stays flush against the app box either way.
 */
export const SHOW_ACCOUNT_CTA = false;
