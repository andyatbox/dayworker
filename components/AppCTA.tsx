import Reveal from "./Reveal";
import ParallaxSlideshow from "./ParallaxSlideshow";
import Btn from "./Btn";
import AppDownload from "./AppDownload";
import SignupButton from "./join/SignupButton";
import { ArrowIcon } from "./Icons";
import { SHOW_ACCOUNT_CTA } from "./featureFlags";

const SHOTS = [
  { src: "/images/carpenters-house.jpg", alt: "Carpenters framing a house" },
  { src: "/images/construction-building.jpg", alt: "Crew raising a building frame" },
  { src: "/images/carpenter-saw.jpg", alt: "Carpenter cutting lumber on site" },
  { src: "/images/construction-country.jpg", alt: "Crew on a rural build" },
  { src: "/images/electrician.jpg", alt: "Electrician wiring a panel" },
  { src: "/images/paving.jpg", alt: "Crew laying paving stones" },
  { src: "/images/chopper.jpg", alt: "Mechanic working on a build" },
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
  return (
    <section id="signup" className="border-y-[3px] border-yellow bg-black text-white">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="flex flex-col justify-center gap-12 px-5 py-28 md:px-10 lg:col-span-7 lg:py-44">
          <Reveal dir="right">
            <p className="mt-[15px] text-xs font-extrabold uppercase tracking-[0.3em] text-yellow">
              Let&rsquo;s get to work
            </p>
          </Reveal>
          <Reveal dir="up" delay={60}>
            <h2 className="display text-[clamp(2.4rem,5.2vw,5rem)] text-yellow">
              Sign up and post or apply for jobs today.
            </h2>
          </Reveal>
          <Reveal dir="up" delay={180} className="flex w-full max-w-[480px] flex-col gap-4">
            {SHOW_ACCOUNT_CTA && (
              <Btn href="#" big className={BTN}>
                Get started <ArrowIcon />
              </Btn>
            )}
            {/* One store button — /app sniffs the platform and forwards. */}
            <AppDownload from="signup" big className={BTN} />
            <SignupButton from="signup" big className={BTN} />
          </Reveal>
        </div>

        <Reveal dir="left" className="lg:col-span-5">
          <ParallaxSlideshow
            images={SHOTS}
            className="h-full min-h-[360px] border-t-[3px] border-yellow lg:border-l-[3px] lg:border-t-0"
          />
        </Reveal>
      </div>
    </section>
  );
}
