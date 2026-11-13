import { NextResponse, type NextRequest } from "next/server";

/**
 * Two jobs, both for the email campaigns:
 *
 * - /blast (the campaign CRM) bounces visitors with no session cookie to its
 *   sign-in. The session itself is verified in the blast layout.
 * - Links that aren't email sends (flyers, social, QR: `?c=flyer-brentwood`)
 *   leave their campaign code and a visitor id behind, so what follows is
 *   credited to them.
 *
 * Everyone else passes straight through with no cookies at all: ordinary
 * visitors to dayworker.co aren't tracked, and the home page stays static.
 */
export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (pathname.startsWith("/blast") && pathname !== "/blast/login" && !req.cookies.get("dw_blast")) {
    return NextResponse.redirect(new URL("/blast/login", req.url));
  }

  const code = searchParams.get("c") ?? searchParams.get("utm_campaign");
  if (!code || !/^[\w-]{1,40}$/.test(code)) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set("dw_src", code, { maxAge: 60 * 60 * 24 * 90, sameSite: "lax", path: "/" });
  if (!req.cookies.get("dw_vid")) {
    res.cookies.set("dw_vid", crypto.randomUUID().replace(/-/g, "").slice(0, 20), { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next|api/|images|logos|fonts|favicon|apple-touch|\\.well-known|sw\\.js|site\\.webmanifest).*)"],
};
