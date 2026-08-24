import Reveal from "./Reveal";

/** Big opening statement — pure typography, heavy air. */
export default function Intro() {
  return (
    <section className="bg-white px-5 py-28 md:px-10 md:py-44">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <Reveal dir="right" className="lg:col-span-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.3em]">
            Dayworker revolution
          </p>
        </Reveal>

        <div className="lg:col-span-9">
          <Reveal dir="up">
            <p className="max-w-[26ch] text-2xl font-extrabold leading-[1.2] md:text-4xl xl:text-5xl">
              Our technology connects contractors with skilled on-demand workers
              &ndash; making labor shortage a thing of the past. Dayworker is not
              a recruiter or pay-per-hire job board.{" "}
              <span className="bg-yellow px-2 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
                There&rsquo;s no middlemen.
              </span>{" "}
              <span className="bg-yellow px-2 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
                No hiring fees.
              </span>
            </p>
          </Reveal>
          <Reveal dir="up" delay={90}>
            <p className="mt-12 max-w-[46ch] text-lg leading-relaxed md:text-xl">
              Dayworker is a private, B-to-B networking platform. Create a free
              profile, post or apply to jobs, build your network, and join us in
              the blue-collar revolution.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
