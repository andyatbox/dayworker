import { unsubscribeByToken } from "@/lib/unsubscribe";

/**
 * RFC 8058 one-click unsubscribe — the target of the List-Unsubscribe header
 * that Gmail and Yahoo require of bulk senders. Their "Unsubscribe" button
 * POSTs here directly.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await unsubscribeByToken(token, "one-click");
  return new Response("Unsubscribed", { status: 200 });
}
