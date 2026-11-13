/**
 * Everything that changes between local and production, or that the team still
 * has to decide, in one place. Set the real values as env vars on Vercel.
 */
const dev = process.env.NODE_ENV !== "production";

export const config = {
  /** Where email links point: the live site, https://www.dayworker.co. */
  siteUrl: process.env.SITE_URL ?? (dev ? "http://localhost:3010" : "https://www.dayworker.co"),

  /*
   * The Founding Member offer has no date yet ("early 2027, date TBD"), so the
   * copy and emails promise none. When the real date is set, put it in the
   * copy (lib/copy.ts) and the email sequence; never a made-up deadline, which
   * is a deceptive practice under FTC rules.
   */

  /**
   * The mail hold. In production nothing is sent, dry runs included, until
   * SENDING=on is set on Vercel; /blast and the site run normally meanwhile.
   * Local development always sends (to dry-run mailboxes, or for real once a
   * mailbox is live).
   */
  sendingOn: dev || process.env.SENDING === "on",

  /** CAN-SPAM requires a valid physical postal address in every email. */
  companyAddress: process.env.COMPANY_ADDRESS ?? "",

  appStoreUrl: "https://apps.apple.com/us/app/dayworker-co/id6502521610",
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.dayworkermobile",
  /** App Store Connect → Analytics → Campaigns: the pt= provider token. */
  appleProviderToken: process.env.APPLE_PROVIDER_TOKEN ?? "",

  /** Cold mail goes out on weekdays inside this window, recipient time. */
  sendWindow: { tz: "America/New_York", startHour: 8, endHour: 17 },
  /** Messages per sender per cron tick, which spaces sends across the day. */
  perTickPerSender: 3,

  adminPassword: process.env.BLAST_PASSWORD ?? (dev ? "dayworker" : ""),
  appSecret: process.env.APP_SECRET ?? (dev ? "dev-only-secret-change-me" : ""),
  cronSecret: process.env.CRON_SECRET ?? (dev ? "dev-cron" : ""),

  /** Socrata app token (free) lifts NYC Open Data rate limits. Optional. */
  socrataToken: process.env.SOCRATA_APP_TOKEN ?? "",
};
