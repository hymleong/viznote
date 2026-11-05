import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createLecture, deleteModule } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input } from "@/components/ui/primitives";
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
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <nav className="text-sm">
        <Link href="/" className="text-indigo-600 hover:underline">
          ← Modules
        </Link>
      </nav>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-indigo-600">{m.code}</p>
          <h1 className="text-2xl font-bold">{m.title}</h1>
        </div>
        <form action={deleteModule.bind(null, m.id)}>
          <Button variant="ghost" size="sm">
            Delete module
          </Button>
        </form>
      </header>

      <Card>
        <form action={createLecture} className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="moduleId" value={m.id} />
          <label htmlFor="title" className="sr-only">
            Lecture title
          </label>
          <Input id="title" name="title" placeholder="Lecture 3: Perception and colour" required />
          <Button type="submit">Add lecture</Button>
        </form>
      </Card>

      <ol className="space-y-2">
        {lectures.map((l, i) => (
          <li key={l.id}>
            <Link
              href={`/lectures/${l.id}`}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 hover:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="text-sm text-zinc-400">{i + 1}</span>
              <span className="flex-1 font-medium">{l.title}</span>
              <Badge tone={l.status === "ready" ? "good" : l.status === "failed" ? "bad" : "neutral"}>{l.status}</Badge>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
