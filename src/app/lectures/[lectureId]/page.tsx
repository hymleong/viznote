import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addPastedText } from "@/app/actions";
import { STORAGE_BUCKET } from "@/lib/env";
import { PdfUploader } from "@/components/upload/pdf-uploader";
import { LectureView } from "@/components/lecture/lecture-view";
import { Button } from "@/components/ui/button";
import { Card, Input, Textarea } from "@/components/ui/primitives";
import type { BlockRow, GenerationRow, LectureRow, PageView, SourceFileRow } from "@/lib/types";

export default async function LecturePage({ params }: { params: Promise<{ lectureId: string }> }) {
  const { lectureId } = await params;
  const supabase = await createClient();
  const { data: lec } = await supabase
    .from("lectures")
    .select("id, module_id, title, status, current_generation_id, created_at")
    .eq("id", lectureId)
    .maybeSingle();
  if (!lec) notFound();
  const lecture = lec as LectureRow;

  const { data: fileData } = await supabase
    .from("source_files")
    .select("id, kind, filename, page_count")
    .eq("lecture_id", lectureId)
    .order("created_at");
  const files = (fileData ?? []) as SourceFileRow[];

  const { data: pageData } = files.length
    ? await supabase
        .from("pages")
        .select("source_file_id, page_number, text, thumbnail_path")
        .in("source_file_id", files.map((f) => f.id))
        .order("page_number")
    : { data: [] };
  const rawPages = (pageData ?? []) as { source_file_id: string; page_number: number; text: string; thumbnail_path: string | null }[];
  const thumbPaths = rawPages.map((p) => p.thumbnail_path).filter((p): p is string => !!p);
  const { data: signed } = thumbPaths.length
    ? await supabase.storage.from(STORAGE_BUCKET).createSignedUrls(thumbPaths, 60 * 60)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const pages: PageView[] = rawPages.map((p) => ({
    fileId: p.source_file_id,
    page: p.page_number,
    text: p.text,
    thumbnailUrl: p.thumbnail_path ? urlByPath.get(p.thumbnail_path) ?? null : null,
  }));

  // Latest generation (a running one takes precedence so progress streams in).
  const { data: genData } = await supabase
    .from("generations")
    .select("id, version, status, progress, error")
    .eq("lecture_id", lectureId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const generation = (genData ?? null) as GenerationRow | null;
  const { data: blockData } = generation
    ? await supabase
        .from("blocks")
        .select("id, generation_id, section_key, section_title, section_order, position, type, data, sources, beyond_source, review_status")
        .eq("generation_id", generation.id)
        .eq("is_current", true)
        .is("deleted_at", null)
        .order("section_order")
        .order("position")
    : { data: [] };

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6">
      <nav className="text-sm">
        <Link href={`/modules/${lecture.module_id}`} className="text-indigo-600 hover:underline">
          ← Module
        </Link>
      </nav>
      <h1 className="text-2xl font-bold">{lecture.title}</h1>

      <details open={files.length === 0} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <summary className="cursor-pointer font-medium">
          Materials ({files.length} file{files.length === 1 ? "" : "s"})
        </summary>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <ul className="text-sm">
              {files.map((f) => (
                <li key={f.id}>
                  {f.filename} <span className="text-zinc-500">({f.page_count} pages)</span>
                </li>
              ))}
            </ul>
            <PdfUploader lectureId={lecture.id} />
          </div>
          <Card className="p-4">
            <form action={addPastedText} className="space-y-2">
              <input type="hidden" name="lectureId" value={lecture.id} />
              <label htmlFor="paste-title" className="text-sm font-medium">
                Or paste text / Markdown
              </label>
              <Input id="paste-title" name="title" placeholder="Lecture notes" required />
              <Textarea name="text" aria-label="Lecture text" placeholder="# Heading…" required />
              <Button type="submit" variant="outline" size="sm">
                Add text
              </Button>
            </form>
          </Card>
        </div>
      </details>

      <LectureView
        lectureId={lecture.id}
        files={files}
        pages={pages}
        initialGeneration={generation}
        initialBlocks={(blockData ?? []) as BlockRow[]}
      />
    </main>
  );
}
