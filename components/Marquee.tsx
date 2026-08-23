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
 * Yellow ticker of trades — icon centred over its label, each cell divided by
 * a full-height black rule at the page's stroke weight. Icons render as
 * supplied, in full colour; don't filter them.
 */
export default function Marquee() {
  return (
    <div className="overflow-hidden border-y-[3px] border-black bg-white text-black">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-stretch" aria-hidden={copy === 1}>
            {TRADES.map(([label, icon]) => (
              <div key={label} className="flex items-stretch">
                <span className="w-[3px] shrink-0 self-stretch bg-black" />
                <div className="flex flex-col items-center justify-center gap-3 bg-white px-7 py-6 transition-colors duration-100 ease-linear hover:bg-yellow md:px-9">
                  <img
                    src={`/images/DWIcon-${icon}.svg`}
                    alt=""
                    aria-hidden="true"
                    className="h-[88px] w-[88px] shrink-0 md:h-24 md:w-24"
                  />
                  {/* Capped and wrapping, so a long trade name doesn't stretch
                      its cell. Fixed height reserves two lines either way, which
                      keeps every icon on the same line across the ticker. */}
                  <span className="block h-[30px] max-w-[160px] text-center text-xs font-extrabold uppercase leading-tight tracking-[0.18em]">
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
