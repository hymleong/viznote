"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function emailLink(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setMessage(error ? error.message : "Check your inbox for a sign-in link.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-container px-4 py-10 dark:bg-surface">
      <div className="grid w-full max-w-4xl gap-10 rounded-[28px] bg-surface-container-lowest p-8 sm:p-10 md:grid-cols-2 dark:bg-surface-container">
        <div className="space-y-6">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#4285f4] via-[#9b72cb] to-[#d96570] text-white">
            <Sparkles className="size-6" aria-hidden />
          </span>
          <div className="space-y-2">
            <h1 className="text-4xl font-normal tracking-tight text-on-surface">Sign in</h1>
            <p className="text-base text-on-surface-variant">to continue to Viznotes — visual lecture notes for revision.</p>
          </div>
        </div>

        <div className="space-y-5 md:pt-16">
          <Button
            variant="outline"
            size="lg"
            className="w-full text-on-surface"
            onClick={() => createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } })}
          >
            <svg viewBox="0 0 48 48" aria-hidden className="size-5">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
            <span className="h-px flex-1 bg-outline-variant" />
            or
            <span className="h-px flex-1 bg-outline-variant" />
          </div>

          <form onSubmit={emailLink} className="space-y-3">
            <label htmlFor="email" className="text-sm font-medium text-on-surface-variant">
              Email
            </label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" />
            <Button type="submit" size="lg" className="w-full">
              Email me a sign-in link
            </Button>
          </form>
          {message && (
            <p role="status" className="rounded-2xl bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
