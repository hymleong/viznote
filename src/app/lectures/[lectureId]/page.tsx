import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addPastedText } from "@/app/actions";
import { STORAGE_BUCKET } from "@/lib/env";
import { PdfUploader } from "@/components/upload/pdf-uploader";
import { LectureView } from "@/components/lecture/lecture-view";
import type { QuizItemView } from "@/components/study/quiz-panel";
import { Button } from "@/components/ui/button";
import { Card, Input, PageHeader, Textarea } from "@/components/ui/primitives";
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

  const { data: quizData } = await supabase
    .from("quiz_items")
    .select("id, question, options, sources")
    .eq("lecture_id", lectureId)
    .order("created_at");

  return (
    <AppShell wide>
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href={`/modules/${lecture.module_id}`}>
          <ArrowLeft aria-hidden />
          Module
        </Link>
      </Button>
      <PageHeader title={lecture.title} />

      <details open={files.length === 0} className="group rounded-3xl bg-surface-container-low p-2">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-on-surface hover:bg-on-surface/5 [&::-webkit-details-marker]:hidden">
          <FileText className="size-5 text-on-surface-variant" aria-hidden />
          Materials
          <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-xs font-medium text-on-secondary-container">
            {files.length} file{files.length === 1 ? "" : "s"}
          </span>
          <span className="ml-auto text-sm font-normal text-on-surface-variant group-open:hidden">Show</span>
          <span className="ml-auto hidden text-sm font-normal text-on-surface-variant group-open:inline">Hide</span>
        </summary>
        <div className="grid gap-4 p-3 md:grid-cols-2">
          <div className="space-y-4 rounded-3xl bg-surface-container-lowest p-5 dark:bg-surface-container">
            {files.length > 0 && (
              <ul className="space-y-1 text-sm">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-xl px-1 py-1">
                    <FileText className="size-4 shrink-0 text-primary" aria-hidden />
                    <span className="truncate">{f.filename}</span>
                    <span className="ml-auto shrink-0 text-on-surface-variant">{f.page_count} pages</span>
                  </li>
                ))}
              </ul>
            )}
            <PdfUploader lectureId={lecture.id} />
          </div>
          <Card className="p-5 ring-0 shadow-none">
            <form action={addPastedText} className="space-y-2">
              <input type="hidden" name="lectureId" value={lecture.id} />
              <label htmlFor="paste-title" className="text-sm font-medium text-on-surface-variant">
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
        quizItems={(quizData ?? []) as QuizItemView[]}
      />
    </AppShell>
  );
}
