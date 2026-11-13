import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Montserrat, Latin, one variable file for every weight we use (400 body,
// 600 form labels, 800 headings). Served from the site rather than fetched
// from Google at build time: Google now gives font addresses Next.js's loader
// can't read, which failed the Vercel build.
const montserrat = localFont({
  src: [{ path: "../public/fonts/Montserrat-Variable-latin.woff2", weight: "400 800", style: "normal" }],
  variable: "--font-montserrat",
  display: "swap",
});

const noe = localFont({
  src: [
    { path: "../public/fonts/NoeDisplay-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-noe",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dayworker.co"),
  title: "Dayworker — The Blue-Collar Pro Network",
  description:
    "Dayworker connects contractors with skilled workers, on demand. No middlemen. No hiring fees. Build your free profile — available online and on iOS and Android.",
  manifest: "/site.webmanifest",
  /**
   * Safari's Smart App Banner, across the top of the page on iOS. The Android
   * counterpart is not a tag at all — it is related_applications in
   * site.webmanifest, which is what Chrome reads.
   */
  itunes: { appId: "6502521610" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Dayworker — The Blue-Collar Pro Network",
    description:
      "Contractors and skilled workers, connected on demand. No middlemen. No hiring fees.",
    url: "https://dayworker.co",
    siteName: "Dayworker",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbed23",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${noe.variable}`}>
      <body>{children}</body>
    </html>
  );
}
