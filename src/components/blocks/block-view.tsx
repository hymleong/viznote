"use client";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Brain,
  ChartColumn,
  CircleCheck,
  CircleX,
  Code,
  Info,
  Layers,
  Lightbulb,
  ListOrdered,
  Network,
  Sigma,
  Sparkles,
  Star,
  Target,
  Workflow,
} from "lucide-react";
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

const ICON_CLASS = "size-3.5";
const ICONS: Record<Block["type"], React.ReactNode> = {
  tldr: <Sparkles aria-hidden className={ICON_CLASS} />,
  concept_map: <Network aria-hidden className={ICON_CLASS} />,
  diagram: <Workflow aria-hidden className={ICON_CLASS} />,
  comparison: <Layers aria-hidden className={ICON_CLASS} />,
  formula: <Sigma aria-hidden className={ICON_CLASS} />,
  process: <ListOrdered aria-hidden className={ICON_CLASS} />,
  chart: <ChartColumn aria-hidden className={ICON_CLASS} />,
  insight: <Lightbulb aria-hidden className={ICON_CLASS} />,
  misconception: <CircleX aria-hidden className={ICON_CLASS} />,
  analogy: <Brain aria-hidden className={ICON_CLASS} />,
  exam_focus: <Target aria-hidden className={ICON_CLASS} />,
  code: <Code aria-hidden className={ICON_CLASS} />,
};

const INSIGHT_LABEL = {
  why_it_matters: "Why it matters",
  connection: "How it connects",
  trade_off: "The trade-off",
  edge_case: "Edge case",
} as const;

const H3 = "text-headline font-semibold tracking-tight text-label";

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
    <Card className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-fill/10 px-2.5 py-1 text-footnote font-semibold text-accent">
          {ICONS[block.type]}
          {LABELS[block.type]}
        </span>
        {block.beyond_source && (
          <Badge tone="warn" className="normal-case" title="Not directly supported by your lecture material">
            <Info aria-hidden className="size-3.5" />
            Beyond the slides
          </Badge>
        )}
        <div className="ml-auto flex flex-wrap gap-1.5" role="group" aria-label="Sources">
          {block.sources.map((s) => (
            <button
              key={`${s.fileId}-${s.page}`}
              type="button"
              onClick={() => onCite(s)}
              className="rounded-full bg-fill px-2.5 py-1 text-footnote font-medium text-label-2 tabular-nums transition-colors duration-200 hover:bg-fill-strong hover:text-label"
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
        <div className="space-y-4">
          <p className="text-headline leading-relaxed text-label">{block.summary.join(" ")}</p>
          <p className="flex gap-3 rounded-2xl bg-accent-fill/10 p-4 font-medium text-label">
            <Star aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
            <span>
              <span className="sr-only">The one idea to remember: </span>
              {block.one_idea}
            </span>
          </p>
        </div>
      );
    case "concept_map":
      return (
        <>
          <h3 className={H3}>{block.title}</h3>
          <ConceptMap block={block} />
        </>
      );
    case "diagram":
      return (
        <figure>
          <MermaidDiagram source={block.mermaid} caption={block.caption} />
          <figcaption className="mt-3 text-footnote text-label-2">{block.caption}</figcaption>
        </figure>
      );
    case "comparison":
      return (
        <div className="space-y-4">
          <h3 className={H3}>{block.title}</h3>
          <div className="scroll-thin overflow-x-auto rounded-2xl border border-separator">
            <table className="w-full text-subhead">
              <thead className="bg-surface-2">
                <tr className="border-b border-separator">
                  <th scope="col" className="p-3 text-left">
                    <span className="sr-only">Dimension</span>
                  </th>
                  {block.items.map((it) => (
                    <th scope="col" key={it} className="p-3 text-left text-footnote font-semibold text-label">
                      {it}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-separator">
                {block.dimensions.map((d) => (
                  <tr key={d.name} className="align-top">
                    <th scope="row" className="p-3 text-left text-footnote font-medium text-label-2">
                      {d.name}
                    </th>
                    {d.values.map((v, i) => (
                      <td key={i} className="p-3 text-label">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="rounded-2xl bg-surface-2 p-4 text-subhead text-label">
            <span className="font-semibold">Takeaway: </span>
            {block.takeaway}
          </p>
        </div>
      );
    case "formula":
      return (
        <div className="space-y-4">
          <h3 className={H3}>{block.name}</h3>
          <div className="rounded-2xl bg-surface-2 px-4 py-2 text-label">
            <Math latex={block.latex} display />
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-subhead sm:grid-cols-2">
            {block.symbols.map((s) => (
              <div key={s.symbol} className="flex items-baseline gap-3">
                <dt className="min-w-10 text-label">
                  <Math latex={s.symbol} />
                </dt>
                <dd className="text-label-2">{s.meaning}</dd>
              </div>
            ))}
          </dl>
          <p className="text-subhead text-label">
            <span className="font-semibold">Intuition: </span>
            {block.intuition}
          </p>
          <div className="rounded-2xl bg-surface-2 p-4 text-subhead text-label">
            <p className="text-xs font-semibold uppercase tracking-wide text-label-2">Worked example</p>
            <p className="mt-2">{block.worked_example.problem}</p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 marker:text-label-2">
              {block.worked_example.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <p className="mt-3 font-semibold">Answer: {block.worked_example.answer}</p>
          </div>
        </div>
      );
    case "process":
      return (
        <div>
          <h3 className={`mb-4 ${H3}`}>{block.title}</h3>
          <ol className="space-y-4">
            {block.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-fill text-footnote font-semibold text-on-accent tabular-nums"
                >
                  {i + 1}
                </span>
                <div className="text-subhead">
                  <p className="font-semibold text-label">{s.title}</p>
                  <p className="mt-0.5 text-label-2">{s.detail}</p>
                  <p className="mt-1.5 text-bad">
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
          <h3 className={H3}>{block.title}</h3>
          <ChartBlock block={block} />
        </>
      );
    case "insight":
      return (
        <div className="flex gap-3 rounded-2xl bg-warn/10 p-4">
          <Lightbulb aria-hidden className="mt-0.5 size-5 shrink-0 text-warn" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-warn">{INSIGHT_LABEL[block.kind]}</p>
            <p className="mt-1 text-headline font-semibold text-label">{block.headline}</p>
            <p className="mt-1 text-subhead text-label-2">{block.body}</p>
          </div>
        </div>
      );
    case "misconception":
      return (
        <div className="grid gap-3 text-subhead sm:grid-cols-2">
          <div className="rounded-2xl bg-bad/10 p-4">
            <p className="flex items-center gap-1.5 font-semibold text-bad">
              <CircleX aria-hidden className="size-4 shrink-0" />
              Common belief
            </p>
            <p className="mt-2 text-label">{block.wrong_belief}</p>
            <p className="mt-2 text-label-2">{block.why_wrong}</p>
          </div>
          <div className="rounded-2xl bg-good/10 p-4">
            <p className="flex items-center gap-1.5 font-semibold text-good">
              <CircleCheck aria-hidden className="size-4 shrink-0" />
              Correct version
            </p>
            <p className="mt-2 text-label">{block.correct_version}</p>
          </div>
        </div>
      );
    case "analogy":
      return (
        <div className="space-y-4 text-subhead">
          <p className="text-headline text-label">
            <span className="font-semibold">{block.concept}</span> is like {block.analogy}
          </p>
          <ul className="divide-y divide-separator overflow-hidden rounded-2xl bg-surface-2">
            {block.mapping.map((m, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 text-label">{m.from}</span>
                <ArrowRight aria-hidden className="size-4 shrink-0 text-label-3" />
                <span className="sr-only">maps to</span>
                <span className="flex-1 text-label-2">{m.to}</span>
              </li>
            ))}
          </ul>
          <p className="text-warn">
            <span className="font-medium">Where it breaks down: </span>
            {block.breaks_down}
          </p>
        </div>
      );
    case "exam_focus":
      return (
        <ul className="divide-y divide-separator text-subhead">
          {block.points.map((p, i) => (
            <li key={i} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
              <Badge
                className="mt-0.5"
                tone={p.likelihood === "high" ? "bad" : p.likelihood === "medium" ? "warn" : "neutral"}
              >
                {p.likelihood}
              </Badge>
              <span className="flex-1 text-label">{p.point}</span>
              <span className="text-footnote text-label-2">{p.question_types.join(" · ")}</span>
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <>
          <h3 className={H3}>{block.title}</h3>
          <CodeBlock block={block} />
        </>
      );
  }
}
