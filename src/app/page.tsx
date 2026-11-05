import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createModule } from "./actions";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, Input, PageHeader } from "@/components/ui/primitives";
import type { ModuleRow } from "@/lib/types";

const TINTS = [
  "bg-[#d3e3fd] text-[#041e49] dark:bg-[#0842a0] dark:text-[#d3e3fd]",
  "bg-[#c4eed0] text-[#0d3b1e] dark:bg-[#0f5223] dark:text-[#c4eed0]",
  "bg-[#ffefc9] text-[#5c3f00] dark:bg-[#5c3f00] dark:text-[#ffdf99]",
  "bg-[#ffdad6] text-[#410002] dark:bg-[#8c1d18] dark:text-[#ffdad6]",
  "bg-[#eaddff] text-[#21005d] dark:bg-[#4f378b] dark:text-[#eaddff]",
];

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.from("modules").select("id, code, title, created_at").order("code");
  const modules = (data ?? []) as ModuleRow[];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Your library"
        title="Modules"
        description="Turn lecture slides into visual study pages, flashcards and quizzes."
      />

      <Card className="bg-surface-container-low p-4 ring-0 shadow-none sm:p-5 dark:bg-surface-container-low">
        <form action={createModule} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="code">
            Module code
          </label>
          <Input id="code" name="code" placeholder="Code, e.g. SC4024" required className="bg-surface-container-lowest sm:w-48 dark:bg-surface-container" />
          <label className="sr-only" htmlFor="title">
            Module title
          </label>
          <Input id="title" name="title" placeholder="Title, e.g. Data Visualisation" required className="bg-surface-container-lowest dark:bg-surface-container" />
          <Button type="submit" size="lg" className="shrink-0">
            <Plus aria-hidden />
            Add module
          </Button>
        </form>
      </Card>

      {modules.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-outline-variant px-6 py-16 text-center">
          <p className="text-lg text-on-surface">No modules yet</p>
          <p className="mt-1 text-sm text-on-surface-variant">Add your first module above to get started.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <li key={m.id}>
              <Link
                href={`/modules/${m.id}`}
                className="group flex h-full flex-col gap-6 rounded-3xl bg-surface-container-low p-5 transition-[background-color,box-shadow] hover:bg-surface-container hover:shadow-elevation-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className={`grid size-12 place-items-center rounded-2xl text-sm font-semibold ${TINTS[i % TINTS.length]}`} aria-hidden>
                  {m.code.slice(0, 2).toUpperCase()}
                </span>
                <span className="flex items-end gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium tracking-wide text-on-surface-variant uppercase">{m.code}</span>
                    <span className="mt-0.5 block text-lg leading-snug text-on-surface">{m.title}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
