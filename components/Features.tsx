import Reveal from "./Reveal";
import ParallaxImage from "./ParallaxImage";

/* h-full so a cell fills its stretched grid row — otherwise a short cell in a
   row with a taller sibling leaves the black grid background showing below it. */
const CELL = "flex h-full min-h-[320px] flex-col justify-between gap-10 p-10 md:p-14";

function FeatureCell({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div
      className={`group ${CELL} bg-white transition-colors duration-100 ease-linear hover:bg-yellow`}
    >
      {/* Flips to white on hover, since the cell itself turns yellow. */}
      <span className="w-fit bg-yellow px-2 py-1 text-xs font-extrabold uppercase tracking-[0.3em] transition-colors duration-100 ease-linear group-hover:bg-white">
        {n}
      </span>
      <div>
        <h3 className="text-2xl font-extrabold uppercase leading-tight tracking-[0.04em] md:text-3xl">
          {title}
        </h3>
        <p className="mt-5 max-w-[34ch] leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

/**
 * The features board: a hard black grid, cells sliding in from all four
 * directions, image cells parallaxing inside their frames.
 */
export default function Features() {
  return (
    <section id="features" className="bg-white">
      <div className="px-5 pb-16 pt-28 md:px-10 md:pb-24 md:pt-44">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <Reveal dir="right" className="lg:col-span-3">
            <p className="mt-[38px] text-xs font-extrabold uppercase tracking-[0.3em]">
              <span className="bg-yellow px-2 py-1">Dayworker features</span>
            </p>
          </Reveal>
          <Reveal dir="up" className="lg:col-span-9">
            <h2 className="display text-[clamp(2.6rem,6.2vw,6rem)]">
              Finally, tech for the{" "}
              <span className="whitespace-nowrap">blue-collar</span> workforce.
            </h2>
            <p className="mt-10 max-w-[46ch] text-lg leading-relaxed md:text-xl">
              Available on desktop and Apple / Google Play mobile apps. Key
              features include&hellip;
            </p>
          </Reveal>
        </div>
      </div>

      <div className="border-y-[3px] border-black bg-black">
        <div className="grid grid-cols-1 gap-[3px] md:grid-cols-2 lg:grid-cols-3">
          <Reveal dir="right">
            <FeatureCell
              n="Workers"
              title="Job search"
              body="Find and apply for jobs that meet your qualifications and skill set."
            />
          </Reveal>
          <Reveal dir="down" delay={60}>
            <ParallaxImage
              src="/images/carpenter-saw.jpg"
              alt="Carpenter cutting lumber on site"
              className="h-full min-h-[320px]"
            />
          </Reveal>
          <Reveal dir="left" delay={120}>
            <FeatureCell
              n="Contractors"
              title="Worker search"
              body="Find skilled workers, fast! Search for qualified workers based on their location, skills, and qualifications, then message them directly."
            />
          </Reveal>

          <Reveal dir="right" delay={60}>
            <ParallaxImage
              src="/images/cleaning.jpg"
              alt="Professional cleaner at work"
              className="h-full min-h-[320px]"
            />
          </Reveal>
          <Reveal dir="up">
            <FeatureCell
              n="Contractors"
              title="Job posts & applicants"
              body="Post a job and set application requirements. Vet your applicants through the messenger, and give your stamp of approval when it works."
            />
          </Reveal>
          <Reveal dir="left" delay={120}>
            <ParallaxImage
              src="/images/construction-country.jpg"
              alt="Crew on a rural build"
              className="h-full min-h-[320px]"
            />
          </Reveal>

          <Reveal dir="right">
            <FeatureCell
              n="Networking"
              title="Dashboard"
              body="Your command post for contacts, managing job postings or applications, and building your professional network."
            />
          </Reveal>
          <Reveal dir="up" delay={60}>
            <ParallaxImage
              src="/images/paving.jpg"
              alt="Crew laying paving stones"
              className="h-full min-h-[320px]"
            />
          </Reveal>
          <Reveal dir="left" delay={120}>
            <FeatureCell
              n="Workers"
              title="Achievement badges"
              body="Earn badges as you work and boost your profile. Big earners appear more reliable and professional to interested contractors."
            />
          </Reveal>

          <Reveal dir="right" delay={60}>
            <ParallaxImage
              src="/images/chopper.jpg"
              alt="Worker splitting timber"
              className="h-full min-h-[320px]"
            />
          </Reveal>
          <Reveal dir="up">
            <FeatureCell
              n="Networking"
              title="Live-translated messenger"
              body="Our private messenger is your link to professional success. Use it for networking and at the job site for communication in any spoken language."
            />
          </Reveal>
          <Reveal dir="left" delay={120}>
            <ParallaxImage
              src="/images/electrician.jpg"
              alt="Electrician wiring a panel"
              className="h-full min-h-[320px]"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
