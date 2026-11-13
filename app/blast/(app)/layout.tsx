/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin, endSession } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blast — Dayworker email campaigns", robots: { index: false, follow: false } };

const NAV = [
  ["/blast", "Dashboard"],
  ["/blast/campaigns", "Campaigns"],
  ["/blast/contacts", "Contacts"],
  ["/blast/lists", "Lists"],
  ["/blast/registrations", "Sign-ups"],
  ["/blast/test", "Test invites"],
  ["/blast/senders", "Mailboxes"],
  ["/blast/data", "Data & setup"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  async function logout() {
    "use server";
    await endSession();
    redirect("/blast/login");
  }

  return (
    <div className="brand min-h-[100svh] bg-[#f6f5ef]">
      <header className="sticky top-0 z-40 border-b-[3px] border-black bg-white">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-8">
          <Link href="/blast" className="flex items-center gap-3">
            <img src="/logos/DW-Logo.svg" alt="" className="h-8 w-8" />
            <span className="text-xs font-extrabold uppercase tracking-[0.2em]">Blast <span className="font-normal normal-case tracking-normal text-black/60">· email campaigns</span></span>
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {NAV.map(([href, text]) => (
              <Link key={href} href={href} className="px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] hover:bg-yellow">
                {text}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" className="text-[11px] font-extrabold uppercase tracking-[0.12em] underline">dayworker.co ↗</a>
            <form action={logout}>
              <button className="text-[11px] font-extrabold uppercase tracking-[0.12em] underline">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
