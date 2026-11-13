/**
 * Cheap signals for prioritising a list. None of them is a fact about the
 * person — they only order who we write to first.
 */

/** Consumer mailbox providers: a one-truck shop, not a firm with an HR desk. */
export const FREE_MAIL = new Set([
  "gmail.com", "yahoo.com", "aol.com", "hotmail.com", "icloud.com", "outlook.com",
  "optonline.net", "verizon.net", "msn.com", "live.com", "me.com", "comcast.net",
  "att.net", "ymail.com", "protonmail.com", "mail.com", "optimum.net",
]);

/** Common Hispanic surnames — tags a contact `es-likely` so a Spanish line
 *  can be offered. Language is never assumed from it. */
const ES_SURNAMES = new Set(
  `garcia rodriguez martinez hernandez lopez gonzalez perez sanchez ramirez torres flores
  rivera gomez diaz cruz reyes morales ortiz gutierrez chavez ramos ruiz alvarez mendoza
  vasquez vazquez castillo jimenez moreno romero herrera medina aguilar guzman munoz
  rojas mejia castro vargas fernandez salazar soto delgado pena ortega rios sandoval
  guerrero estrada nunez figueroa marquez lara navarro cardenas cabrera santiago velasquez
  campos fuentes acosta ayala espinoza contreras dominguez valencia padilla molina alvarado
  orellana chicas portillo quintanilla argueta zelaya bonilla villatoro canales paz
  carrillo maldonado cordero rosario pineda zuniga avila calderon montoya serrano`
    .split(/\s+/)
    .filter(Boolean),
);

export function esLikely(lastName: string | null | undefined) {
  return (lastName ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[\s-]+/)
    .some((part) => ES_SURNAMES.has(part));
}

/** Business name reduced for matching across datasets. */
export function bizKey(name: string | null | undefined) {
  return (name ?? "")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\b(THE|INC|INCORPORATED|LLC|L L C|CORP|CORPORATION|CO|COMPANY|LTD|GROUP|NY|NYC)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function phoneKey(phone: string | null | undefined) {
  const d = (phone ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? d : "";
}
