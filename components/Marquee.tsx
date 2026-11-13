/* eslint-disable @next/next/no-img-element */

/** Trade, and the DWIcon file that matches it. */
const TRADES: [string, string][] = [
  ["General Labor", "general-laborer"],
  ["Carpentry", "carpenter"],
  ["Cleaning", "cleaningandhousekeeping"],
  ["Concrete", "concrete"],
  ["Diesel Mechanic", "diesel-mechanic"],
  ["Drywall", "drywaller"],
  ["Electrical", "electrician"],
  ["Excavation", "excavation"],
  ["Flooring and Tiling", "tile-setter"],
  ["Framing", "framing"],
  ["Heavy Equipment Operator", "heavyequipmentoperator"],
  ["HVAC", "hvac-technician"],
  ["Landscaping", "landscaper"],
  ["Machining", "machinist"],
  ["Marine", "marine"],
  ["Masonry", "bricklayer-masonry-worker"],
  ["Mechanic", "mechanic"],
  ["Painting", "painter"],
  ["Paving", "paving"],
  ["Plumbing", "plumber"],
  ["Roofing", "roofing-contractor"],
  ["Scaffolding", "scaffolder"],
  ["Welding", "welder"],
];

/**
 * Ticker of trades along the foot of the hero — icon centred over its label,
 * each cell divided by a full-height black rule at the page's stroke weight.
 * Kept tight, since its height comes out of the landing screen. Tinted glass
 * like the page's other boxes, so the montage runs on behind it; a shade more
 * opaque than they are, because the footage is dark and the labels are small.
 * Icons render as supplied, in full colour; don't filter them.
 */
export default function Marquee() {
  return (
    <div className="relative z-10 shrink-0 overflow-hidden border-y-[3px] border-black bg-white/85 text-black backdrop-blur-md">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-stretch" aria-hidden={copy === 1}>
            {TRADES.map(([label, icon]) => (
              <div key={label} className="flex items-stretch">
                <span className="w-[3px] shrink-0 self-stretch bg-black" />
                <div className="flex flex-col items-center justify-center gap-2 px-5 py-2 transition-colors duration-100 ease-linear hover:bg-yellow md:px-8 md:py-3">
                  <img
                    src={`/images/DWIcon-${icon}.svg`}
                    alt=""
                    aria-hidden="true"
                    className="h-14 w-14 shrink-0 md:h-[72px] md:w-[72px]"
                  />
                  {/* Capped and wrapping, so a long trade name doesn't stretch
                      its cell. Fixed height reserves two lines either way, which
                      keeps every icon on the same line across the ticker. */}
                  <span className="block h-[26px] max-w-[130px] text-center text-[10px] font-extrabold uppercase leading-tight tracking-[0.16em] md:h-[30px] md:max-w-[160px] md:text-xs md:tracking-[0.18em]">
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
