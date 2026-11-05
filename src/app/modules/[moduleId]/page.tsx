import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createLecture, deleteModule } from "@/app/actions";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, PageHeader } from "@/components/ui/primitives";
import type { LectureRow, ModuleRow } from "@/lib/types";

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const supabase = await createClient();
  const { data: mod } = await supabase.from("modules").select("id, code, title, created_at").eq("id", moduleId).maybeSingle();
  if (!mod) notFound();
  const m = mod as ModuleRow;
  const { data } = await supabase
    .from("lectures")
    .select("id, module_id, title, status, current_generation_id, created_at")
    .eq("module_id", moduleId)
    .order("created_at");
  const lectures = (data ?? []) as LectureRow[];

  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/">
          <ArrowLeft aria-hidden />
          Modules
        </Link>
      </Button>

      <PageHeader
        eyebrow={m.code}
        title={m.title}
        description={`${lectures.length} lecture${lectures.length === 1 ? "" : "s"}`}
        actions={
          <form action={deleteModule.bind(null, m.id)}>
            <Button variant="ghost" size="sm" className="text-error hover:bg-error/8">
              <Trash2 aria-hidden />
              Delete module
            </Button>
          </form>
        }
      />

      <Card className="bg-surface-container-low p-4 ring-0 shadow-none sm:p-5 dark:bg-surface-container-low">
        <form action={createLecture} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="hidden" name="moduleId" value={m.id} />
          <label htmlFor="title" className="sr-only">
            Lecture title
          </label>
          <Input id="title" name="title" placeholder="Lecture 3: Perception and colour" required className="bg-surface-container-lowest dark:bg-surface-container" />
          <Button type="submit" size="lg" className="shrink-0">
            <Plus aria-hidden />
            Add lecture
          </Button>
        </form>
      </Card>

      {lectures.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-outline-variant px-6 py-16 text-center">
          <p className="text-lg text-on-surface">No lectures yet</p>
          <p className="mt-1 text-sm text-on-surface-variant">Add a lecture, then upload its slides.</p>
        </div>
      ) : (
        <ol className="overflow-hidden rounded-3xl bg-surface-container-low">
          {lectures.map((l, i) => (
            <li key={l.id} className="border-b border-outline-variant/40 last:border-b-0">
              <Link
                href={`/lectures/${l.id}`}
                className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-on-surface/5 focus-visible:bg-on-surface/8 focus-visible:outline-none sm:px-6"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-container text-sm font-medium text-on-primary-container">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-base text-on-surface">{l.title}</span>
                <Badge tone={l.status === "ready" ? "good" : l.status === "failed" ? "bad" : l.status === "processing" ? "info" : "neutral"} className="capitalize">
                  {l.status}
                </Badge>
                <ChevronRight className="size-5 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </AppShell>
  );
}
