"use client";
import { useState } from "react";
import { Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/primitives";

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
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <Card className="rise w-full max-w-sm space-y-6 p-8 shadow-raised sm:p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <span aria-hidden className="app-icon flex size-14 items-center justify-center rounded-2xl shadow-card">
            <Sparkles className="size-7" />
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-label">Sign in to Viznotes</h1>
            <p className="text-subhead text-label-2">Visual lecture notes for revision.</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } })}
        >
          Continue with Google
        </Button>
        <div className="flex items-center gap-3 text-footnote text-label-2" aria-hidden>
          <span className="h-px flex-1 bg-separator" />
          or
          <span className="h-px flex-1 bg-separator" />
        </div>
        <form onSubmit={emailLink} className="space-y-3">
          <label htmlFor="email" className="block text-subhead font-medium text-label">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" size="lg" className="w-full">
            <Mail aria-hidden />
            Email me a sign-in link
          </Button>
        </form>
        {message && (
          <p role="status" className="rounded-2xl bg-surface-2 px-4 py-3 text-center text-subhead text-label-2">
            {message}
          </p>
        )}
      </Card>
    </main>
  );
}
