/**
 * Region from a ZIP. Coarse on purpose — it decides which market a contact
 * belongs to, not their mailing route.
 */
export type Region = "nyc" | "long-island" | "jersey-city" | "nj" | "other";

const HUDSON = new Set([
  "07002", "07029", "07030", "07032", "07047", "07086", "07087", "07093", "07094",
  "07302", "07303", "07304", "07305", "07306", "07307", "07308", "07310", "07311",
]);

export function regionFor(zipRaw: string | null | undefined): { region: Region; borough: string | null } {
  const zip = (zipRaw ?? "").trim().slice(0, 5);
  if (!/^\d{5}$/.test(zip)) return { region: "other", borough: null };
  const p3 = zip.slice(0, 3);
  if (["100", "101", "102"].includes(p3)) return { region: "nyc", borough: "Manhattan" };
  if (p3 === "103") return { region: "nyc", borough: "Staten Island" };
  if (p3 === "104") return { region: "nyc", borough: "Bronx" };
  if (p3 === "112") return { region: "nyc", borough: "Brooklyn" };
  if (["111", "113", "114", "116"].includes(p3) || zip === "11004" || zip === "11005")
    return { region: "nyc", borough: "Queens" };
  if (["110", "115", "117", "118", "119"].includes(p3)) return { region: "long-island", borough: null };
  if (HUDSON.has(zip)) return { region: "jersey-city", borough: null };
  if (zip.startsWith("07") || zip.startsWith("08")) return { region: "nj", borough: null };
  return { region: "other", borough: null };
}

export const IN_MARKET: Region[] = ["nyc", "long-island", "jersey-city"];
