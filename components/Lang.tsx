"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/copy";
import { siteCopy } from "@/lib/siteCopy";

/**
 * The home page's language. The page is built twice, English at / and
 * Spanish at /es; middleware serves the Spanish build for ?lang=es, or for a
 * visitor whose last choice was Spanish (the dw_lang cookie). The toggle then
 * switches in place: no reload, the address keeps ?lang=es (or drops it for
 * English) so a reload or a shared link lands the same way, and the cookie
 * remembers the choice for the next visit.
 */
export const LANG_COOKIE = "dw_lang";

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, set] = useState<Lang>(initial);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = siteCopy[lang].meta.title;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    set(l);
    const url = new URL(location.href);
    if (l === "es") url.searchParams.set("lang", "es");
    else url.searchParams.delete("lang");
    history.replaceState(history.state, "", url);
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}

/** The page's words in the current language. */
export function useSiteCopy() {
  return siteCopy[useContext(Ctx).lang];
}

/**
 * EN | ES, a pill at the top of the pinned column: a black knob slides under
 * the language that's on.
 */
export function LangToggle() {
  const { lang, setLang } = useLang();
  const t = siteCopy[lang].toggle;
  return (
    <div
      role="group"
      aria-label={t.label}
      className="pill relative flex h-8 items-center border-[2px] border-black bg-white/70 p-[2px] backdrop-blur-md"
    >
      <span
        aria-hidden="true"
        className="pill absolute bottom-[2px] left-[2px] top-[2px] w-10 bg-black transition-transform duration-200 ease-[cubic-bezier(0.85,0,0.15,1)]"
        style={{ transform: lang === "es" ? "translateX(100%)" : "none" }}
      />
      {(["en", "es"] as const).map((l) => {
        const on = l === lang;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-label={t[l]}
            aria-pressed={on}
            onClick={() => setLang(l)}
            className={`relative z-[1] h-full w-10 pl-[0.16em] text-[11px] font-extrabold uppercase leading-none tracking-[0.16em] transition-colors duration-150 ease-linear ${
              on ? "text-yellow" : "text-black hover:text-black/60"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
