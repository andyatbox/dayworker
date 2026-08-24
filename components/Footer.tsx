import LegalLinks from "./LegalLinks";
import { InstagramIcon, FacebookIcon, LinkedInIcon } from "./Icons";

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/dayworker.co", Icon: InstagramIcon },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=100092431745290",
    Icon: FacebookIcon,
  },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/dayworker-inc", Icon: LinkedInIcon },
];

export default function Footer() {
  return (
    <footer className="bg-black px-5 pb-14 pt-28 text-white md:px-10 md:pt-36">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-5 text-lg md:text-xl">
        <span>Join us on the socials at</span>
        <span className="flex items-center gap-3">
          {SOCIALS.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex h-11 w-11 items-center justify-center border-[3px] border-yellow text-yellow transition-colors duration-100 ease-linear hover:bg-yellow hover:text-black"
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </span>
        <span className="text-yellow">|</span>
        <span>
          contact us at{" "}
          <a
            href="mailto:info@dayworker.co"
            className="font-extrabold underline decoration-yellow decoration-2 underline-offset-4 transition-colors duration-100 ease-linear hover:bg-yellow hover:text-black"
          >
            info@dayworker.co
          </a>
        </span>
      </div>

      <div className="mt-20 border-t-[3px] border-yellow pt-8">
        <p className="max-w-[70ch] text-sm leading-relaxed">
          † After our introductory period, job postings require a small monthly
          membership fee.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3 text-xs font-extrabold uppercase tracking-[0.3em]">
          <span>© 2026 Dayworker, Inc. All Rights Reserved.</span>
          <LegalLinks />
        </div>
      </div>
    </footer>
  );
}
