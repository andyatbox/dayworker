import { NextResponse, type NextRequest } from "next/server";
import { q } from "@/lib/db";
import { advanceStage, attribution, recordEvent } from "@/lib/track";

const TYPES = new Set([
  "page_view", "section_view", "cta", "video_play", "form_start", "role_select", "qr_open", "share",
  "path_select", "invite_view", "invite_close", "signup_open",
]);

/**
 * Browser events from campaign traffic. Anything without an email send or a
 * campaign code behind it is dropped: the dashboard is about the campaigns,
 * not the site's general traffic.
 */
export async function POST(req: NextRequest) {
  let body: { type?: string; path?: string; referrer?: string; meta?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!body.type || !TYPES.has(body.type)) return new NextResponse(null, { status: 400 });

  const att = await attribution();
  if (!att.contactId && !att.campaignCode) return new NextResponse(null, { status: 204 });

  // A real page view from an email link is the human click the funnel counts.
  if (body.type === "page_view" && att.sendId) {
    await q(`update sends set clicked_at = coalesce(clicked_at, now()) where id = $1`, [att.sendId]);
    await advanceStage(att.contactId, "clicked");
  }
  await recordEvent(body.type, att, {
    path: body.path?.slice(0, 300),
    referrer: body.referrer?.slice(0, 300) || null,
    meta: { ...(body.meta ?? {}), ua: req.headers.get("user-agent")?.slice(0, 160) },
  });

  return new NextResponse(null, { status: 204 });
}
