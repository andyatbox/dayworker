import Reveal from "./Reveal";
import ParallaxImage from "./ParallaxImage";
import Btn from "./Btn";
import AppDownload from "./AppDownload";
import { ArrowIcon } from "./Icons";
import { SHOW_ACCOUNT_CTA } from "./featureFlags";

/** Closing board: yellow field, giant display type, sign-up + store buttons. */
export default function AppCTA() {
  return (
    <section id="signup" className="border-t-[3px] border-black bg-yellow">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="flex flex-col justify-center gap-12 px-5 py-28 md:px-10 lg:col-span-7 lg:py-44">
          <Reveal dir="right">
            <p className="mt-[15px] text-xs font-extrabold uppercase tracking-[0.3em]">
              Let&rsquo;s get to work
            </p>
          </Reveal>
          <Reveal dir="up" delay={60}>
            <h2 className="display text-[clamp(2.4rem,5.2vw,5rem)]">
              Get the app, create a profile, and post or apply for jobs today.
            </h2>
          </Reveal>
          <Reveal dir="up" delay={180} className="flex flex-wrap gap-5">
            {SHOW_ACCOUNT_CTA && (
              <Btn href="#" outlined big>
                Get started <ArrowIcon />
              </Btn>
            )}
            {/* One store button — /app sniffs the platform and forwards. */}
            <AppDownload outlined big />
          </Reveal>
        </div>

        <Reveal dir="left" className="lg:col-span-5">
          <ParallaxImage
            src="/images/carpenters-house.jpg"
            alt="Carpenters framing a house"
            className="h-full min-h-[360px] border-t-[3px] border-black lg:border-l-[3px] lg:border-t-0"
          />
        </Reveal>
      </div>
    </section>
  );
}
