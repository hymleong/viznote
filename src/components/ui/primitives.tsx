import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-separator bg-surface p-5 shadow-card sm:p-6", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "warn" | "info" | "good" | "bad" }) {
  const tones = {
    neutral: "bg-fill text-label-2",
    warn: "bg-warn/14 text-warn",
    info: "bg-accent-fill/12 text-accent",
    good: "bg-good/14 text-good",
    bad: "bg-bad/12 text-bad",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

const field =
  "w-full rounded-xl border border-separator-strong bg-surface text-subhead text-label placeholder:text-label-3 transition-[border-color,box-shadow] duration-200 focus-visible:border-accent-fill focus-visible:ring-4 focus-visible:ring-accent-fill/15 disabled:opacity-50";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "h-11 px-3.5", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "min-h-32 resize-y p-3.5 leading-relaxed", className)} {...props} />;
}

/** Large-title page header with an optional eyebrow, description and trailing actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow && <p className="text-footnote font-semibold text-accent">{eyebrow}</p>}
        <h1 className="large-title text-label">{title}</h1>
        {description && <p className="max-w-2xl text-headline text-pretty text-label-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** iOS-style back link: chevron plus the parent's name, in the accent colour. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-1.5 inline-flex min-h-8 items-center gap-0.5 rounded-full pr-2 text-subhead text-accent hover:underline hover:underline-offset-4"
    >
      <ChevronLeft aria-hidden className="size-5" />
      {children}
    </Link>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-card border border-dashed border-separator-strong px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-fill text-label-2 [&_svg]:size-6">
          {icon}
        </div>
      )}
      <p className="text-headline font-semibold text-label">{title}</p>
      {description && <p className="mt-1 max-w-sm text-subhead text-label-2">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
