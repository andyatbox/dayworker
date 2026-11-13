/**
 * The web sign-up's Firebase settings, all public by design (they ship in the
 * page, as they do in the apps). Kept apart from signup.ts so the form can
 * check `firebaseSignupReady` without pulling the Firebase SDK into the page.
 *
 * Every value is a NEXT_PUBLIC_ variable, inlined at build time: change one on
 * Vercel and redeploy.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * The Firestore database the apps read profiles from. The developer confirmed
 * it's the one named "production" — not "(default)", and not "development",
 * which is where the Dayworker SDK's signUp() writes when NODE_ENV is
 * production.
 */
export const PROFILE_DB = process.env.NEXT_PUBLIC_FIREBASE_PROFILE_DB || "production";

/**
 * Where the welcome-email request goes: `mail` in "(default)", as the SDK
 * writes it. The email extension's templates live there too
 * (email--join-{contractor|worker}--{EN-US|ES-MX}).
 */
export const MAIL_DB = process.env.NEXT_PUBLIC_FIREBASE_MAIL_DB || "(default)";

/** Local testing only: the host of a running Firebase emulator suite. Never set on Vercel. */
export const EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR;

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** True once the project's web settings and the Maps key are in place; until then the form won't submit. */
export const firebaseSignupReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && MAPS_KEY);
