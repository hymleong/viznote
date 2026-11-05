"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";
import { signOut } from "@/app/actions";
import { cn } from "@/lib/utils";

const LINKS = [
  {
    href: "/",
    label: "Library",
    match: (p: string) => p === "/" || p.startsWith("/modules") || p.startsWith("/lectures"),
  },
  { href: "/review", label: "Review", match: (p: string) => p.startsWith("/review") },
  { href: "/admin/usage", label: "Usage", match: (p: string) => p.startsWith("/admin") },
];

/** Frosted, sticky global navigation bar. Hidden on the sign-in screens. */
export function AppNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) return null;

  return (
    <header className="glass sticky top-0 z-40 border-b border-separator">
      <nav aria-label="Primary" className="mx-auto flex h-13 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="mr-2 flex items-center gap-2 rounded-lg text-headline font-semibold tracking-tight text-label"
        >
          <span aria-hidden className="app-icon flex size-7 items-center justify-center rounded-lg shadow-sm">
            <Sparkles className="size-4" />
          </span>
          <span className="max-[380px]:sr-only">Viznotes</span>
        </Link>
        <ul className="flex items-center gap-0.5" role="list">
          {LINKS.map((l) => {
            const active = l.match(pathname);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={pathname === l.href ? "page" : active ? "true" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full px-3 text-footnote font-medium transition-colors duration-200",
                    active ? "bg-fill text-label" : "text-label-2 hover:text-label",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <form action={signOut} className="ml-auto">
          <button
            type="submit"
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-footnote font-medium text-label-2 transition-colors duration-200 hover:bg-fill hover:text-label"
          >
            <LogOut aria-hidden className="size-4" />
            <span className="max-sm:sr-only">Sign out</span>
          </button>
        </form>
      </nav>
    </header>
  );
}
