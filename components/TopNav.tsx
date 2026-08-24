const LINKS: [string, string][] = [
  ["Reel", "#top"],
  ["About", "#about"],
  ["Features", "#features"],
  ["Workers", "#workers"],
  ["Job posts", "#contractors"],
  ["Get started", "#signup"],
];

/**
 * Jump-to strip, sized to its links and right-aligned. It sits in the hero's
 * flow rather than in fixed chrome, so it scrolls away with the hero. Below
 * 900px it drops out entirely — no wrapping, no burger.
 */
export default function TopNav() {
  return (
    <nav
      aria-label="Section navigation"
      className="hidden w-max border-[3px] border-black bg-white/70 backdrop-blur-md min-[900px]:block"
    >
      <ul className="flex w-max items-center gap-1 whitespace-nowrap px-2 py-1">
        {LINKS.map(([label, href]) => (
          <li key={href}>
            <a
              href={href}
              className="block px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-black transition-colors duration-100 ease-linear hover:bg-black hover:text-yellow"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
