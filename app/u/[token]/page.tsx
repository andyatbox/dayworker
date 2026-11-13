/* eslint-disable @next/next/no-img-element */
import { redirect } from "next/navigation";
import { one } from "@/lib/db";
import { unsubscribeByToken } from "@/lib/unsubscribe";

export const metadata = { title: "Unsubscribe — Dayworker", robots: { index: false, follow: false } };

/**
 * Unsubscribe page linked from every email footer. A button, not an
 * automatic action on page load: corporate link scanners open every URL in
 * an email, and would otherwise unsubscribe people who never asked.
 */
export default async function Unsubscribe({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;
  const s = await one<{ email: string }>(
    `select c.email from sends s join contacts c on c.id = s.contact_id where s.token = $1`,
    [token],
  );

  async function act(formData: FormData) {
    "use server";
    const reason = formData.get("reason") === "not-a-fit" ? "not-a-fit" : "unsubscribe";
    await unsubscribeByToken(token, reason);
    redirect(`/u/${token}?done=1`);
  }

  const masked = s?.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + "•".repeat(Math.min(b.length, 6)) + c);

  return (
    <main className="brand flex min-h-[100svh] items-center justify-center bg-yellow p-5">
      <div className="w-full max-w-[520px] border-[3px] border-black bg-white p-8 md:p-12">
        <img src="/logos/DW-Black-Logotype.svg" alt="Dayworker" className="h-7 w-auto" />
        {done ? (
          <>
            <h1 className="display mt-8 text-4xl">You&rsquo;re unsubscribed.</h1>
            <p className="mt-4 leading-relaxed">We won&rsquo;t email {masked ?? "you"} again. Sorry for the bother. Dejamos de escribirle.</p>
          </>
        ) : !s ? (
          <>
            <h1 className="display mt-8 text-4xl">Link expired</h1>
            <p className="mt-4 leading-relaxed">
              Reply &ldquo;unsubscribe&rdquo; to the email, or write to{" "}
              <a className="underline" href="mailto:info@dayworker.co">info@dayworker.co</a>, and we&rsquo;ll remove you.
            </p>
          </>
        ) : (
          <>
            <h1 className="display mt-8 text-4xl">Stop these emails?</h1>
            <p className="mt-4 leading-relaxed">
              We&rsquo;ll stop emailing <strong>{masked}</strong> right away. ¿Ya no quiere recibir estos correos?
            </p>
            <form action={act} className="mt-8 flex flex-col gap-3">
              <button name="reason" value="unsubscribe" className="border-[3px] border-black bg-black px-6 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-yellow hover:bg-yellow hover:text-black">
                Unsubscribe / Cancelar
              </button>
              <button name="reason" value="not-a-fit" className="border-[3px] border-black bg-white px-6 py-4 text-sm font-extrabold uppercase tracking-[0.14em] hover:bg-yellow">
                Not a fit for my business
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
