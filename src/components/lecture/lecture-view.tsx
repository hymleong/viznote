"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { ChevronLeft, ChevronRight, CircleCheck, CircleX, Layers, Loader, Network, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { startGeneration } from "@/app/actions";
import { BlockView } from "@/components/blocks/block-view";
import { ReviewControls } from "@/components/blocks/review-controls";
import { QuizPanel, type QuizItemView } from "@/components/study/quiz-panel";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import type { SourceRef } from "@/lib/blocks/schema";
import type { BlockRow, GenerationRow, PageView, SourceFileRow } from "@/lib/types";

const VISUAL = new Set(["concept_map", "diagram", "chart", "comparison", "process"]);
const OVERVIEW = new Set(["tldr", "insight", "misconception", "exam_focus"]);
const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  ingesting: "Reading and chunking your material",
  outlining: "Outlining the lecture",
  sections: "Building section visuals",
  synthesizing: "Writing the summary, insights and exam focus",
  complete: "Complete",
  failed: "Failed",
};
const TABS = [
  ["overview", "Overview"],
  ["visual", "Visual Map"],
  ["deep", "Deep Dive"],
  ["flashcards", "Flashcards"],
  ["quiz", "Quiz"],
  ["ask", "Ask"],
] as const;

export function LectureView({
  lectureId,
  files,
  pages,
  initialGeneration,
  initialBlocks,
  quizItems,
}: {
  lectureId: string;
  files: SourceFileRow[];
  pages: PageView[];
  initialGeneration: GenerationRow | null;
  initialBlocks: BlockRow[];
  quizItems: QuizItemView[];
}) {
  const [generation, setGeneration] = useState(initialGeneration);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [selected, setSelected] = useState<SourceRef | null>(
    pages[0] ? { fileId: pages[0].fileId, page: pages[0].page } : null,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const genId = generation?.id;

  // Stream progress: blocks appear as each pass finishes.
  useEffect(() => {
    if (!genId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`gen-${genId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blocks", filter: `generation_id=eq.${genId}` },
        (payload) => {
          const row = payload.new as BlockRow & { is_current: boolean; deleted_at: string | null };
          if (!row.is_current || row.deleted_at) return;
          setBlocks((prev) => (prev.some((b) => b.id === row.id) ? prev : [...prev, row]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "blocks", filter: `generation_id=eq.${genId}` },
        (payload) => {
          const row = payload.new as BlockRow & { is_current: boolean; deleted_at: string | null };
          setBlocks((prev) =>
            !row.is_current || row.deleted_at
              ? prev.filter((b) => b.id !== row.id)
              : prev.map((b) => (b.id === row.id ? row : b)),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "generations", filter: `id=eq.${genId}` },
        (payload) => setGeneration((g) => (g ? { ...g, ...(payload.new as GenerationRow) } : g)),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [genId]);

  const fileLabel = useMemo(() => {
    const index = new Map(files.map((f, i) => [f.id, files.length > 1 ? `F${i + 1}` : ""]));
    return (id: string) => index.get(id) ?? "";
  }, [files]);

  const sorted = useMemo(
    () => [...blocks].sort((a, b) => a.section_order - b.section_order || a.position - b.position),
    [blocks],
  );
  const sections = useMemo(() => {
    const map = new Map<string, { key: string; title: string; blocks: BlockRow[] }>();
    for (const b of sorted) {
      if (!map.has(b.section_key)) map.set(b.section_key, { key: b.section_key, title: b.section_title, blocks: [] });
      map.get(b.section_key)!.blocks.push(b);
    }
    return [...map.values()];
  }, [sorted]);

  const running = generation && !["complete", "failed"].includes(generation.status);
  const total = generation?.progress?.sections_total;
  const doneSections = sections.filter((s) => s.key !== "overview").length;
  const visualBlocks = sorted.filter((b) => VISUAL.has(b.type));

  function generate() {
    setError(null);
    startTransition(async () => {
      try {
        const id = await startGeneration(lectureId);
        setBlocks([]);
        setGeneration({ id, version: (generation?.version ?? 0) + 1, status: "queued", progress: {}, error: null });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  const render = (b: BlockRow) => (
    <BlockView
      key={b.id}
      block={b.data}
      onCite={setSelected}
      fileLabel={fileLabel}
      footer={<ReviewControls row={b} />}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={generate} disabled={pending || !!running || files.length === 0}>
          <Sparkles aria-hidden />
          {generation ? "Regenerate (new version)" : "Generate study page"}
        </Button>
        {generation && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-fill px-3 py-1 text-footnote text-label-2"
            role="status"
            aria-live="polite"
          >
            {running ? (
              <Loader aria-hidden className="size-3.5 motion-safe:animate-spin" />
            ) : generation.status === "complete" ? (
              <CircleCheck aria-hidden className="size-3.5 text-good" />
            ) : generation.status === "failed" ? (
              <CircleX aria-hidden className="size-3.5 text-bad" />
            ) : null}
            <span>
              v{generation.version} · {STATUS_LABEL[generation.status] ?? generation.status}
              {generation.status === "sections" && total ? ` (${doneSections}/${total})` : ""}
              {generation.error ? ` — ${generation.error}` : ""}
            </span>
          </span>
        )}
        {error && (
          <span role="alert" className="text-footnote text-bad">
            {error}
          </span>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)_360px]">
        <nav aria-label="Outline" className="hidden lg:block">
          <div className="sticky top-20 space-y-2">
            {sections.length > 0 && <p className="px-3 text-footnote font-semibold text-label-2">On this page</p>}
            <ol className="space-y-0.5">
              {sections.map((s) => (
                <li key={s.key}>
                  <a
                    href={`#sec-${s.key}`}
                    className="block rounded-lg px-3 py-1.5 text-subhead text-label-2 transition-colors duration-200 hover:bg-fill hover:text-label"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <Tabs.Root defaultValue="overview" className="min-w-0">
          <Tabs.List
            aria-label="Study views"
            className="scroll-thin mb-6 inline-flex max-w-full overflow-x-auto rounded-full bg-fill p-1"
          >
            {TABS.map(([v, label]) => (
              <Tabs.Trigger
                key={v}
                value={v}
                className="h-8 shrink-0 rounded-full px-4 text-footnote font-medium text-label-2 transition-colors duration-200 hover:text-label data-[state=active]:bg-thumb data-[state=active]:text-label data-[state=active]:shadow-sm"
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="overview" className="space-y-5">
            {sorted.filter((b) => OVERVIEW.has(b.type)).map(render)}
            {running && <Card aria-hidden className="skeleton h-28" />}
            {!generation && (
              <EmptyState
                icon={<Sparkles aria-hidden />}
                title="No study page yet"
                description="Upload material, then generate the study page."
              />
            )}
          </Tabs.Content>
          <Tabs.Content value="visual" className="space-y-5">
            {visualBlocks.map(render)}
            {visualBlocks.length === 0 && !running && (
              <EmptyState
                icon={<Network aria-hidden />}
                title="No visuals yet"
                description="Concept maps, diagrams and charts appear here once the study page is generated."
              />
            )}
          </Tabs.Content>
          <Tabs.Content value="deep" className="space-y-10">
            {sections.map((s) => (
              <section key={s.key} id={`sec-${s.key}`} aria-labelledby={`h-${s.key}`} className="scroll-mt-20 space-y-4">
                <h2 id={`h-${s.key}`} className="text-xl font-semibold tracking-tight text-label">
                  {s.title}
                </h2>
                {s.blocks.map(render)}
              </section>
            ))}
          </Tabs.Content>
          <Tabs.Content value="flashcards">
            <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div
                aria-hidden
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-fill/10 text-accent"
              >
                <Layers className="size-6" />
              </div>
              <p className="flex-1 text-subhead text-label-2">
                Flashcards are built from this lecture&apos;s concepts, formulas and misconceptions when a
                generation finishes. They are scheduled with FSRS in one queue across all your modules.
              </p>
              <Button asChild size="sm">
                <a href="/review">Open daily review</a>
              </Button>
            </Card>
          </Tabs.Content>
          <Tabs.Content value="quiz">
            <QuizPanel items={quizItems} onCite={setSelected} />
          </Tabs.Content>
          <Tabs.Content value="ask">
            <EmptyState
              icon={<Sparkles aria-hidden />}
              title="Ask is coming soon"
              description="Chatting with your lecture material is not built yet (Phase 2)."
            />
          </Tabs.Content>
        </Tabs.Root>

        <SourceViewer pages={pages} files={files} selected={selected} onSelect={setSelected} fileLabel={fileLabel} />
      </div>
    </div>
  );
}

function SourceViewer({
  pages,
  files,
  selected,
  onSelect,
  fileLabel,
}: {
  pages: PageView[];
  files: SourceFileRow[];
  selected: SourceRef | null;
  onSelect: (r: SourceRef) => void;
  fileLabel: (id: string) => string;
}) {
  const idx = selected ? pages.findIndex((p) => p.fileId === selected.fileId && p.page === selected.page) : -1;
  const page = idx >= 0 ? pages[idx] : null;
  const file = page ? files.find((f) => f.id === page.fileId) : null;
  const go = (d: number) => {
    const next = pages[idx + d];
    if (next) onSelect({ fileId: next.fileId, page: next.page });
  };

  return (
    <aside aria-label="Source viewer" className="lg:sticky lg:top-20 lg:self-start">
      <Card className="space-y-3 p-4 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-2 text-subhead font-medium text-label">
            <span className="truncate">{file ? `${fileLabel(file.id)} ${file.filename}` : "Source"}</span>
            {page && <Badge className="shrink-0 normal-case tabular-nums">p.{page.page}</Badge>}
          </p>
          <div className="flex shrink-0 gap-1">
            <Button size="icon-sm" variant="secondary" onClick={() => go(-1)} disabled={idx <= 0} aria-label="Previous page">
              <ChevronLeft aria-hidden />
            </Button>
            <Button
              size="icon-sm"
              variant="secondary"
              onClick={() => go(1)}
              disabled={idx < 0 || idx >= pages.length - 1}
              aria-label="Next page"
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </div>
        {page?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
          <img
            src={page.thumbnailUrl}
            alt={`Page ${page.page} of ${file?.filename ?? "source"}: ${page.text.slice(0, 120)}`}
            className="w-full rounded-xl border border-separator"
          />
        ) : null}
        {page && (
          <p className="scroll-thin max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-footnote text-label-2">
            {page.text || "(no extractable text on this page)"}
          </p>
        )}
        {!page && <p className="text-subhead text-label-2">Click a citation to open its slide.</p>}
      </Card>
    </aside>
  );
}
