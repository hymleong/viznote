import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AppNav } from "@/components/shell/app-nav";

export const metadata: Metadata = {
  title: { default: "Viznotes", template: "%s · Viznotes" },
  description: "Visual, insightful study pages from your lecture materials",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-canvas font-sans text-label antialiased">
        <a href="#content" className="skip-link">
          Skip to content
        </a>
        <AppNav />
        <div id="content" tabIndex={-1} className="outline-none">
          {children}
        </div>
      </body>
    </html>
  );
}
