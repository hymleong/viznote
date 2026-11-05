"use client";
import { useState } from "react";
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
    <main className="mx-auto flex min-h-screen max-w-sm items-center px-4">
      <Card className="w-full space-y-4">
        <div>
          <h1 className="text-xl font-bold">Viznotes</h1>
          <p className="text-sm text-zinc-500">Visual lecture notes for revision.</p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } })}
        >
          Continue with Google
        </Button>
        <form onSubmit={emailLink} className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full">
            Email me a sign-in link
          </Button>
        </form>
        {message && (
          <p role="status" className="text-sm text-zinc-600 dark:text-zinc-300">
            {message}
          </p>
        )}
      </Card>
    </main>
  );
}
