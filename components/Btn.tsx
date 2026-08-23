import type { ReactNode } from "react";

type BtnProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Adds a black keyline — use on yellow surfaces so the button reads as a box. */
  outlined?: boolean;
  className?: string;
  big?: boolean;
  small?: boolean;
};

/**
 * House button: black text on yellow, inverting to yellow-on-black on hover.
 * Fast, hard transition — functional animation stays quick and jolty.
 */
export default function Btn({
  children,
  href,
  onClick,
  outlined,
  className = "",
  big,
  small,
}: BtnProps) {
  const size = big
    ? "px-10 py-6 text-base tracking-[0.14em] md:text-lg"
    : small
      ? "px-4 py-2.5 text-[10px] tracking-[0.12em]"
      : "px-6 py-4 text-xs tracking-[0.14em] md:text-sm";
  const cls = [
    "group/btn inline-flex select-none items-center justify-center gap-3 bg-yellow text-black",
    "font-extrabold uppercase leading-none",
    size,
    outlined ? "border-[3px] border-black" : "",
    "transition-colors duration-100 ease-linear hover:bg-black hover:text-yellow",
    "active:translate-y-[2px]",
    className,
  ].join(" ");

  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}
