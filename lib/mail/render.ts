import { config } from "../config";
import { shortBusiness, sign } from "../util";

export type Step = {
  delay_days: number;
  subject: string;
  body: string;
  subject_es?: string;
  body_es?: string;
};

export type RenderContact = {
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  city: string | null;
  borough: string | null;
  trades: string[];
  lang: string;
};

export type RenderSender = { name: string; email: string; signature: string | null };

/**
 * plain: text only, like one person writing to another. Best inbox placement,
 *   so it's the default for cold sequences.
 * branded: the same words in an HTML layout with the header image and real
 *   buttons, plus the plain-text version alongside. For warmer sends (people
 *   who replied, events, tests).
 */
export type Design = "plain" | "branded";
export const HEADER_IMAGE = "/images/email/founding-header.jpg";

/** A line that is only `[Label](url)` becomes a button in the branded design. */
const BUTTON = /^\[([^\]]+)\]\((\S+)\)$/;

/**
 * Plain text, written like one person to another — that's what lands in the
 * primary inbox. Merge fields: {{first_name|there}} uses the text after the
 * bar when the field is empty. {{invite_link}} is their personal link to the
 * site; {{app_link}} goes straight to the app store and still credits them.
 *
 * Every email ends with the sender, the company's postal address and an
 * unsubscribe link (CAN-SPAM).
 */
export function renderEmail(opts: {
  steps: Step[];
  step: number;
  contact: RenderContact;
  sender: RenderSender;
  token: string;
  trackOpens: boolean;
  design?: Design;
}) {
  const { steps, step, contact, sender, token } = opts;
  const s = steps[step];
  const es = contact.lang === "es" && !!s.body_es?.trim();
  const lang = es ? "es" : "en";
  const vars: Record<string, string> = {
    first_name: contact.first_name?.split(/\s+/)[0] ?? "",
    last_name: contact.last_name ?? "",
    business_name: shortBusiness(contact.business_name),
    city: contact.city ?? "",
    area: contact.borough ?? contact.city ?? "",
    trade: (contact.trades[0] ?? "").toLowerCase(),
    invite_link: `${config.siteUrl}/i/${token}`,
    app_link: `${config.siteUrl}/app?a=${encodeURIComponent(sign(token))}&from=email`,
    sender_name: sender.name,
    sender_first: sender.name.split(/\s+/)[0],
  };
  const merge = (tpl: string) =>
    tpl.replace(/\{\{\s*(\w+)\s*(?:\|\s*([^}]*?))?\s*\}\}/g, (_, key: string, fallback?: string) => vars[key] || fallback || "");

  // Follow-ups with no subject reply in the same thread.
  const firstSubject = merge((es ? steps[0].subject_es : steps[0].subject) || steps[0].subject);
  const ownSubject = (es ? s.subject_es : s.subject)?.trim();
  const subject = ownSubject ? merge(ownSubject) : `Re: ${firstSubject}`;

  // An empty merge field shouldn't leave "Hola ," behind.
  // Browsers submit textareas with \r\n; one kind of line break from here on.
  const body = merge(((es ? s.body_es : s.body) ?? "").replace(/\r\n?/g, "\n").trim()).replace(/ +([,.!?])/g, "$1");
  const signature = (sender.signature?.replace(/\r\n?/g, "\n").trim() || `${sender.name}\nDayworker`).trim();
  const unsubscribe = `${config.siteUrl}/u/${token}`;
  const footer = [
    "--",
    `Dayworker, Inc.${config.companyAddress ? ` · ${config.companyAddress}` : ""}`,
    es ? `¿No le interesa? Cancele aquí: ${unsubscribe}` : `Not for you? Unsubscribe: ${unsubscribe}`,
  ].join("\n");
  // Buttons read as "Label: url" in the plain-text version.
  const text = `${body.replace(/^\[([^\]]+)\]\((\S+)\)$/gm, "$1: $2")}\n\n${signature}\n\n${footer}\n`;
  const pixel = opts.trackOpens ? `<img src="${config.siteUrl}/api/o/${token}.gif" width="1" height="1" alt="" style="display:block;border:0">` : "";

  let html: string | undefined;
  if (opts.design === "branded") {
    html = brandedHtml({ body, signature, footer: { address: config.companyAddress, unsubscribe, es }, invite: vars.invite_link, subject, pixel });
  } else if (opts.trackOpens) {
    const linked = esc(text).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}">${u}</a>`).replace(/\n/g, "<br>");
    html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111">${linked}</div>${pixel}`;
  }

  return { subject, text, html, lang, unsubscribe };
}

const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const linkify = (x: string) => esc(x).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color:#000;text-decoration:underline;word-break:break-all">${u}</a>`);

const FONT = "Montserrat,'Helvetica Neue',Helvetica,Arial,sans-serif";

/**
 * Table layout with inline styles: the only thing Outlook, Gmail and Apple
 * Mail all render the same. 600px wide, the site's black and yellow, the
 * header image linking to their invite. The first button is the main one
 * (yellow); any after it are outlined.
 */
function brandedHtml(o: { body: string; signature: string; footer: { address: string; unsubscribe: string; es: boolean }; invite: string; subject: string; pixel: string }) {
  let buttons = 0;
  const blocks = o.body.split(/\n{2,}/).map((para) => {
    const lines = para.split("\n").map((l) => l.trim());
    if (lines.every((l) => BUTTON.test(l))) {
      return lines
        .map((l) => {
          const [, label, url] = l.match(BUTTON)!;
          const main = buttons++ === 0;
          return `<tr><td style="padding:0 0 14px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" bgcolor="${main ? "#fbed23" : "#ffffff"}" style="border:3px solid #000;background:${main ? "#fbed23" : "#ffffff"}"><a href="${esc(url)}" style="display:block;padding:16px 20px;font-family:${FONT};font-size:14px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#000;text-decoration:none">${esc(label)} &rarr;</a></td></tr></table></td></tr>`;
        })
        .join("");
    }
    return `<tr><td style="padding:0 0 18px;font-family:${FONT};font-size:16px;line-height:1.6;color:#111">${lines.map(linkify).join("<br>")}</td></tr>`;
  });
  const f = o.footer;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.subject)}</title></head>
<body style="margin:0;padding:0;background:#f2f2f2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:3px solid #000">
<tr><td style="border-bottom:3px solid #000;line-height:0"><a href="${esc(o.invite)}"><img src="${config.siteUrl}${HEADER_IMAGE}" width="594" alt="Dayworker" style="display:block;width:100%;height:auto;border:0"></a></td></tr>
<tr><td style="padding:32px 32px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${blocks.join("")}
<tr><td style="padding:8px 0 0;font-family:${FONT};font-size:16px;line-height:1.5;color:#111">${o.signature.split("\n").map(esc).join("<br>")}</td></tr>
</table></td></tr>
<tr><td style="padding:20px 32px 26px;border-top:3px solid #000;background:#000;font-family:${FONT};font-size:12px;line-height:1.6;color:#bbbbbb">Dayworker, Inc.${f.address ? ` &middot; ${esc(f.address)}` : ""}<br>${f.es ? "¿No le interesa?" : "Not for you?"} <a href="${esc(f.unsubscribe)}" style="color:#fbed23;text-decoration:underline">${f.es ? "Cancelar suscripción" : "Unsubscribe"}</a></td></tr>
</table></td></tr></table>${o.pixel}</body></html>`;
}
