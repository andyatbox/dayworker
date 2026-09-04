import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { "source": "/user/:path*", "destination": "/job-landing.html" },
      { "source": "/job/:path*", "destination": "/job-landing.html" },
      { "source": "/privacy", "destination": "/privacy.html" },
      { "source": "/privacy/", "destination": "/privacy.html" },
      { "source": "/terms", "destination": "/terms.html" },
      { "source": "/terms/", "destination": "/terms.html" }
    ];
  },
  // Apex -> www. The path is carried over in a *named* group: Next.js has no
  // $1-style backreference, so an unnamed group leaves a literal "$1" in the
  // destination and every deep link lands on a 404.
  //
  // job/user and .well-known are excluded deliberately: the deep links and the
  // app-association files have to answer on the apex itself, and Apple's CDN
  // will not follow a redirect to fetch apple-app-site-association.
  async redirects() {
    return [{
      "source": "/:path((?!\\.well-known|job|user).*)",
      "has": [{ "type": "host", "value": "dayworker.co" }],
      "destination": "https://www.dayworker.co/:path",
      "permanent": true
    }]
  }
};

export default nextConfig;
