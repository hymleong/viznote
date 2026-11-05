import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronRight, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createLecture, deleteModule } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { BackLink, Badge, Card, EmptyState, Input, PageHeader } from "@/components/ui/primitives";
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
    <main className="rise mx-auto w-full max-w-6xl space-y-8 px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <div className="space-y-4">
        <BackLink href="/">Library</BackLink>
        <PageHeader
          eyebrow={m.code}
          title={m.title}
          description={`${lectures.length} lecture${lectures.length === 1 ? "" : "s"}`}
          actions={
            <form action={deleteModule.bind(null, m.id)}>
              <Button variant="destructive" size="sm">
                <X aria-hidden />
                Delete module
              </Button>
            </form>
          }
        />
      </div>

      <Card>
        <form action={createLecture} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="hidden" name="moduleId" value={m.id} />
          <label htmlFor="title" className="sr-only">
            Lecture title
          </label>
          <Input id="title" name="title" placeholder="Lecture 3: Perception and colour" required />
          <Button type="submit" size="lg" className="shrink-0">
            <Plus aria-hidden />
            Add lecture
          </Button>
        </form>
      </Card>

      {lectures.length === 0 ? (
        <EmptyState
          icon={<BookOpen aria-hidden />}
          title="No lectures yet"
          description="Add a lecture, then upload its slides to generate a visual study page."
        />
      ) : (
        <Card className="overflow-hidden p-0 sm:p-0">
          <ol className="divide-y divide-separator" role="list">
            {lectures.map((l, i) => (
              <li key={l.id}>
                <Link
                  href={`/lectures/${l.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-fill/60"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-fill text-footnote font-semibold tabular-nums text-label-2">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-headline font-medium text-label">{l.title}</span>
                  <Badge tone={l.status === "ready" ? "good" : l.status === "failed" ? "bad" : "neutral"}>{l.status}</Badge>
                  <ChevronRight
                    aria-hidden
                    className="size-5 shrink-0 text-label-3 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </main>
  );
}
