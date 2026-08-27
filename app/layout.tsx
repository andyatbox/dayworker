import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import ViewportHeight from "@/components/ViewportHeight";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "800"],
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
      <body>
        <SmoothScroll />
        <ViewportHeight />
        {children}
      </body>
    </html>
  );
}
