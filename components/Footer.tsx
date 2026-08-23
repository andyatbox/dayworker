/* eslint-disable @next/next/no-img-element */

const LINKS = [
  ["Features", "#features"],
  ["Workers", "#workers"],
  ["Contractors", "#contractors"],
  ["Sign up", "#signup"],
];

export default function Footer() {
  return (
    <footer className="bg-black px-5 pb-14 pt-28 text-white md:px-10 md:pt-40">
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <img src="/logos/DW-Logo.svg" alt="" className="h-16 w-16" />
          <img
            src="/logos/DW-White-Logotype.svg"
            alt="DAYWORKER"
            className="mt-10 h-8 md:h-12"
          />
          <p className="mt-8 max-w-[40ch] text-lg leading-relaxed">
            The blue-collar pro network. Contractors and skilled workers,
            connected on demand.
          </p>
        </div>

        <nav className="flex flex-col items-start gap-4 lg:col-span-5 lg:items-end">
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="bg-black px-2 py-1 text-2xl font-extrabold uppercase tracking-[0.08em] text-white transition-colors duration-100 ease-linear hover:bg-yellow hover:text-black md:text-3xl"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <div className="mt-24 border-t-[3px] border-yellow pt-8">
        <p className="max-w-[70ch] text-sm leading-relaxed">
          † After our introductory period, job postings require a small monthly
          membership fee.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs font-extrabold uppercase tracking-[0.3em]">
          <span>© 2026 Dayworker</span>
          <span className="bg-yellow px-2 py-1 text-black">dayworker.co</span>
        </div>
      </div>
    </footer>
  );
}
