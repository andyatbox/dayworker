/* eslint-disable @next/next/no-img-element */
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";
import { startSession } from "@/lib/admin";
import { btnDark, input, label } from "@/components/blast/ui";

export const metadata = { title: "Sign in — Blast", robots: { index: false, follow: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const given = Buffer.from(String(formData.get("password") ?? ""));
    const want = Buffer.from(config.adminPassword);
    if (!config.adminPassword || given.length !== want.length || !timingSafeEqual(given, want)) redirect("/blast/login?e=1");
    await startSession();
    redirect("/blast");
  }

  return (
    <main className="brand flex min-h-[100svh] items-center justify-center bg-yellow p-5">
      <form action={login} className="w-full max-w-[380px] border-[3px] border-black bg-white p-8">
        <img src="/logos/DW-Black-Logotype.svg" alt="Dayworker" className="h-7 w-auto" />
        <h1 className="display mt-6 text-3xl">Blast</h1>
        <p className="mt-1 text-sm text-black/60">Email campaigns</p>
        <label className={`${label} mt-6`} htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoFocus className={input} />
        {e && <p className="mt-3 text-sm font-semibold text-[#c00]">Wrong password.</p>}
        <button className={`${btnDark} mt-5 w-full py-3`}>Sign in</button>
      </form>
    </main>
  );
}
