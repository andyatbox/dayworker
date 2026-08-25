import Reveal from "./Reveal";

/** Big opening statement — pure typography, heavy air. */
export default function Intro() {
  return (
    <section id="about" className="bg-white px-5 py-28 md:px-10 md:py-44">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <Reveal dir="right" className="lg:col-span-3">
          <p className="mt-[15px] text-xs font-extrabold uppercase tracking-[0.3em]">
            <span className="bg-yellow px-2 py-1">A revolution</span>
          </p>
          {/* Fills the otherwise empty eyebrow column. The mockup is already
              on white, so it reads as part of the page. */}
          <img
            src="/images/appillo-hero.jpg"
            alt=""
            aria-hidden="true"
            className="mt-10 hidden w-full max-w-[420px] lg:block"
          />
        </Reveal>

        <div className="lg:col-span-9">
          <Reveal dir="up">
            <p className="max-w-[26ch] text-2xl font-extrabold leading-[1.2] md:text-4xl xl:text-5xl">
              Dayworker connects skilled on-demand workers with local jobs,
              making laborer shortage a thing of the past. We&rsquo;re not a
              recruiter.{" "}
              <span className="bg-yellow px-2 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
                No middlemen or hiring fees, ever.
              </span>
            </p>
          </Reveal>
          <Reveal dir="up" delay={90}>
            <p className="mt-12 max-w-[46ch] text-lg leading-relaxed md:text-xl">
              We&rsquo;re a private B-to-B networking platform. Create a free
              profile, post or apply to jobs, and join the blue-collar
              revolution.
            </p>
          </Reveal>
          <Reveal dir="up" delay={150}>
            <p className="mt-8 max-w-[44ch] text-base font-extrabold uppercase leading-relaxed tracking-[0.04em] md:text-lg">
              Workers apply to jobs for free, for life.{" "}
              <span className="bg-yellow px-2 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
                Free job postings for a limited time!<sup>†</sup>
              </span>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
