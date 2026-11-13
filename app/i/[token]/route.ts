import { NextResponse, type NextRequest } from "next/server";
import { one, q } from "@/lib/db";
import { ATT, INV, VID, YEAR, advanceStage, recordEvent, signedSendCookie } from "@/lib/track";
import { token as newToken } from "@/lib/util";
import { makeTestInvite, readDemoToken } from "@/lib/testInvite";

/**
 * Every link in a campaign email is /i/<send token>. The click is logged,
 * the token is remembered in a signed cookie (so the page view, sign-up and
 * app download that follow are all credited to this send), and the visitor
 * lands on dayworker.co, where their personal invitation pops up.
 *
 * dw_inv is the one cookie the page's script can read: a fresh stamp per
 * click, which tells it to ask /api/invite who's here and to show the
 * invitation once for this click. Ordinary visitors to the site have none of
 * these cookies and are never tracked.
 *
 * Corporate mail filters (Proofpoint, Mimecast, Defender) open links before
 * a person does. Those are logged as clicks but flagged; the funnel counts a
 * person as "landed" only when the page's own script reports a view.
 */
const SCANNER = /bot|crawl|spider|preview|scan|proofpoint|mimecast|barracuda|safelinks|python|curl|go-http|java\/|headless/i;

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  let { token } = await params;
  // A demo link: save it as a test invite, then carry on as its real send.
  const demo = readDemoToken(token);
  if (demo) {
    const made = await makeTestInvite(demo);
    if (made) token = made.token;
  }
  const s = await one<{ id: number; contact_id: number; campaign_id: number; code: string; lang: string }>(
    `select s.id, s.contact_id, s.campaign_id, c.code, ct.lang
     from sends s join campaigns c on c.id = s.campaign_id join contacts ct on ct.id = s.contact_id
     where s.token = $1`,
    [token],
  );
  const dest = new URL("/", req.url);
  if (!s) return NextResponse.redirect(dest, 302);

  const ua = req.headers.get("user-agent") ?? "";
  const scanner = !ua || SCANNER.test(ua);
  const visitorId = req.cookies.get(VID)?.value ?? newToken(10);
  if (!scanner) {
    await q(`update sends set clicked_at = coalesce(clicked_at, now()) where id = $1`, [s.id]);
    await advanceStage(s.contact_id, "clicked");
  }
  await recordEvent(
    "click",
    { contactId: s.contact_id, campaignId: s.campaign_id, sendId: s.id, campaignCode: s.code, visitorId },
    { meta: { scanner, ua: ua.slice(0, 200) } },
  );

  if (s.lang === "es") dest.searchParams.set("lang", "es");
  const res = NextResponse.redirect(dest, 302);
  const days90 = 60 * 60 * 24 * 90;
  res.cookies.set(ATT, signedSendCookie(token), { maxAge: days90, sameSite: "lax", httpOnly: true, path: "/" });
  res.cookies.set(INV, Date.now().toString(36), { maxAge: days90, sameSite: "lax", path: "/" });
  res.cookies.set(VID, visitorId, { maxAge: YEAR, sameSite: "lax", path: "/" });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
