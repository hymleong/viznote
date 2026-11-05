"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { createClient } from "@/lib/supabase/client";
import { startGeneration } from "@/app/actions";
import { BlockView } from "@/components/blocks/block-view";
import { ReviewControls } from "@/components/blocks/review-controls";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
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

export function LectureView({
  lectureId,
  files,
  pages,
  initialGeneration,
  initialBlocks,
}: {
  lectureId: string;
  files: SourceFileRow[];
  pages: PageView[];
  initialGeneration: GenerationRow | null;
  initialBlocks: BlockRow[];
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={generate} disabled={pending || !!running || files.length === 0}>
          {generation ? "Regenerate (new version)" : "Generate study page"}
        </Button>
        {generation && (
          <span className="text-sm text-zinc-600 dark:text-zinc-300" role="status" aria-live="polite">
            v{generation.version} · {STATUS_LABEL[generation.status] ?? generation.status}
            {generation.status === "sections" && total ? ` (${doneSections}/${total})` : ""}
            {generation.error ? ` — ${generation.error}` : ""}
          </span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)_340px]">
        <nav aria-label="Outline" className="hidden lg:block">
          <ol className="sticky top-4 space-y-1 text-sm">
            {sections.map((s) => (
              <li key={s.key}>
                <a href={`#sec-${s.key}`} className="block rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Tabs.Root defaultValue="overview" className="min-w-0">
          <Tabs.List aria-label="Study views" className="mb-4 flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800">
            {[
              ["overview", "Overview"],
              ["visual", "Visual Map"],
              ["deep", "Deep Dive"],
              ["flashcards", "Flashcards"],
              ["quiz", "Quiz"],
              ["ask", "Ask"],
            ].map(([v, label]) => (
              <Tabs.Trigger
                key={v}
                value={v}
                className="rounded-t-md px-3 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="overview" className="space-y-4">
            {sorted.filter((b) => OVERVIEW.has(b.type)).map(render)}
            {running && <Card className="h-24 animate-pulse" />}
            {!generation && <p className="text-sm text-zinc-500">Upload material, then generate the study page.</p>}
          </Tabs.Content>
          <Tabs.Content value="visual" className="space-y-4">
            {sorted.filter((b) => VISUAL.has(b.type)).map(render)}
          </Tabs.Content>
          <Tabs.Content value="deep" className="space-y-8">
            {sections.map((s) => (
              <section key={s.key} id={`sec-${s.key}`} aria-labelledby={`h-${s.key}`} className="scroll-mt-4 space-y-3">
                <h2 id={`h-${s.key}`} className="text-lg font-semibold">
                  {s.title}
                </h2>
                {s.blocks.map(render)}
              </section>
            ))}
          </Tabs.Content>
          <Tabs.Content value="flashcards">
            <Card className="space-y-2 text-sm">
              <p>
                Flashcards are built from this lecture&apos;s concepts, formulas and misconceptions when a
                generation finishes. They are scheduled with FSRS in one queue across all your modules.
              </p>
              <Button asChild size="sm">
                <a href="/review">Open daily review</a>
              </Button>
            </Card>
          </Tabs.Content>
          {["quiz", "ask"].map((v) => (
            <Tabs.Content key={v} value={v}>
              <Card>
                <p className="text-sm text-zinc-500">Not built yet (Phase 2).</p>
              </Card>
            </Tabs.Content>
          ))}
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
    <aside aria-label="Source viewer" className="lg:sticky lg:top-4 lg:self-start">
      <Card className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">
            {file ? `${fileLabel(file.id)} ${file.filename}` : "Source"}
            {page && <Badge className="ml-2">p.{page.page}</Badge>}
          </p>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => go(-1)} disabled={idx <= 0} aria-label="Previous page">
              ‹
            </Button>
            <Button size="sm" variant="outline" onClick={() => go(1)} disabled={idx < 0 || idx >= pages.length - 1} aria-label="Next page">
              ›
            </Button>
          </div>
        </div>
        {page?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
          <img
            src={page.thumbnailUrl}
            alt={`Page ${page.page} of ${file?.filename ?? "source"}: ${page.text.slice(0, 120)}`}
            className="w-full rounded border border-zinc-200 dark:border-zinc-700"
          />
        ) : null}
        {page && (
          <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">
            {page.text || "(no extractable text on this page)"}
          </p>
        )}
        {!page && <p className="text-sm text-zinc-500">Click a citation to open its slide.</p>}
      </Card>
    </aside>
  );
}
