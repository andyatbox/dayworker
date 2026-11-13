import Reveal from "./Reveal";

/** The section's three type levels below the headline. */
const H3 = "max-w-[26ch] text-xl font-extrabold uppercase leading-tight tracking-[0.04em] md:text-2xl xl:text-3xl";
const BODY = "max-w-[46ch] text-lg leading-relaxed md:text-xl";
const STRONG = "block max-w-[44ch] text-base font-extrabold uppercase leading-relaxed tracking-[0.04em] md:text-lg";

/**
 * Big opening statement — pure typography, heavy air — then what workers get
 * and, under the rule, job posts in the same shape: heading, detail, and what
 * it costs.
 */
export default function Intro() {
  return (
    <section id="about" className="bg-yellow px-5 py-28 md:px-10 md:py-44">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <Reveal dir="right" className="lg:col-span-3">
          <p className="mt-[15px] text-xs font-extrabold uppercase tracking-[0.3em]">
            <span className="bg-black px-2 py-1 text-white">A revolution</span>
          </p>
          {/* Fills the otherwise empty eyebrow column. The PNG is cut out, so it
              sits straight on the yellow. */}
          <img
            src="/images/appillo-hero.png"
            alt=""
            aria-hidden="true"
            className="mt-10 hidden w-full max-w-[420px] lg:block"
          />
        </Reveal>

        <div className="lg:col-span-9">
          {/* In the page's h1 face (the display serif). An h2 in the markup:
              the hero's tagline stays the page's one h1. */}
          <Reveal dir="up">
            <h2 className="display max-w-[19ch] text-[clamp(2.6rem,5.6vw,5.5rem)]">
              Dayworker connects skilled on-demand workers with local jobs.
            </h2>
          </Reveal>
          <Reveal dir="up" delay={60}>
            <h3 className={`mt-10 md:mt-12 ${H3}`}>
              We&rsquo;re not a recruiter. No middlemen or hiring fees, ever.
            </h3>
          </Reveal>
          <Reveal dir="up" delay={120}>
            <p className={`mt-5 ${BODY}`}>
              Dayworkers show off skills, experience, and qualifications, and
              apply to local jobs. Interested contractors reach out privately
              to sort out the details. With live-translated messaging,
              language is never a barrier when networking or on the job.
            </p>
            <p className="mt-8">
              <strong className={STRONG}>Workers apply to jobs for free, for life.</strong>
            </p>
          </Reveal>
          <Reveal dir="up" delay={150}>
            <div className="mt-16 border-t-[3px] border-black pt-10 md:mt-20 md:pt-12">
              <p className="text-xs font-extrabold uppercase tracking-[0.3em]">
                <span className="bg-black px-2 py-1 text-white">Job posts</span>
              </p>
              <h3 className={`mt-7 ${H3}`}>Build crews and on-board last-minute support.</h3>
              <p className={`mt-5 ${BODY}`}>
                Post jobs with requirements, build crews, and line up
                last-minute support when in a pinch. Message and approve
                workers to get the job done. Let&rsquo;s get connected and make
                laborer shortage a thing of the past.
              </p>
              <p className="mt-8">
                <strong className={STRONG}>
                  Free job postings for a limited time!<sup>†</sup>
                </strong>
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
