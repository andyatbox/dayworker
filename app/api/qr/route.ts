import { type NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { config } from "@/lib/config";
import { ATT, SRC, VID } from "@/lib/track";

/**
 * The download QR for campaign traffic. It points at /app with this visitor's
 * signed email token (`a`), visitor id (`v`) and campaign code (`c`), so the
 * phone that scans it, which has none of this browser's cookies, is still
 * credited to the contractor the email went to. `from` names the button the
 * QR was opened from.
 */
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const from = (req.nextUrl.searchParams.get("from") ?? "button").replace(/[^\w-]/g, "").slice(0, 24);
  const url = new URL("/app", config.siteUrl);
  const a = req.cookies.get(ATT)?.value;
  const v = req.cookies.get(VID)?.value;
  const c = req.cookies.get(SRC)?.value;
  if (a) url.searchParams.set("a", a);
  if (v) url.searchParams.set("v", v);
  if (c) url.searchParams.set("c", c);
  url.searchParams.set("from", `qr_${from}`);

  return QRCode.toString(url.toString(), { type: "svg", margin: 0, errorCorrectionLevel: "M" }).then(
    (svg) =>
      new NextResponse(svg, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, no-store" },
      }),
  );
}
