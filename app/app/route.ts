import { type NextRequest, NextResponse } from "next/server";

const APP_STORE = "https://apps.apple.com/us/app/dayworker-co/id6502521610";
const PLAY_STORE =
  "https://play.google.com/store/apps/details?id=com.dayworkermobile&hl=en_US&pli=1";

/**
 * Apple devices go to the App Store, everything else to Play.
 *
 * iPadOS reports itself as "Macintosh" in desktop-mode Safari, which is why
 * that token is here rather than being treated as a desktop miss — and Macs go
 * to the App Store anyway, so the ambiguity costs nothing.
 */
const APPLE = /iPhone|iPad|iPod|Macintosh|Mac OS X/i;

/**
 * Every "get the app" button on the site points here, as do dayworker.co/app
 * and the QR code, so the store choice lives in exactly one place.
 *
 * Deliberately never cached: the response depends on who is asking. A 302
 * rather than a 301, because a permanent redirect would stick in the browser
 * and follow the visitor onto their next device; `no-store` and `Vary` keep a
 * CDN from serving one visitor's store to everybody else.
 */
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const res = NextResponse.redirect(APPLE.test(ua) ? APP_STORE : PLAY_STORE, 302);
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  res.headers.set("Vary", "User-Agent");
  return res;
}
