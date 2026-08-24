import Btn from "./Btn";
import TopNav from "./TopNav";
import { AppleIcon, GooglePlayIcon } from "./Icons";

/** Tinted-blur slab, matching the hero's video CTA. */
const BOX =
  "pointer-events-auto flex items-center gap-3 border-[3px] border-black bg-white/70 px-3 backdrop-blur-md";

/**
 * Fixed chrome: the jump-to strip spans the content region, with the app and
 * account boxes stacked beneath it on the right. The mark lives in the hero and
 * clamps up to meet the account row on scroll — LogoSwap measures the row
 * tagged data-chrome-row, so it stays aligned when the nav hides itself.
 */
export default function Header() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-5 pt-5 md:px-10 md:pt-8">
      <TopNav />

      <div data-chrome-row className="mt-3 flex flex-col items-end">
        <div className={`${BOX} h-[79px]`}>
          <Btn href="/app">
            <AppleIcon />
            <span>Download the app</span>
            <GooglePlayIcon />
          </Btn>
        </div>

        {/* Pulled up by one border width so the two boxes share a single stroke. */}
        <div className={`${BOX} -mt-[3px] h-[58px]`}>
          <Btn href="#signup" small>
            Get started
          </Btn>
          <Btn href="#signin" small>
            Sign in
          </Btn>
        </div>
      </div>
    </header>
  );
}
