import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Library, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createModule } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Input, PageHeader } from "@/components/ui/primitives";
import type { ModuleRow } from "@/lib/types";

export const metadata: Metadata = { title: "Library" };

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.from("modules").select("id, code, title, created_at").order("code");
  const modules = (data ?? []) as ModuleRow[];

  return (
    <main className="rise mx-auto w-full max-w-6xl space-y-8 px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <PageHeader
        eyebrow="Library"
        title="Your modules"
        description="Every course you study, each with its lectures and visual study pages."
      />

      <Card>
        <form action={createModule} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="code">
            Module code
          </label>
          <Input id="code" name="code" placeholder="SC4024" required className="sm:w-36" />
          <label className="sr-only" htmlFor="title">
            Module title
          </label>
          <Input id="title" name="title" placeholder="Data Visualisation" required />
          <Button type="submit" size="lg" className="shrink-0">
            <Plus aria-hidden />
            Add module
          </Button>
        </form>
      </Card>

      {modules.length === 0 ? (
        <EmptyState
          icon={<Library aria-hidden />}
          title="No modules yet"
          description="Add your first module above, then create lectures inside it."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {modules.map((m) => (
            <li key={m.id}>
              <Link
                href={`/modules/${m.id}`}
                className="group flex h-full items-center gap-4 rounded-card border border-separator bg-surface p-5 shadow-card transition-[box-shadow,translate] duration-300 ease-out hover:shadow-raised motion-safe:hover:-translate-y-0.5"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <span className="inline-flex rounded-full bg-accent-fill/10 px-2.5 py-0.5 text-footnote font-semibold text-accent">
                    {m.code}
                  </span>
                  <p className="text-headline font-semibold tracking-tight text-label">{m.title}</p>
                </div>
                <ChevronRight
                  aria-hidden
                  className="size-5 shrink-0 text-label-3 transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
