import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../config";

export type SenderRow = {
  id: number;
  name: string;
  email: string;
  mode: "dry_run" | "smtp";
  smtp_host: string | null;
  smtp_port: number;
  smtp_user: string | null;
  smtp_pass_env: string | null;
  imap_host: string | null;
  imap_port: number;
  daily_max: number;
  warmup_start: string | Date;
  status: string;
  signature: string | null;
};

const pool = new Map<number, Transporter>();

export function smtpPassword(sender: SenderRow) {
  const pass = sender.smtp_pass_env ? process.env[sender.smtp_pass_env] : undefined;
  if (!pass) throw new Error(`Env var ${sender.smtp_pass_env || "(not set)"} holds no password for ${sender.email}`);
  return pass;
}

function transporter(sender: SenderRow) {
  let t = pool.get(sender.id);
  if (!t) {
    t = nodemailer.createTransport({
      host: sender.smtp_host!,
      port: sender.smtp_port,
      secure: sender.smtp_port === 465,
      auth: { user: sender.smtp_user || sender.email, pass: smtpPassword(sender) },
    });
    pool.set(sender.id, t);
  }
  return t;
}

export type Outgoing = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  token: string;
  inReplyTo?: string | null;
};

/**
 * A mail client can't fetch images from this computer, so while SITE_URL is
 * localhost the site's own images travel inside the email instead. In
 * production they load from the site like any web image, which keeps the
 * email small.
 */
export function inlineLocalImages(html: string | undefined) {
  if (!html || !/^https?:\/\/(localhost|127\.0\.0\.1)\b/.test(config.siteUrl)) return { html, attachments: [] };
  const attachments: { filename: string; path: string; cid: string }[] = [];
  const out = html.replace(/src="([^"]+)"/g, (whole, src: string) => {
    if (!src.startsWith(`${config.siteUrl}/images/`)) return whole;
    const rel = src.slice(config.siteUrl.length + 1);
    const cid = `${path.basename(rel)}@dayworker`;
    if (!attachments.some((x) => x.cid === cid)) attachments.push({ filename: path.basename(rel), path: path.join(process.cwd(), "public", rel), cid });
    return `src="cid:${cid}"`;
  });
  return { html: out, attachments };
}

/**
 * Sends one message. In dry-run mode nothing leaves the building: the message
 * is rendered and recorded exactly as it would have gone, so a campaign can
 * be rehearsed end to end before a mailbox exists.
 */
export async function deliver(sender: SenderRow, msg: Outgoing): Promise<{ messageId: string }> {
  const domain = sender.email.split("@")[1];
  const messageId = `<${msg.token}.${Date.now().toString(36)}@${domain}>`;
  if (sender.mode !== "smtp") return { messageId };

  const { html, attachments } = inlineLocalImages(msg.html);
  await transporter(sender).sendMail({
    from: { name: sender.name, address: sender.email },
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html,
    attachments,
    messageId,
    inReplyTo: msg.inReplyTo ?? undefined,
    references: msg.inReplyTo ?? undefined,
    headers: {
      // Gmail/Yahoo bulk-sender rules: one-click unsubscribe (RFC 8058).
      "List-Unsubscribe": `<${config.siteUrl}/api/u/${msg.token}>, <mailto:${sender.email}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  return { messageId };
}
