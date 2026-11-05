import * as React from "react";
import { cn } from "@/lib/utils";

/** Material 3 card: soft surface container, large corner radius, no hard borders. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-surface-container-lowest p-6 shadow-[0_1px_2px_rgb(0_0_0/0.06)] ring-1 ring-outline-variant/50 dark:bg-surface-container dark:ring-0",
        className,
      )}
      {...props}
    />
  );
}

/** Chip-style badge. */
export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "warn" | "info" | "good" | "bad" }) {
  const tones = {
    neutral: "bg-surface-container-high text-on-surface-variant",
    warn: "bg-[#ffefc9] text-[#5c3f00] dark:bg-[#5c3f00] dark:text-[#ffdf99]",
    info: "bg-primary-container text-on-primary-container",
    good: "bg-[#c4eed0] text-[#0d3b1e] dark:bg-[#0f5223] dark:text-[#c4eed0]",
    bad: "bg-[#ffdad6] text-[#410002] dark:bg-[#8c1d18] dark:text-[#ffdad6]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-lg px-2.5 text-xs font-medium tracking-[0.01em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

const field =
  "w-full rounded-xl border border-outline-variant bg-transparent px-4 text-sm text-on-surface placeholder:text-on-surface-variant/70 transition-colors hover:border-outline focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "min-h-32 py-3", className)} {...props} />;
}

/** Page heading block used across screens (Google-style large, regular-weight headline). */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="text-sm font-medium text-primary">{eyebrow}</p>}
        <h1 className="text-[32px] leading-10 font-normal tracking-tight text-on-surface">{title}</h1>
        {description && <p className="text-base text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
