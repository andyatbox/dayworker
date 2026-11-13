"use client";

import Tracker from "./Tracker";
import InviteModal from "./InviteModal";
import SignupPanel from "./SignupPanel";

/**
 * Everything the email campaigns add to the home page, in one place: the
 * personal invitation pop-up, the sign-up panel, and first-party tracking for
 * campaign traffic. The site's own sections are untouched by it.
 */
export default function JoinLayer() {
  return (
    <>
      <Tracker />
      <InviteModal />
      <SignupPanel />
    </>
  );
}
