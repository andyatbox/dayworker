"use client";

import { useCallback, useEffect, useState } from "react";
import { lenisRef } from "./SmoothScroll";
import { CloseIcon } from "./Icons";

const DOCS = {
  terms: { label: "Terms", url: "https://www.dayworker.co/terms" },
  privacy: { label: "Privacy", url: "https://www.dayworker.co/privacy" },
} as const;

type DocKey = keyof typeof DOCS;

/** Terms / Privacy, opened in an overlay over the existing dayworker.co pages. */
export default function LegalLinks() {
  const [doc, setDoc] = useState<DocKey | null>(null);

  const close = useCallback(() => {
    setDoc(null);
    lenisRef.current?.start();
  }, []);

  const open = useCallback((k: DocKey) => {
    setDoc(k);
    lenisRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, close]);

  return (
    <>
      {(Object.keys(DOCS) as DocKey[]).map((k, i) => (
        <span key={k}>
          {i > 0 && <span className="px-2">|</span>}
          <button
            type="button"
            onClick={() => open(k)}
            className="font-extrabold uppercase tracking-[0.3em] underline decoration-yellow decoration-2 underline-offset-4 transition-colors duration-100 ease-linear hover:bg-yellow hover:text-black"
          >
            {DOCS[k].label}
          </button>
        </span>
      ))}

      {doc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-10"
          role="dialog"
          aria-modal="true"
          aria-label={DOCS[doc].label}
          data-lenis-prevent
          onClick={close}
        >
          <div
            className="relative flex h-full w-full max-w-[1100px] flex-col border-[3px] border-black bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b-[3px] border-black bg-yellow px-5 py-4">
              <h2 className="text-sm font-extrabold uppercase tracking-[0.3em] text-black">
                {DOCS[doc].label}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label={`Close ${DOCS[doc].label}`}
                className="flex h-9 w-9 items-center justify-center bg-black text-yellow transition-colors duration-100 ease-linear hover:bg-white hover:text-black"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <iframe
              title={DOCS[doc].label}
              src={DOCS[doc].url}
              className="h-full w-full grow border-none bg-white"
            />
          </div>
        </div>
      )}
    </>
  );
}
