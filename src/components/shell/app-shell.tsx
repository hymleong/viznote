import Link from "next/link";
import { LogOut, Sparkles } from "lucide-react";
import { signOut } from "@/app/actions";
import { NavBar, NavRail } from "./nav";
import { cn } from "@/lib/utils";

/** Google-style app shell: top app bar, navigation rail (desktop) and navigation bar (mobile). */
export function AppShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 bg-surface/85 px-3 backdrop-blur-md md:px-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#4285f4] via-[#9b72cb] to-[#d96570] text-white">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <span className="text-[22px] font-normal tracking-tight text-on-surface">Viznotes</span>
        </Link>
        <form action={signOut} className="ml-auto">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-on-surface-variant transition-colors hover:bg-on-surface/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <LogOut className="size-[18px]" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
            <span className="sr-only sm:hidden">Sign out</span>
          </button>
        </form>
      </header>
      <div className="flex">
        <NavRail />
        <main className={cn("mx-auto w-full min-w-0 space-y-8 px-4 pt-4 pb-28 md:pr-8 md:pb-12 md:pl-0", wide ? "max-w-[1600px]" : "max-w-5xl")}>
          {children}
        </main>
      </div>
      <NavBar />
    </div>
  );
}
