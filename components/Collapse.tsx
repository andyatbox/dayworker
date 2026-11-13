import type { ReactNode } from "react";

/**
 * Part of a label that folds away to nothing, e.g. "Dayworker " in "Dayworker
 * Video" once the button parks. Keep the label one text run with it, so the
 * folded part doesn't leave the button's own flex gap behind.
 *
 * The 1fr->0fr grid track animates to the text's own width. Capping a
 * max-width instead would need a magic number, and anything short of the
 * tracked uppercase text clips its space, welding two words together. Write
 * that space as a non-breaking one inside the folding part.
 */
export default function Collapse({ hide, children }: { hide: boolean; children: ReactNode }) {
  return (
    <span
      className="inline-grid align-bottom transition-[grid-template-columns,opacity] duration-[260ms] ease-[cubic-bezier(0.85,0,0.15,1)]"
      style={{ gridTemplateColumns: hide ? "0fr" : "1fr", opacity: hide ? 0 : 1 }}
    >
      <span className="min-w-0 overflow-hidden">{children}</span>
    </span>
  );
}

/** "Get the app & sign up" -> "Get the app" + folding " & sign up". */
export function ShortLabel({ full, short, hide }: { full: string; short: string; hide: boolean }) {
  const tail = full.startsWith(short) ? full.slice(short.length).replace(/^ /, " ") : "";
  return (
    <span className="whitespace-nowrap">
      {tail ? short : full}
      {tail && <Collapse hide={hide}>{tail}</Collapse>}
    </span>
  );
}
