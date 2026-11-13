import { type NextRequest, NextResponse } from "next/server";
import { one } from "@/lib/db";
import { config } from "@/lib/config";
import { VID, advanceStage, attribution, recordEvent, stopSequences } from "@/lib/track";

/**
 * Apple devices go to the App Store, everything else to Play.
 *
 * iPadOS reports itself as "Macintosh" in desktop-mode Safari, which is why
 * that token is here rather than being treated as a desktop miss — and Macs go
 * to the App Store anyway, so the ambiguity costs nothing.
 */
const APPLE = /iPhone|iPad|iPod|Macintosh|Mac OS X/i;

/**
 * Every "app download & signup" button on the site points here, as do
 * dayworker.co/app and the QR code, so the store choice lives in exactly one
 * place.
 *
 * Campaign traffic is also logged and tagged for the stores (App Store `ct=`,
 * needs APPLE_PROVIDER_TOKEN; Play `referrer=utm_…`), and the contractor's
 * remaining emails stop. `a` (signed email token), `v` and `c` arrive on the
 * desktop QR, where the phone has none of the desktop's cookies. `from` names
 * the button (chrome, signup, contractors, invite, success, and qr_ versions).
 * Everyone else is simply forwarded, as before.
 *
 * Deliberately never cached: the response depends on who is asking. A 302
 * rather than a 301, because a permanent redirect would stick in the browser
 * and follow the visitor onto their next device; `no-store` and `Vary` keep a
 * CDN from serving one visitor's store to everybody else.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const apple = APPLE.test(ua);
  let url = apple ? config.appStoreUrl : config.playStoreUrl;

  const sp = req.nextUrl.searchParams;
  const campaign = sp.has("a") || sp.has("c") || req.cookies.has("dw_att") || req.cookies.has("dw_src");
  // Someone who signed up through the form on this device is credited too.
  const visitorId = sp.get("v") || req.cookies.get(VID)?.value || null;
  // Tracking never stands between someone and the store: if it fails (the
  // database unreachable, say), they're still forwarded, just untagged.
  try {
    if (campaign || visitorId) {
      const from = (sp.get("from") ?? "button").slice(0, 30);
      const att = await attribution({ visitorId, code: sp.get("c"), signedSend: sp.get("a") });
      let contactId = att.contactId;
      if (!contactId && att.visitorId) {
        const r = await one<{ contact_id: number }>(
          `select contact_id from registrations where visitor_id = $1 and contact_id is not null order by id desc limit 1`,
          [att.visitorId],
        );
        contactId = r?.contact_id ?? null;
      }

      if (att.campaignCode || contactId) {
        const platform = /Android/i.test(ua) ? "android" : apple ? "apple" : "other";
        await recordEvent("app_click", { ...att, contactId }, { meta: { from, platform } });
        await advanceStage(contactId, "app");
        // They took the fast path. No more "last note" emails; the app takes it from here.
        if (contactId) await stopSequences(contactId, "app_click");

        const code = (att.campaignCode ?? "direct").slice(0, 40);
        if (!apple) {
          const referrer = new URLSearchParams({
            utm_source: att.sendId ? "email" : from.startsWith("qr") ? "qr" : "web",
            utm_medium: att.sendId ? "email" : "site",
            utm_campaign: code,
            utm_content: from,
          });
          url = `${config.playStoreUrl}&referrer=${encodeURIComponent(referrer.toString())}`;
        } else if (config.appleProviderToken) {
          url = `${config.appStoreUrl}?pt=${config.appleProviderToken}&ct=${encodeURIComponent(code)}&mt=8`;
        }
      }
    }
  } catch (err) {
    console.error("/app tracking failed; forwarding untagged", err);
    url = apple ? config.appStoreUrl : config.playStoreUrl;
  }

  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  res.headers.set("Vary", "User-Agent");
  return res;
}
