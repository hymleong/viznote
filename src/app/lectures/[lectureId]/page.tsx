import { notFound } from "next/navigation";
import { ChevronDown, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addPastedText } from "@/app/actions";
import { STORAGE_BUCKET } from "@/lib/env";
import { PdfUploader } from "@/components/upload/pdf-uploader";
import { LectureView } from "@/components/lecture/lecture-view";
import type { QuizItemView } from "@/components/study/quiz-panel";
import { Button } from "@/components/ui/button";
import { BackLink, Card, Input, Textarea } from "@/components/ui/primitives";
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
    <main className="rise mx-auto w-full max-w-[1440px] space-y-8 px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <div className="space-y-4">
        <BackLink href={`/modules/${lecture.module_id}`}>Module</BackLink>
        <h1 className="large-title text-label">{lecture.title}</h1>
      </div>

      <Card className="p-0 sm:p-0">
        <details open={files.length === 0} className="group">
          <summary className="flex list-none items-center gap-3 rounded-card px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-fill/10 text-accent">
              <FileText aria-hidden className="size-4" />
            </span>
            <span className="flex-1 text-headline font-semibold text-label">
              Materials{" "}
              <span className="font-normal text-label-2">
                · {files.length} file{files.length === 1 ? "" : "s"}
              </span>
            </span>
            <ChevronDown
              aria-hidden
              className="size-5 text-label-3 transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div className="grid gap-6 border-t border-separator p-5 sm:p-6 md:grid-cols-2">
            <div className="space-y-4">
              {files.length > 0 && (
                <ul className="divide-y divide-separator overflow-hidden rounded-2xl bg-surface-2" role="list">
                  {files.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 px-4 py-3 text-subhead">
                      <FileText aria-hidden className="size-4 shrink-0 text-label-2" />
                      <span className="min-w-0 flex-1 truncate text-label">{f.filename}</span>
                      <span className="shrink-0 text-footnote tabular-nums text-label-2">
                        {f.page_count} page{f.page_count === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <PdfUploader lectureId={lecture.id} />
            </div>
            <div className="rounded-2xl bg-surface-2 p-4 sm:p-5">
              <form action={addPastedText} className="space-y-3">
                <input type="hidden" name="lectureId" value={lecture.id} />
                <label htmlFor="paste-title" className="block text-subhead font-semibold text-label">
                  Or paste text / Markdown
                </label>
                <Input id="paste-title" name="title" placeholder="Lecture notes" required />
                <Textarea name="text" aria-label="Lecture text" placeholder="# Heading…" required />
                <Button type="submit" variant="secondary" size="sm">
                  Add text
                </Button>
              </form>
            </div>
          </div>
        </details>
      </Card>

      <LectureView
        lectureId={lecture.id}
        files={files}
        pages={pages}
        initialGeneration={generation}
        initialBlocks={(blockData ?? []) as BlockRow[]}
        quizItems={(quizData ?? []) as QuizItemView[]}
      />
    </main>
  );
}
