import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createModule, signOut } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/primitives";
import type { ModuleRow } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.from("modules").select("id, code, title, created_at").order("code");
  const modules = (data ?? []) as ModuleRow[];

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your modules</h1>
        <form action={signOut}>
          <Button variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      <Card>
        <form action={createModule} className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="code">
            Module code
          </label>
          <Input id="code" name="code" placeholder="SC4024" required className="sm:w-32" />
          <label className="sr-only" htmlFor="title">
            Module title
          </label>
          <Input id="title" name="title" placeholder="Data Visualisation" required />
          <Button type="submit">Add module</Button>
        </form>
      </Card>

      <ul className="grid gap-3 sm:grid-cols-2">
        {modules.map((m) => (
          <li key={m.id}>
            <Link
              href={`/modules/${m.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-4 hover:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-xs font-semibold text-indigo-600">{m.code}</p>
              <p className="font-medium">{m.title}</p>
            </Link>
          </li>
        ))}
        {modules.length === 0 && <p className="text-sm text-zinc-500">No modules yet. Add one above.</p>}
      </ul>
    </main>
  );
}
