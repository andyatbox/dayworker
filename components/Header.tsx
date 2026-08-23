import Btn from "./Btn";
import { AppleIcon, AndroidIcon } from "./Icons";

/** Tinted-blur slab, matching the hero's video CTA. */
const BOX =
  "pointer-events-auto flex items-center gap-3 border-[3px] border-black bg-white/70 px-3 backdrop-blur-md";

/**
 * Fixed chrome, top-right: the app box sits directly on the account box, their
 * strokes merged into one shared rule. The mark lives in the hero and clamps up
 * to meet them on scroll — see LogoSwap.
 */
export default function Header() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-end px-5 pt-5 md:px-10 md:pt-8">
      <div className={`${BOX} h-[79px]`}>
        <Btn href="/app">
          <AppleIcon />
          <span>Download the app</span>
          <AndroidIcon />
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
    </header>
  );
}
