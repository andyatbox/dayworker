/**
 * Creates a real Dayworker account from the web form: the same steps as the
 * Dayworker SDK's signUp(), which is how the apps register people.
 *
 * 1. ZIP → location (geoPoint + geohash) and "City, ST". Search runs on the
 *    location, so no account is made until the ZIP has been found.
 * 2. Firebase Auth email/password account.
 * 3. profiles/{uid} in the "production" Firestore database, in the full
 *    shape the apps write.
 * 4. The welcome email, as a request in the `mail` collection of the
 *    "(default)" database, where the email extension and its templates live.
 *
 * Browser-only, and loaded on submit rather than with the page, so the
 * homepage doesn't carry the Firebase SDK. Auth is kept in memory: the web has
 * nothing to stay signed in to, so nothing is left behind in the browser.
 */
import { getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  inMemoryPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import {
  GeoPoint,
  collection,
  connectFirestoreEmulator,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { geohashForLocation } from "geofire-common";
import { regionFor } from "@/lib/lists/geo";
import { EMULATOR_HOST, MAIL_DB, MAPS_KEY, PROFILE_DB, firebaseConfig, firebaseSignupReady } from "./config";

export type Role = "contractor" | "worker";

export type SignupInput = {
  role: Role;
  email: string;
  password: string;
  name: string;
  business: string;
  phone: string;
  zip: string;
  trades: string[];
  lang: "en" | "es";
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
};

/**
 * The apps' ids, from the `constants` collection in the production database
 * (read 2026-11-12). Our form's trade list is the CRM's, so each option is
 * mapped to the nearest app id; one with no match goes in as "other" (0),
 * named in the profile's free-text field.
 */
const WORKER_TRADE: Record<string, number> = {
  "General Labor": 1, // generalLaborer
  Carpentry: 5, // carpenter
  Cleaning: 0,
  Concrete: 9, // constructionWorker
  Demolition: 9, // constructionWorker
  "Diesel Mechanic": 20,
  Drywall: 21, // drywaller
  Electrical: 2, // electrician
  Excavation: 14, // heavyEquipmentOperator
  "Flooring and Tiling": 25, // tileSetter
  Framing: 5, // carpenter
  "Heavy Equipment Operator": 14,
  HVAC: 8,
  Landscaping: 13, // landscaper
  Machining: 6, // machinist
  Marine: 0,
  Masonry: 22, // masonryWorker
  Mechanic: 7,
  Painting: 10, // painter
  Paving: 23, // pavingContractor
  Plumbing: 3, // plumber
  Roofing: 12, // roofingContractor
  Scaffolding: 24, // scaffolder
  Welding: 4, // welder
};
const BIZ_FOCUS: Record<string, number> = {
  "General Labor": 2, // generalContractor
  Carpentry: 1,
  Cleaning: 20, // cleaningAndHousekeeping
  Concrete: 7,
  Demolition: 0,
  "Diesel Mechanic": 18,
  Drywall: 17,
  Electrical: 4,
  Excavation: 8,
  "Flooring and Tiling": 10,
  Framing: 1, // carpentry
  "Heavy Equipment Operator": 19, // heavyEquipmentOperations
  HVAC: 22,
  Landscaping: 12,
  Machining: 15,
  Marine: 21,
  Masonry: 11,
  Mechanic: 13,
  Painting: 6,
  Paving: 9,
  Plumbing: 3,
  Roofing: 5,
  Scaffolding: 16,
  Welding: 14,
};
/** Picked trades → sorted, de-duplicated app ids, plus the names that only fit "other". */
function ids(trades: string[], table: Record<string, number>) {
  const picked = [...new Set(trades.map((t) => table[t]).filter((n) => n !== undefined))].sort((a, b) => a - b);
  const other = trades.filter((t) => table[t] === 0).join(", ");
  return { picked, other };
}

/**
 * The profile the apps write at sign-up, field for field, as the developer
 * sent it (2026-11-12): type 1 is a worker, 2 a contractor; a contractor's
 * profile is named for the business and carries no worker trades. Trades
 * with no match go in as 0 ("Other"), and the app shows the free text in its
 * place. Terms and privacy are only marked accepted because the form requires
 * both boxes. No badges: the v2 app doesn't award Founding Member.
 */
function profileFor(uid: string, email: string, input: SignupInput, geo: Geo) {
  const contractor = input.role === "contractor";
  const trades = ids(input.trades, WORKER_TRADE);
  const focus = ids(input.trades, BIZ_FOCUS);
  const business = input.business.trim();
  return {
    uid,
    name: contractor ? business : input.name.trim(),
    email,
    zip: input.zip,
    phone: input.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""),
    phoneVerified: false,
    profileImage: null,
    bio: null,
    region: geo.region,
    countryCode: "US",
    callingCode: "+1",
    geoPoint: geo.geoPoint,
    geohash: geo.geohash,
    settings: {
      userViewType: contractor ? 2 : 1,
      currentRegion: null,
      notifications: { enabled: true, chat: true, newJobs: true, applicationUpdates: true, newApplications: true },
    },
    available: true,
    availableWeekdays: { m: true, t: true, w: true, T: true, f: true, s: true, S: true },
    willVolunteer: false,
    trades: contractor ? null : trades.picked,
    skillLevel: null,
    otherSkills: contractor ? null : trades.other || null,
    driversLicense: false,
    transportation: false,
    hourlyRate: null,
    resume: null,
    identityVerified: false,
    oshaCertified: false,
    backgroundCheck: false,
    isLicensed: false,
    hasInsurance: false,
    badges: [],
    contractorData: {
      bizName: contractor ? business : "",
      bizAddress1: "",
      bizAddress2: "",
      bizFocus: contractor ? focus.picked : null,
      otherBizFocus: contractor ? focus.other : "",
      about: "",
      EIN: "",
    },
    completedJobs: [],
    employers: [],
    favoriteUsers: [],
    favoriteWork: [],
    flags: [],
    regions: {},
    pathAlias: null,
    acceptedTermsVersion: input.acceptedTerms,
    acceptedPrivacyVersion: input.acceptedPrivacy,
  };
}

/** The welcome emails' template names, in the (default) database's `templates`. */
const TEMPLATE_LANG = { en: "EN-US", es: "ES-MX" } as const;

type Services = { auth: Auth; profiles: Firestore; mail: Firestore };
let services: Services | undefined;

function connect(): Services {
  if (services) return services;
  if (!firebaseSignupReady && !EMULATOR_HOST) throw new SignupError("not-configured");
  // A named app, so this never collides with any other Firebase use on the page.
  const app = getApps().find((a) => a.name === "web-signup") ?? initializeApp(firebaseConfig, "web-signup");
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  const profiles = getFirestore(app, PROFILE_DB);
  const mail = MAIL_DB === PROFILE_DB ? profiles : getFirestore(app, MAIL_DB);
  if (EMULATOR_HOST) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(profiles, EMULATOR_HOST, 8080);
    if (mail !== profiles) connectFirestoreEmulator(mail, EMULATOR_HOST, 8080);
  }
  services = { auth, profiles, mail };
  return services;
}

type Geo = { geoPoint: GeoPoint; geohash: string; region: string };
type Part = { long_name: string; short_name: string; types: string[] };
type Geocode = {
  status?: string;
  results?: { types: string[]; address_components: Part[]; geometry: { location: { lat: number; lng: number } } }[];
};

/**
 * The profile's `region`: "City, ST", as the apps write it. In the five
 * boroughs Google names the neighborhood ("Brooklyn Heights") and calls the
 * city "New York", so there the borough is used instead, from the ZIP: 11201
 * gives "Brooklyn, NY", Manhattan stays "New York, NY".
 */
function cityState(zip: string, parts: Part[]) {
  const get = (type: string, short = false) => {
    const part = parts.find((p) => p.types.includes(type));
    return part ? (short ? part.short_name : part.long_name) : "";
  };
  const { borough } = regionFor(zip);
  const city = borough
    ? borough === "Manhattan" ? "New York" : borough
    : get("locality") || get("sublocality") || get("neighborhood") || get("postal_town") || get("administrative_area_level_3");
  const state = get("administrative_area_level_1", true);
  return city && state ? `${city}, ${state}` : "";
}

/**
 * The SDK's googleMapsGeolocate(), held to US ZIPs. A profile without a
 * location never shows up in anyone's search, so this has to succeed before
 * the account is made: a ZIP Google doesn't know is sent back to be fixed, and
 * a lookup that fails on Google's side is tried once more, then reported.
 */
async function locate(zip: string): Promise<Geo> {
  if (!MAPS_KEY) throw new SignupError("not-configured");
  const q = new URLSearchParams({ address: zip, components: `country:US|postal_code:${zip}`, key: MAPS_KEY });
  for (const wait of [0, 1500]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    let data: Geocode;
    try {
      data = (await (await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${q}`)).json()) as Geocode;
    } catch {
      continue;
    }
    if (data.status === "ZERO_RESULTS") throw new SignupError("zip-not-found");
    if (data.status !== "OK") continue;
    const hit = data.results?.find((r) => r.types.includes("postal_code"));
    if (!hit) throw new SignupError("zip-not-found");
    const { lat, lng } = hit.geometry.location;
    return { geoPoint: new GeoPoint(lat, lng), geohash: geohashForLocation([lat, lng]), region: cityState(zip, hit.address_components) };
  }
  throw new SignupError("zip-lookup-failed");
}

export class SignupError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export async function signUp(input: SignupInput): Promise<{ uid: string }> {
  const { auth, profiles, mail } = connect();
  // Trimmed and lower-cased exactly as the SDK does at sign-up and at log-in,
  // so what's typed here works in the app.
  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();

  const geo = await locate(input.zip);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  try {
    await setDoc(doc(profiles, "profiles", uid), profileFor(uid, email, input, geo), { merge: true });
  } catch (err) {
    // No account without a profile: undo it, so the same email can try again.
    await deleteUser(cred.user).catch(() => {});
    throw err;
  }

  // The SDK's emailUser(): a request the email extension picks up and sends.
  // The account is already made, so a failure here is logged, not shown.
  await setDoc(doc(collection(mail, "mail")), {
    to: [email],
    template: {
      name: `email--join-${input.role}--${TEMPLATE_LANG[input.lang]}`,
      // The person, even when the profile carries the business name.
      data: { name: input.name.trim(), year: new Date().getFullYear() },
    },
    currentUID: uid,
    timestamp: serverTimestamp(),
  }).catch((err) => console.error("Welcome email not queued", err));

  await auth.signOut().catch(() => {});
  return { uid };
}
