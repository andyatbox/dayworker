"use client";

/* eslint-disable @next/next/no-img-element */
import Reveal from "./Reveal";
import { useSiteCopy } from "./Lang";

/** The section's three type levels below the headline. */
const H3 = "max-w-[26ch] text-xl font-extrabold uppercase leading-tight tracking-[0.04em] md:text-2xl xl:text-3xl";
const BODY = "max-w-[46ch] text-lg leading-relaxed md:text-xl";
/** The black tag labels heading each half, in yellow. */
const LABEL = "text-sm font-extrabold uppercase tracking-[0.3em] text-yellow md:text-base";
const STRONG = "block max-w-[44ch] text-base font-extrabold uppercase leading-relaxed tracking-[0.04em] md:text-lg";

/**
 * Big opening statement — pure typography, heavy air — then what workers get
 * and, under the rule, job posts in the same shape: heading, detail, and what
 * it costs.
 */
export default function Intro() {
  const t = useSiteCopy().intro;
  return (
    <section id="about" className="bg-yellow px-5 py-28 md:px-10 md:py-44">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <Reveal dir="right" className="lg:col-span-4">
          <p className={`mt-[15px] ${LABEL}`}>
            <span className="bg-black px-2 py-1">{t.eyebrow}</span>
          </p>
          {/* Fills the otherwise empty eyebrow column. The PNG is cut out, so it
              sits straight on the yellow. */}
          <img
            src="/images/appillo-hero.png"
            alt=""
            aria-hidden="true"
            className="mt-10 hidden w-full max-w-[560px] lg:block"
          />
        </Reveal>

        <div className="lg:col-span-8">
          {/* In the page's h1 face (the display serif). An h2 in the markup:
              the hero's tagline stays the page's one h1. */}
          <Reveal dir="up">
            <h2 className="display max-w-[19ch] text-[clamp(2.6rem,5.6vw,5.5rem)]">
              {t.headline}
            </h2>
          </Reveal>
          <Reveal dir="up" delay={60}>
            <h3 className={`mt-10 md:mt-12 ${H3}`}>
              {t.sub}
            </h3>
          </Reveal>
          <Reveal dir="up" delay={120}>
            <p className={`mt-5 ${BODY}`}>
              {t.body}
            </p>
            <p className="mt-8">
              <strong className={STRONG}>{t.workersFree}</strong>
            </p>
          </Reveal>
          <Reveal dir="up" delay={150}>
            <div className="mt-16 border-t-[3px] border-black pt-10 md:mt-20 md:pt-12">
              <p className={LABEL}>
                <span className="bg-black px-2 py-1">{t.postsEyebrow}</span>
              </p>
              <h3 className={`mt-7 ${H3}`}>{t.postsTitle}</h3>
              <p className={`mt-5 ${BODY}`}>
                {t.postsBody}
              </p>
              <p className="mt-8">
                <strong className={STRONG}>
                  {t.postsFree[0]}
                  <span className="underline decoration-2 underline-offset-[5px]">{t.postsFree[1]}</span>
                  {t.postsFree[2]}
                  <sup>†</sup>
                </strong>
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
