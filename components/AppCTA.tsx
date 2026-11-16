"use client";

import Reveal from "./Reveal";
import { useLang } from "./Lang";
import { siteCopy } from "@/lib/siteCopy";
import ParallaxSlideshow from "./ParallaxSlideshow";
import Btn from "./Btn";
import AppDownload from "./AppDownload";
import SignupButton from "./join/SignupButton";
import { ArrowIcon } from "./Icons";
import { SHOW_ACCOUNT_CTA } from "./featureFlags";

/** Slideshow photos, in order; their alt text is in siteCopy (cta.shots). */
const SHOTS = [
  "/images/carpenters-house.jpg",
  "/images/construction-building.jpg",
  "/images/carpenter-saw.jpg",
  "/images/construction-country.jpg",
  "/images/electrician.jpg",
  "/images/paving.jpg",
  "/images/chopper.jpg",
];

/** Yellow keyline, so both buttons stay boxes on the black field. */
const BTN =
  "w-full whitespace-nowrap border-[3px] border-yellow max-sm:gap-2 max-sm:px-4 max-sm:text-[13px] max-sm:tracking-[0.1em]";

/**
 * Closing board: black field, giant yellow display type, the ways in stacked
 * at one width — get the app & sign up over sign up now (the form panel, mouse
 * devices only) — and the crew slideshow alongside. Yellow rules above and
 * below keep it apart from the black footer.
 */
export default function AppCTA() {
  const { lang } = useLang();
  const t = siteCopy[lang].cta;
  return (
    <section id="signup" className="border-y-[3px] border-yellow bg-black text-white">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="flex flex-col justify-center gap-12 px-5 py-28 md:px-10 lg:col-span-7 lg:py-44">
          <Reveal dir="right">
            <p className="mt-[15px] text-xs font-extrabold uppercase tracking-[0.3em] text-yellow">
              {t.eyebrow}
            </p>
          </Reveal>
          <Reveal dir="up" delay={60}>
            <h2 className="display text-[clamp(2.4rem,5.2vw,5rem)] text-yellow">
              {t.headline}
            </h2>
          </Reveal>
          <Reveal dir="up" delay={180} className="flex w-full max-w-[480px] flex-col gap-4">
            {SHOW_ACCOUNT_CTA && (
              <Btn href="#" big className={BTN}>
                {t.getStarted} <ArrowIcon />
              </Btn>
            )}
            {/* One store button — /app sniffs the platform and forwards. */}
            <AppDownload from="signup" lang={lang} big className={BTN} />
            <SignupButton from="signup" lang={lang} big className={BTN} />
          </Reveal>
        </div>

        <Reveal dir="left" className="lg:col-span-5">
          <ParallaxSlideshow
            images={SHOTS.map((src, i) => ({ src, alt: t.shots[i] }))}
            className="h-full min-h-[360px] border-t-[3px] border-yellow lg:border-l-[3px] lg:border-t-0"
          />
        </Reveal>
      </div>
    </section>
  );
}
