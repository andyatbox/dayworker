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
  async redirects() {
    return [{
      "source": "/((?!\\.well-known|job|user).*)",
      "has": [{ "type": "host", "value": "dayworker.co" }],
      "destination": "https://www.dayworker.co/$1",
      "permanent": true
    }]
  }
};

export default nextConfig;
