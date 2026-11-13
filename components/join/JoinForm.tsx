"use client";

import { useRef, useState, type FormEvent } from "react";
import { copy, TRADES, tradeLabel, type Lang } from "@/lib/copy";
import { EMULATOR_HOST, firebaseSignupReady } from "@/lib/firebase/config";
import AppDownload from "../AppDownload";
import { ArrowIcon } from "../Icons";
import { track } from "./track-client";

export type Role = "contractor" | "worker";

export type JoinDefaults = {
  role: Role;
  name: string;
  business: string;
  email: string;
  zip: string;
  trades: string[];
};

/**
 * The sign-up: creates a real Dayworker account in Firebase, the same one the
 * apps create (lib/firebase/signup.ts), so people log in to the app with the
 * email and password they set here.
 *
 * The password goes to Firebase only. Our own server then gets a copy of the
 * rest (/api/register) for campaign attribution and crew-invite links; if that
 * fails, the account still stands.
 */
export default function JoinForm({
  lang,
  defaults,
  onRole,
  onDone,
}: {
  lang: Lang;
  defaults: JoinDefaults;
  /** Tells the panel which role is picked, so its intro text matches. */
  onRole?: (role: Role) => void;
  onDone?: () => void;
}) {
  const t = copy[lang];
  const f = t.form;
  const [role, setRole] = useState<Role>(defaults.role);
  const [trades, setTrades] = useState<string[]>(defaults.trades);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [done, setDone] = useState<{ first: string; email: string; refCode: string | null } | null>(null);
  const [reveal, setReveal] = useState(false);
  const started = useRef<number>(Date.now());
  const touched = useRef(false);

  const onFirstInput = () => {
    if (touched.current) return;
    touched.current = true;
    track("form_start", { role });
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const errs: Record<string, boolean> = {};
    if (!data.name?.trim()) errs.name = true;
    if (role === "contractor" && !data.business?.trim()) errs.business = true;
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(data.email ?? "")) errs.email = true;
    if (!/^\d{5}$/.test(data.zip ?? "")) errs.zip = true;
    // Firebase's own minimum. Trimmed, as the apps trim it at log-in.
    if ((data.password ?? "").trim().length < 6) errs.password = true;
    // The app asks for both before it lets anyone in; agreeing here saves
    // them that step on first open.
    if (data.acceptTerms !== "on") errs.acceptTerms = true;
    if (data.acceptPrivacy !== "on") errs.acceptPrivacy = true;
    setErrors(errs);
    const keys = Object.keys(errs);
    const only = (k: string) => errs[k] && keys.length === 1;
    if (keys.length) {
      setMessage(
        only("email") ? f.errEmail
        : only("zip") ? f.errZip
        : only("password") ? f.errPassword
        : keys.every((k) => k.startsWith("accept")) ? f.errAgree
        : f.errRequired,
      );
      return;
    }
    if (!firebaseSignupReady && !EMULATOR_HOST) {
      setMessage(f.errNotReady);
      return;
    }
    const { password, website, acceptTerms, acceptPrivacy, ...rest } = data;
    const elapsedMs = Date.now() - started.current;
    const first = data.name.trim().split(/\s+/)[0];
    const email = data.email.trim().toLowerCase();
    // Bots fill the hidden field or submit faster than a person can type:
    // they're shown the success screen, and no account is made.
    if (website || elapsedMs < 2500) {
      setDone({ first, email, refCode: null });
      setStatus("done");
      return;
    }
    setMessage("");
    setStatus("sending");

    let uid: string;
    try {
      const { signUp } = await import("@/lib/firebase/signup");
      ({ uid } = await signUp({
        role,
        email,
        password,
        name: data.name,
        business: data.business ?? "",
        phone: data.phone ?? "",
        zip: data.zip,
        trades,
        lang: data.lang === "es" ? "es" : "en",
        acceptedTerms: acceptTerms === "on",
        acceptedPrivacy: acceptPrivacy === "on",
      }));
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setStatus("idle");
      if (code === "auth/email-already-in-use") {
        setErrors({ email: true });
        setMessage(f.errExists);
      } else if (code === "auth/invalid-email") {
        setErrors({ email: true });
        setMessage(f.errEmail);
      } else if (code === "zip-not-found") {
        setErrors({ zip: true });
        setMessage(f.errZipNotFound);
      } else if (code === "zip-lookup-failed") {
        setMessage(f.errZipLookup);
      } else if (code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements") {
        setErrors({ password: true });
        setMessage(f.errPassword);
      } else {
        console.error("Sign-up failed", code, err);
        setMessage(code === "not-configured" ? f.errNotReady : f.errServer);
      }
      return;
    }

    // The account exists now. Our copy is for attribution and the crew
    // link only, so a failure here never undoes the success.
    let refCode: string | null = null;
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...rest,
          role,
          trades,
          uid,
          consentEmail: data.consentEmail === "on",
          consentSms: data.consentSms === "on",
          ref: new URLSearchParams(location.search).get("ref"),
          elapsedMs,
        }),
      });
      if (res.ok) refCode = ((await res.json()) as { refCode?: string }).refCode ?? null;
    } catch {
      // Logged by the browser; nothing for the person to do.
    }
    setDone({ first, email, refCode });
    setStatus("done");
    onDone?.();
  }

  if (status === "done" && done) {
    const s = t.success;
    // Opens the sign-up panel for the worker who follows it, credited to
    // this person when our copy of the sign-up was saved.
    const shareUrl = `${location.origin}/?${done.refCode ? `ref=${done.refCode}` : "signup"}&role=worker${lang === "es" ? "&lang=es" : ""}`;
    // Every hiring contractor who signs up now is a Founding Member (the panel says so).
    return <Success lang={lang} done={done} role={role} founding={role === "contractor"} shareUrl={shareUrl} s={s} />;
  }

  const label = "mb-2 block text-[11px] font-extrabold uppercase tracking-[0.16em]";

  return (
    // Fields arrive prefilled from the email, so a tap or focus counts as starting, not just typing.
    <form onSubmit={submit} onInput={onFirstInput} onFocus={onFirstInput} onClick={onFirstInput} noValidate className="flex flex-col gap-5">
      {/* Role */}
      <div>
        <span id="role-label" className={label}>{f.roleLabel}</span>
        <div className="grid grid-cols-2 border-[3px] border-black" role="radiogroup" aria-labelledby="role-label">
        {(["contractor", "worker"] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            onClick={() => {
              setRole(r);
              onRole?.(r);
              track("role_select", { role: r });
            }}
            className={`px-3 py-4 text-xs font-extrabold uppercase tracking-[0.12em] transition-colors duration-100 md:text-sm ${
              role === r ? "bg-black text-yellow" : "bg-white text-black hover:bg-yellow"
            }`}
          >
            {r === "contractor" ? f.roleContractor : f.roleWorker}
          </button>
        ))}
      </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className={role === "worker" ? "sm:col-span-2" : ""}>
          <label className={label} htmlFor="name">{f.name}</label>
          <input id="name" name="name" autoComplete="name" defaultValue={defaults.name} className="field" aria-invalid={!!errors.name} />
        </div>
        {role === "contractor" && (
          <div>
            <label className={label} htmlFor="business">{f.business}</label>
            <input id="business" name="business" autoComplete="organization" defaultValue={defaults.business} className="field" aria-invalid={!!errors.business} />
          </div>
        )}
        <div>
          <label className={label} htmlFor="email">{f.email}</label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={defaults.email} className="field" aria-invalid={!!errors.email} />
        </div>
        <div>
          <label className={label} htmlFor="password">{f.password}</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              minLength={6}
              className="field pr-20"
              aria-invalid={!!errors.password}
              aria-describedby="password-hint"
            />
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              aria-pressed={reveal}
              aria-controls="password"
              className="absolute inset-y-0 right-0 px-4 text-[11px] font-extrabold uppercase tracking-[0.14em] hover:bg-yellow"
            >
              {reveal ? f.hide : f.show}
            </button>
          </div>
          <p id="password-hint" className="mt-2 text-xs leading-snug opacity-70">{f.passwordHint}</p>
        </div>
        <div>
          <label className={label} htmlFor="phone">
            {f.phone} <span className="font-normal normal-case tracking-normal opacity-60">({f.optional})</span>
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" className="field" />
        </div>
        <div>
          <label className={label} htmlFor="zip">{f.zip}</label>
          <input id="zip" name="zip" inputMode="numeric" maxLength={5} autoComplete="postal-code" defaultValue={defaults.zip} className="field" aria-invalid={!!errors.zip} />
        </div>
      </div>

      <fieldset>
        <legend className={label}>{role === "contractor" ? f.tradesContractor : f.tradesWorker}</legend>
        <div className="flex flex-wrap gap-2">
          {TRADES.map(({ key }) => {
            const on = trades.includes(key);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setTrades((cur) => (on ? cur.filter((x) => x !== key) : [...cur, key]))}
                className={`border-2 border-black px-3 py-2 text-xs font-semibold transition-colors duration-100 ${on ? "bg-black text-yellow" : "bg-white hover:bg-yellow"}`}
              >
                {tradeLabel(key, lang)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {role === "contractor" && (
        <fieldset>
          <legend className={label}>{f.need}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {f.needOptions.map(([value, text], i) => (
              <label key={value} className="cursor-pointer">
                <input type="radio" name="need" value={value} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block border-2 border-black bg-white px-2 py-3 text-center text-xs font-semibold peer-checked:bg-black peer-checked:text-yellow peer-focus-visible:ring-4 peer-focus-visible:ring-yellow">
                  {text}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className={label}>{f.lang}</legend>
        <div className="flex gap-2">
          {(["en", "es"] as const).map((l) => (
            <label key={l} className="cursor-pointer">
              <input type="radio" name="lang" value={l} defaultChecked={l === lang} className="peer sr-only" />
              <span className="block border-2 border-black bg-white px-4 py-2 text-xs font-semibold peer-checked:bg-black peer-checked:text-yellow">
                {l === "en" ? "English" : "Español"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 text-sm leading-snug">
        {/* Required, never pre-checked: they become the profile's accepted
            terms and privacy flags. */}
        {(
          [
            ["acceptTerms", f.agreeTerms, "https://www.dayworker.co/terms"],
            ["acceptPrivacy", f.agreePrivacy, "https://www.dayworker.co/privacy"],
          ] as const
        ).map(([name, [before, link, after], href]) => (
          <label key={name} className={`flex items-start gap-3 ${errors[name] ? "font-semibold text-[#d11]" : ""}`}>
            <input type="checkbox" name={name} required aria-invalid={!!errors[name]} className="mt-0.5 h-5 w-5 shrink-0 accent-black" />
            <span>
              {before}
              <a className="underline" href={href} target="_blank" rel="noreferrer">{link}</a>
              {after}
            </span>
          </label>
        ))}
        <label className="flex items-start gap-3">
          <input type="checkbox" name="consentEmail" defaultChecked className="mt-0.5 h-5 w-5 shrink-0 accent-black" />
          <span>{f.consentEmail}</span>
        </label>
        {/* TCPA: express written consent, never pre-checked, not a condition of joining. */}
        <label className="flex items-start gap-3">
          <input type="checkbox" name="consentSms" className="mt-0.5 h-5 w-5 shrink-0 accent-black" />
          <span>{f.consentSms}</span>
        </label>
      </div>

      {/* Honeypot: hidden from people, irresistible to form bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute left-[-9999px] h-0 w-0 opacity-0" aria-hidden="true" />

      {message && <p className="border-l-[6px] border-[#d11] bg-white px-4 py-3 text-sm font-semibold" role="alert">{message}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        data-track="submit"
        className="inline-flex items-center justify-center gap-3 border-[3px] border-black bg-black px-8 py-5 text-sm font-extrabold uppercase tracking-[0.14em] text-yellow transition-colors duration-100 hover:bg-yellow hover:text-black disabled:opacity-60 md:text-base"
      >
        {status === "sending" ? f.sending : f.submit} <ArrowIcon />
      </button>
    </form>
  );
}

function Success({
  lang,
  done,
  role,
  founding,
  shareUrl,
  s,
}: {
  lang: Lang;
  done: { first: string; email: string; refCode: string | null };
  role: Role;
  founding: boolean;
  shareUrl: string;
  s: (typeof copy)["en"]["success"];
}) {
  const [copied, setCopied] = useState(false);
  const msg = `${s.shareMsg} ${shareUrl}`;
  const btn = "inline-flex items-center justify-center gap-2 border-[3px] border-black bg-white px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] hover:bg-yellow";
  return (
    <div className="flex flex-col gap-8" role="status">
      <div>
        <p className="display text-[clamp(2.2rem,4.5vw,3.6rem)]">{s.title(done.first)}</p>
        <p className="mt-4 text-lg leading-relaxed">{role === "contractor" ? s.contractor(done.email, founding) : s.worker(done.email)}</p>
      </div>

      <div className="border-[3px] border-black bg-white p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em]"><span className="bg-yellow px-2 py-1">01</span> {s.step1}</p>
        <p className="mt-3 leading-relaxed">{role === "contractor" ? s.step1b : s.step1bWorker}</p>
        <div className="mt-5">
          <AppDownload from="success" lang={lang} outlined />
        </div>
      </div>

      <div className="border-[3px] border-black bg-white p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em]"><span className="bg-yellow px-2 py-1">02</span> {s.step2}</p>
        <p className="mt-3 leading-relaxed">{role === "contractor" ? s.step2b : s.step2bWorker}</p>
        <p className="mt-4 break-all border-2 border-dashed border-black bg-yellow/40 px-3 py-2 font-mono text-sm">{shareUrl}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={btn}
            onClick={async () => {
              await navigator.clipboard?.writeText(shareUrl).catch(() => {});
              setCopied(true);
              track("share", { via: "copy" });
            }}
          >
            {copied ? s.copied : s.copy}
          </button>
          <a className={btn} href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" onClick={() => track("share", { via: "whatsapp" })}>
            {s.whatsapp}
          </a>
          <a className={btn} href={`sms:?&body=${encodeURIComponent(msg)}`} onClick={() => track("share", { via: "sms" })}>
            {s.text}
          </a>
        </div>
      </div>
    </div>
  );
}
