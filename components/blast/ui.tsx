import type { ReactNode } from "react";

/** Small, hard-edged admin primitives in the Dayworker style. */

export const btn =
  "inline-flex items-center justify-center gap-2 border-2 border-black bg-yellow px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] hover:bg-black hover:text-yellow disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 border-2 border-black bg-white px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] hover:bg-yellow";
export const btnDark =
  "inline-flex items-center justify-center gap-2 border-2 border-black bg-black px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-yellow hover:bg-yellow hover:text-black";
export const input = "w-full border-2 border-black bg-white px-3 py-2 text-sm outline-none focus:shadow-[0_0_0_3px_#fbed23]";
export const label = "mb-1 block text-[10px] font-extrabold uppercase tracking-[0.16em] text-black/70";

export function PageTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-4xl md:text-5xl">{title}</h1>
        {sub && <p className="mt-2 max-w-[80ch] text-sm text-black/70">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", action }: { title?: ReactNode; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`border-2 border-black bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b-2 border-black px-4 py-3">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em]">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label: l, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "yellow" | "black" }) {
  const bg = tone === "yellow" ? "bg-yellow" : tone === "black" ? "bg-black text-white" : "bg-white";
  return (
    <div className={`border-2 border-black p-4 ${bg}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] opacity-70">{l}</p>
      <p className="mt-2 text-3xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-70">{sub}</p>}
    </div>
  );
}

export function Badge({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "good" | "warn" | "bad" | "dark" }) {
  const map = {
    plain: "bg-white",
    good: "bg-[#c8f0c8]",
    warn: "bg-yellow",
    bad: "bg-[#ffc9c9]",
    dark: "bg-black text-yellow",
  };
  return <span className={`inline-block border border-black px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${map[tone]}`}>{children}</span>;
}

/** Plain-English stage names for the admin. */
export const STAGE_LABEL: Record<string, string> = {
  registered: "signed up (page)",
  app: "app download",
  member: "in app",
};
export const stageLabel = (stage: string) => STAGE_LABEL[stage] ?? stage;

export function stageTone(stage: string): "plain" | "good" | "warn" | "bad" | "dark" {
  if (stage === "member") return "dark";
  if (["registered", "app"].includes(stage)) return "good";
  if (["clicked", "replied"].includes(stage)) return "warn";
  if (["unsubscribed", "bounced"].includes(stage)) return "bad";
  if (stage === "contacted") return "dark";
  return "plain";
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto border-2 border-black bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b-2 border-black bg-yellow">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-black/15 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top">{children}</tbody>
      </table>
      {empty && <p className="hidden p-6 text-center text-sm text-black/60 only:block">{empty}</p>}
    </div>
  );
}

export function pct(n: number, d: number) {
  if (!d) return "—";
  const v = (n / d) * 100;
  return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)}%`;
}

export function fmt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("en-US");
}

export function when(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

export function Warning({ children }: { children: ReactNode }) {
  return <div className="border-2 border-black border-l-[8px] bg-yellow px-4 py-3 text-sm">{children}</div>;
}
