import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Intro from "@/components/Intro";
import Features from "@/components/Features";
import AppCTA from "@/components/AppCTA";
import Footer from "@/components/Footer";
import JoinLayer from "@/components/join/JoinLayer";
import { LangProvider } from "@/components/Lang";
import type { Lang } from "@/lib/copy";
import { siteCopy } from "@/lib/siteCopy";

/** Title and description in the page's language, with each language's address. */
export function homeMetadata(lang: Lang): Metadata {
  const t = siteCopy[lang].meta;
  return {
    title: t.title,
    description: t.description,
    alternates: { languages: { en: "/", es: "/?lang=es" } },
    openGraph: {
      title: t.title,
      description: t.ogDescription,
      url: lang === "es" ? "https://dayworker.co/?lang=es" : "https://dayworker.co",
      siteName: "Dayworker",
      type: "website",
      locale: lang === "es" ? "es_US" : "en_US",
    },
  };
}

/** The home page, in either language; see LangProvider. */
export default function HomePage({ lang }: { lang: Lang }) {
  return (
    <LangProvider initial={lang}>
      {/* Reveal's horizontal entrance offsets sit off-frame until they animate in;
          clip them here. Not on html/body — those propagate their overflow to the
          viewport, so the page stays scrollable. `clip` keeps the vertical axis
          `visible`, creating no scroll container, and leaves the fixed mark alone. */}
      <main lang={lang} className="overflow-x-clip">
        <Hero />
        <Intro />
        <Features />
        <AppCTA />
        <Footer />
        <JoinLayer />
      </main>
    </LangProvider>
  );
}
