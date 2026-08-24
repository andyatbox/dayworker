import Reveal from "./Reveal";
import ParallaxSlideshow from "./ParallaxSlideshow";
import Btn from "./Btn";
import { ArrowIcon } from "./Icons";

const WORKER_SHOTS = [
  { src: "/images/carpenter-saw.jpg", alt: "Carpenter cutting lumber on site" },
  { src: "/images/electrician.jpg", alt: "Electrician wiring a panel" },
  { src: "/images/chopper.jpg", alt: "Mechanic working on a build" },
];

const CONTRACTOR_SHOTS = [
  { src: "/images/construction-building.jpg", alt: "Crew raising a building frame" },
  { src: "/images/construction-country.jpg", alt: "Crew on a rural build" },
  { src: "/images/paving.jpg", alt: "Crew laying paving stones" },
];

/** Headline size for these sections — smaller than the hero, the copy is longer. */
const H2 = "display text-[clamp(2.4rem,5.2vw,5rem)]";

/** Workers — white ground, image left, copy right. */
export function Workers() {
  return (
    <section
      id="workers"
      className="bg-black px-5 py-28 text-white md:px-10 md:py-44"
    >
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-y-20">
        <Reveal dir="right" className="lg:col-span-3">
          <p className="mt-[15px] text-xs font-extrabold uppercase tracking-[0.3em] text-yellow">
            For the workers —
          </p>
        </Reveal>
        <Reveal dir="up" className="lg:col-span-9">
          <h2 className={`${H2} text-yellow`}>
            Showcase your skills and boost job frequency.
          </h2>
        </Reveal>

        <Reveal dir="right" className="lg:col-span-7">
          <ParallaxSlideshow
            images={WORKER_SHOTS}
            className="aspect-[16/10] border-[3px] border-yellow"
          />
        </Reveal>

        <div className="flex flex-col justify-center gap-10 lg:col-span-5 lg:pl-8">
          <Reveal dir="left" delay={80}>
            <p className="text-lg leading-relaxed md:text-xl">
              Show off your skills, experience, and qualifications, then apply
              to jobs near you. Interested contractors reach out privately to
              sort out the details. And with live-translated messaging,
              language is never a barrier on the job.
            </p>
          </Reveal>
          <Reveal dir="up" delay={220}>
            <Btn href="#signup" big>
              Create your profile <ArrowIcon />
            </Btn>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** Contractors — inverted: black ground, copy left, image right. */
export function Contractors() {
  return (
    // Keyline because Workers above is now black too — without it the two
    // sections read as one continuous field rather than two regions.
    <section
      id="contractors"
      className="border-t-[3px] border-yellow bg-black px-5 py-28 text-white md:px-10 md:py-44"
    >
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-y-20">
        <Reveal dir="right" className="lg:col-span-3">
          <p className="mt-[15px] text-xs font-extrabold uppercase tracking-[0.3em] text-yellow">
            For contractors —
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
            <Btn href="#signup" big>
              Post a job <ArrowIcon />
            </Btn>
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
