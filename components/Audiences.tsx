import Reveal from "./Reveal";
import ParallaxSlideshow from "./ParallaxSlideshow";
import AppDownload from "./AppDownload";
import { ArrowIcon } from "./Icons";

const CONTRACTOR_SHOTS = [
  { src: "/images/construction-building.jpg", alt: "Crew raising a building frame" },
  { src: "/images/carpenter-saw.jpg", alt: "Carpenter cutting lumber on site" },
  { src: "/images/construction-country.jpg", alt: "Crew on a rural build" },
  { src: "/images/electrician.jpg", alt: "Electrician wiring a panel" },
  { src: "/images/paving.jpg", alt: "Crew laying paving stones" },
  { src: "/images/chopper.jpg", alt: "Mechanic working on a build" },
];

/** Headline size for these sections — smaller than the hero, the copy is longer. */
const H2 = "display text-[clamp(2.4rem,5.2vw,5rem)]";

/** Contractors — inverted: black ground, copy left, image right. */
export function Contractors() {
  return (
    <section
      id="contractors"
      className="bg-black px-5 py-28 text-white md:px-10 md:py-44"
    >
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-y-20">
        <Reveal dir="right" className="lg:col-span-3">
          <p className="mt-[15px] text-xs font-extrabold uppercase tracking-[0.3em] text-yellow">
            Job posts
          </p>
        </Reveal>
        <Reveal dir="up" className="lg:col-span-9">
          <h2 className={`${H2} text-yellow`}>
            Build crews and on-board last-minute support.
          </h2>
        </Reveal>

        <div className="order-2 flex flex-col justify-center gap-10 lg:order-1 lg:col-span-5 lg:pr-8">
          <Reveal dir="right" delay={80}>
            <p className="text-lg leading-relaxed md:text-xl">
              Post jobs with requirements, build crews, and line up last-minute
              support when in a pinch. Message and approve workers to get the
              job done.
            </p>
          </Reveal>
          <Reveal dir="right" delay={160}>
            <p className="text-xl font-extrabold uppercase tracking-[0.04em]">
              <span className="bg-yellow px-2 text-black">No middlemen.</span>{" "}
              <span className="bg-yellow px-2 text-black">No hiring fees.</span>
            </p>
          </Reveal>
          <Reveal dir="up" delay={220}>
            {/* Posting happens in the app, so this hands the visitor the same
                download route as the store button — /app on a phone, QR on a
                desktop — under the wording that fits the section. */}
            <AppDownload big>
              Post a job <ArrowIcon />
            </AppDownload>
          </Reveal>
        </div>

        <Reveal dir="left" className="order-1 lg:order-2 lg:col-span-7">
          <ParallaxSlideshow
            images={CONTRACTOR_SHOTS}
            className="aspect-[16/10] border-[3px] border-yellow"
          />
        </Reveal>
      </div>
    </section>
  );
}
