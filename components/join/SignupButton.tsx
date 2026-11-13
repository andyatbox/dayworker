"use client";

import Btn from "../Btn";
import { ArrowIcon } from "../Icons";
import { copy, type Lang } from "@/lib/copy";
import { openSignup } from "./invite";
import { track } from "./track-client";
import { ShortLabel } from "../Collapse";

/**
 * "Sign up now": opens the sign-up panel wherever the visitor is. The black
 * twin of the app button above it. Choosing it is the form path on the email
 * dashboard. Not shown on touch devices: on a phone the app is the easier way
 * in, so it's the only one offered.
 */
export default function SignupButton({
  from,
  big,
  outlined,
  className,
  lang = "en",
  short = false,
}: {
  from: string;
  /** Folds the label to "Sign up" (the parked chrome). */
  short?: boolean;
  big?: boolean;
  outlined?: boolean;
  className?: string;
  lang?: Lang;
}) {
  return (
    <Btn
      href="#signup-now"
      dark
      outlined={outlined}
      big={big}
      className={`touch:hidden ${className ?? ""}`}
      onClick={(e) => {
        e.preventDefault();
        track("path_select", { path: "form", from });
        openSignup(from);
      }}
    >
      <ShortLabel full={copy[lang].cta.signup} short={copy[lang].cta.signupShort} hide={short} />
      <ArrowIcon />
    </Btn>
  );
}
