import { type NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { one } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { config } from "@/lib/config";
import { renderEmail, type Design, type Step } from "@/lib/mail/render";
import { inlineLocalImages } from "@/lib/mail/transport";

/**
 * The email as a .eml file, exactly as it would go out, for looking at in a
 * real mail app without setting up a mailbox. Rendered for the campaign's
 * first enrolled contact with their own send token, so the links in it are
 * live and credited to them. Nothing is sent and nothing is marked sent.
 *
 * ?send=<id> renders it for that one invite (Test invites), and ?from= names
 * who signs it when the campaign has no mailbox yet.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Route handlers don't get the /blast layout's sign-in check.
  if (!(await isAdmin())) return new NextResponse("Sign in at /blast first", { status: 401 });
  const id = Number((await params).id);
  const step = Math.max(0, Number(req.nextUrl.searchParams.get("step")) || 0);
  const sendId = Number(req.nextUrl.searchParams.get("send")) || null;
  const fromName = req.nextUrl.searchParams.get("from")?.trim().slice(0, 80) || "Your Name";
  const c = await one<{ name: string; steps: Step[]; design: Design; track_opens: boolean; sender_ids: number[] }>(
    `select name, steps, design, track_opens, sender_ids from campaigns where id = $1`,
    [id],
  );
  if (!c?.steps[step]) return new NextResponse("No such email", { status: 404 });

  const sender = (await one<{ name: string; email: string; signature: string | null }>(
    `select name, email, signature from senders where id = any($1::int[]) order by id limit 1`,
    [c.sender_ids],
  )) ?? { name: fromName, email: "you@example.com", signature: null };
  const r = await one<{ token: string; email: string; first_name: string | null; last_name: string | null; business_name: string | null; city: string | null; borough: string | null; trades: string[]; lang: string }>(
    `select s.token, ct.email, ct.first_name, ct.last_name, ct.business_name, ct.city, ct.borough, ct.trades, ct.lang
     from sends s join contacts ct on ct.id = s.contact_id
     where s.campaign_id = $1 and ($2::int is null or s.id = $2) order by s.id limit 1`,
    [id, sendId],
  );
  const contact = r ?? { token: "PREVIEW", email: "maria@example.com", first_name: "Maria", last_name: "Lopez", business_name: "Lopez Renovations Corp", city: "Brooklyn", borough: "Brooklyn", trades: [], lang: "en" };

  const mail = renderEmail({ steps: c.steps, step, contact, sender, token: contact.token, trackOpens: c.track_opens, design: c.design });
  const { html, attachments } = inlineLocalImages(mail.html);
  const built = await nodemailer.createTransport({ streamTransport: true, buffer: true }).sendMail({
    from: { name: sender.name, address: sender.email },
    to: contact.email,
    subject: mail.subject,
    text: mail.text,
    html,
    attachments,
    headers: { "List-Unsubscribe": `<${config.siteUrl}/api/u/${contact.token}>` },
  });

  const file = `${c.name.replace(/[^\w-]+/g, "-").toLowerCase()}-email-${step + 1}.eml`;
  return new NextResponse(new Uint8Array(built.message as Buffer), {
    headers: { "Content-Type": "message/rfc822", "Content-Disposition": `attachment; filename="${file}"`, "Cache-Control": "no-store" },
  });
}
