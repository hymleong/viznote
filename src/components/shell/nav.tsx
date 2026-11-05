"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, LibraryBig, Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    href: "/",
    label: "Modules",
    icon: LibraryBig,
    match: (p: string) => p === "/" || p.startsWith("/modules") || p.startsWith("/lectures"),
  },
  { href: "/review", label: "Review", icon: Repeat2, match: (p: string) => p.startsWith("/review") },
  { href: "/admin/usage", label: "Usage", icon: ChartColumn, match: (p: string) => p.startsWith("/admin") },
];

/** Material 3 navigation rail (desktop). */
export function NavRail() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="sticky top-16 hidden h-[calc(100vh-4rem)] w-24 shrink-0 flex-col items-center gap-3 pt-3 md:flex">
      {ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="group flex w-full flex-col items-center gap-1 py-1 text-xs font-medium text-on-surface-variant focus-visible:outline-none"
          >
            <span
              className={cn(
                "flex h-8 w-14 items-center justify-center rounded-full transition-colors group-hover:bg-on-surface/8 group-focus-visible:ring-2 group-focus-visible:ring-primary",
                active && "bg-secondary-container text-on-secondary-container group-hover:bg-secondary-container",
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <span className={cn(active && "font-semibold text-on-surface")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Material 3 navigation bar (mobile). */
export function NavBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex h-20 items-center justify-around bg-surface-container pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center gap-1 text-xs font-medium text-on-surface-variant"
          >
            <span
              className={cn(
                "flex h-8 w-16 items-center justify-center rounded-full",
                active && "bg-secondary-container text-on-secondary-container",
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <span className={cn(active && "font-semibold text-on-surface")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
