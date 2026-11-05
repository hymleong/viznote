"use client";
import dynamic from "next/dynamic";
import type { Block, SourceRef } from "@/lib/blocks/schema";
import { Badge, Card } from "@/components/ui/primitives";
import { Math } from "./math";
import { MermaidDiagram } from "./mermaid-diagram";
import { CodeBlock } from "./code-block";

const ConceptMap = dynamic(() => import("./concept-map").then((m) => m.ConceptMap), { ssr: false });
const ChartBlock = dynamic(() => import("./chart-block").then((m) => m.ChartBlock), { ssr: false });

const LABELS: Record<Block["type"], string> = {
  tldr: "TL;DR",
  concept_map: "Concept map",
  diagram: "Diagram",
  comparison: "Comparison",
  formula: "Formula",
  process: "Process",
  chart: "Chart",
  insight: "Insight",
  misconception: "Misconception",
  analogy: "Analogy",
  exam_focus: "Exam focus",
  code: "Code",
};

const INSIGHT_LABEL = {
  why_it_matters: "Why it matters",
  connection: "How it connects",
  trade_off: "The trade-off",
  edge_case: "Edge case",
} as const;

export function BlockView({
  block,
  onCite,
  fileLabel,
  footer,
}: {
  block: Block;
  onCite: (ref: SourceRef) => void;
  fileLabel: (fileId: string) => string;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <Badge tone="info">{LABELS[block.type]}</Badge>
        {block.beyond_source && (
          <Badge tone="warn" title="Not directly supported by your lecture material">
            Beyond the slides
          </Badge>
        )}
        <div className="ml-auto flex flex-wrap gap-1" aria-label="Sources">
          {block.sources.map((s) => (
            <button
              key={`${s.fileId}-${s.page}`}
              type="button"
              onClick={() => onCite(s)}
              className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label={`Open ${fileLabel(s.fileId)} page ${s.page}`}
            >
              {fileLabel(s.fileId)} p.{s.page}
            </button>
          ))}
        </div>
      </header>
      <BlockBody block={block} />
      {footer}
    </Card>
  );
}

function BlockBody({ block }: { block: Block }) {
  switch (block.type) {
    case "tldr":
      return (
        <div className="space-y-3">
          <p className="text-[15px] leading-relaxed">{block.summary.join(" ")}</p>
          <p className="rounded-lg bg-indigo-50 p-3 font-medium text-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-100">
            <span className="mr-2" aria-hidden>
              ★
            </span>
            <span className="sr-only">The one idea to remember: </span>
            {block.one_idea}
          </p>
        </div>
      );
    case "concept_map":
      return (
        <>
          <h3 className="font-semibold">{block.title}</h3>
          <ConceptMap block={block} />
        </>
      );
    case "diagram":
      return (
        <figure>
          <MermaidDiagram source={block.mermaid} caption={block.caption} />
          <figcaption className="mt-2 text-sm text-zinc-500">{block.caption}</figcaption>
        </figure>
      );
    case "comparison":
      return (
        <div className="space-y-3">
          <h3 className="font-semibold">{block.title}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th scope="col" className="p-2 text-left text-zinc-500" />
                  {block.items.map((it) => (
                    <th scope="col" key={it} className="p-2 text-left">
                      {it}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.dimensions.map((d) => (
                  <tr key={d.name} className="border-b border-zinc-100 align-top dark:border-zinc-800">
                    <th scope="row" className="p-2 text-left font-medium text-zinc-500">
                      {d.name}
                    </th>
                    {d.values.map((v, i) => (
                      <td key={i} className="p-2">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm">
            <span className="font-semibold">Takeaway: </span>
            {block.takeaway}
          </p>
        </div>
      );
    case "formula":
      return (
        <div className="space-y-3">
          <h3 className="font-semibold">{block.name}</h3>
          <Math latex={block.latex} display />
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            {block.symbols.map((s) => (
              <div key={s.symbol} className="flex gap-2">
                <dt className="min-w-10">
                  <Math latex={s.symbol} />
                </dt>
                <dd className="text-zinc-600 dark:text-zinc-400">{s.meaning}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm">
            <span className="font-semibold">Intuition: </span>
            {block.intuition}
          </p>
          <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60">
            <p className="font-semibold">Worked example</p>
            <p className="mt-1">{block.worked_example.problem}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              {block.worked_example.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <p className="mt-2 font-medium">Answer: {block.worked_example.answer}</p>
          </div>
        </div>
      );
    case "process":
      return (
        <div>
          <h3 className="mb-3 font-semibold">{block.title}</h3>
          <ol className="space-y-3">
            {block.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div className="text-sm">
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-zinc-700 dark:text-zinc-300">{s.detail}</p>
                  <p className="mt-1 text-red-700 dark:text-red-300">
                    <span className="font-medium">If you skip this: </span>
                    {s.if_skipped}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    case "chart":
      return (
        <>
          <h3 className="font-semibold">{block.title}</h3>
          <ChartBlock block={block} />
        </>
      );
    case "insight":
      return (
        <div className="border-l-4 border-amber-400 pl-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            {INSIGHT_LABEL[block.kind]}
          </p>
          <p className="font-semibold">{block.headline}</p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{block.body}</p>
        </div>
      );
    case "misconception":
      return (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/40">
            <p className="font-semibold text-red-800 dark:text-red-200">✗ Common belief</p>
            <p>{block.wrong_belief}</p>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">{block.why_wrong}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/40">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200">✓ Correct version</p>
            <p>{block.correct_version}</p>
          </div>
        </div>
      );
    case "analogy":
      return (
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-semibold">{block.concept}</span> is like {block.analogy}
          </p>
          <ul className="space-y-1">
            {block.mapping.map((m, i) => (
              <li key={i}>
                {m.from} <span aria-hidden>→</span>
                <span className="sr-only">maps to</span> {m.to}
              </li>
            ))}
          </ul>
          <p className="text-amber-800 dark:text-amber-300">
            <span className="font-medium">Where it breaks down: </span>
            {block.breaks_down}
          </p>
        </div>
      );
    case "exam_focus":
      return (
        <ul className="space-y-2 text-sm">
          {block.points.map((p, i) => (
            <li key={i} className="flex flex-wrap items-start gap-2">
              <Badge tone={p.likelihood === "high" ? "bad" : p.likelihood === "medium" ? "warn" : "neutral"}>
                {p.likelihood}
              </Badge>
              <span className="flex-1">{p.point}</span>
              <span className="text-xs text-zinc-500">{p.question_types.join(" · ")}</span>
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <>
          <h3 className="font-semibold">{block.title}</h3>
          <CodeBlock block={block} />
        </>
      );
  }
}
