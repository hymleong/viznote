import { z } from "zod";

/**
 * Typed lecture-page blocks. The LLM never returns HTML: it returns these JSON
 * shapes (enforced with structured outputs) and our components render them.
 *
 * The schemas here are *structural* (what the model is constrained to emit).
 * Semantic rules (importance 1-3, 2-4 compared items, page ranges, ...) live in
 * `validate.ts` so a single bad block can be retried or dropped on its own.
 */

export const SourceRef = z.object({
  fileId: z.string().describe("The fileId shown in the [file ... page ...] header"),
  page: z.number().int().describe("1-based page/slide number"),
});
export type SourceRef = z.infer<typeof SourceRef>;

const common = {
  sources: z.array(SourceRef).describe("Pages this block is drawn from"),
  beyond_source: z
    .boolean()
    .describe("true if any content is NOT supported by the provided material"),
};

export const RELATIONS = [
  "is-a",
  "part-of",
  "causes",
  "contrasts-with",
  "prerequisite-for",
] as const;

export const TldrBlock = z.object({
  type: z.literal("tldr"),
  summary: z.array(z.string()).describe("Exactly 3 plain-language sentences"),
  one_idea: z.string().describe("The one idea to remember"),
  ...common,
});

export const ConceptMapBlock = z.object({
  type: z.literal("concept_map"),
  title: z.string(),
  caption: z.string().describe("One-sentence description, used as alt text"),
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      definition: z.string().describe("Short definition, <= 20 words"),
      importance: z.number().int().describe("1 (minor) to 3 (core)"),
    }),
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      relation: z.enum(RELATIONS),
    }),
  ),
  ...common,
});

export const DiagramBlock = z.object({
  type: z.literal("diagram"),
  kind: z.enum(["flowchart", "sequence", "state", "timeline"]),
  mermaid: z
    .string()
    .describe(
      "Mermaid source only (no code fences, no HTML, no click/href directives). Quote labels containing punctuation.",
    ),
  caption: z.string().describe("What the diagram shows; used as alt text"),
  ...common,
});

export const ComparisonBlock = z.object({
  type: z.literal("comparison"),
  title: z.string(),
  items: z.array(z.string()).describe("2-4 things being compared"),
  dimensions: z
    .array(
      z.object({
        name: z.string(),
        values: z.array(z.string()).describe("One value per item, same order as items"),
      }),
    )
    .describe("Shared dimensions of comparison"),
  takeaway: z.string().describe("When to pick which"),
  ...common,
});

export const FormulaBlock = z.object({
  type: z.literal("formula"),
  name: z.string(),
  latex: z.string().describe("KaTeX-compatible LaTeX, no $ delimiters"),
  symbols: z.array(
    z.object({ symbol: z.string().describe("LaTeX for the symbol"), meaning: z.string() }),
  ),
  intuition: z.string(),
  worked_example: z.object({
    problem: z.string(),
    steps: z.array(z.string()),
    answer: z.string(),
  }),
  ...common,
});

export const ProcessBlock = z.object({
  type: z.literal("process"),
  title: z.string(),
  steps: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      if_skipped: z.string().describe("What goes wrong if you skip this step"),
    }),
  ),
  ...common,
});

export const ChartBlock = z.object({
  type: z.literal("chart"),
  title: z.string(),
  caption: z.string().describe("What the chart shows; used as alt text"),
  chart_type: z.enum(["bar", "line", "area"]),
  x_label: z.string(),
  y_label: z.string(),
  series: z.array(z.string()).describe("Series names"),
  rows: z
    .array(
      z.object({
        label: z.string().describe("x-axis category"),
        values: z.array(z.number()).describe("One value per series, same order"),
      }),
    )
    .describe("Only real numbers that appear in the lecture"),
  ...common,
});

export const InsightBlock = z.object({
  type: z.literal("insight"),
  kind: z.enum(["why_it_matters", "connection", "trade_off", "edge_case"]),
  headline: z.string(),
  body: z.string(),
  ...common,
});

export const MisconceptionBlock = z.object({
  type: z.literal("misconception"),
  wrong_belief: z.string(),
  why_wrong: z.string(),
  correct_version: z.string(),
  ...common,
});

export const AnalogyBlock = z.object({
  type: z.literal("analogy"),
  concept: z.string(),
  analogy: z.string(),
  mapping: z.array(z.object({ from: z.string(), to: z.string() })),
  breaks_down: z.string().describe("Where the analogy stops being accurate"),
  ...common,
});

export const ExamFocusBlock = z.object({
  type: z.literal("exam_focus"),
  points: z.array(
    z.object({
      point: z.string(),
      question_types: z.array(z.string()).describe("e.g. MCQ, derivation, short answer, trace"),
      likelihood: z.enum(["high", "medium", "low"]),
    }),
  ),
  ...common,
});

export const CodeBlock = z.object({
  type: z.literal("code"),
  title: z.string(),
  language: z.string().describe("Shiki language id, e.g. python, java, sql, ts"),
  code: z.string(),
  annotations: z.array(z.object({ line: z.number().int(), note: z.string() })),
  ...common,
});

export const Block = z.discriminatedUnion("type", [
  TldrBlock,
  ConceptMapBlock,
  DiagramBlock,
  ComparisonBlock,
  FormulaBlock,
  ProcessBlock,
  ChartBlock,
  InsightBlock,
  MisconceptionBlock,
  AnalogyBlock,
  ExamFocusBlock,
  CodeBlock,
]);
export type Block = z.infer<typeof Block>;
export type BlockType = Block["type"];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

export const SCHEMA_BY_TYPE: Record<BlockType, z.ZodType> = {
  tldr: TldrBlock,
  concept_map: ConceptMapBlock,
  diagram: DiagramBlock,
  comparison: ComparisonBlock,
  formula: FormulaBlock,
  process: ProcessBlock,
  chart: ChartBlock,
  insight: InsightBlock,
  misconception: MisconceptionBlock,
  analogy: AnalogyBlock,
  exam_focus: ExamFocusBlock,
  code: CodeBlock,
};

export const BLOCK_TYPES = [
  "tldr",
  "concept_map",
  "diagram",
  "comparison",
  "formula",
  "process",
  "chart",
  "insight",
  "misconception",
  "analogy",
  "exam_focus",
  "code",
] as const satisfies readonly BlockType[];

/** Block types the per-section pass may choose from. */
export const SECTION_BLOCK_TYPES = [
  "diagram",
  "comparison",
  "formula",
  "process",
  "chart",
  "insight",
  "analogy",
  "code",
  "concept_map",
] as const;

// ───────────────────────── pass outputs ─────────────────────────

export const Outline = z.object({
  lecture_title: z.string(),
  problem: z.string().describe("What problem this lecture's ideas solve (why before what)"),
  difficulty: z.enum(["intro", "intermediate", "advanced"]),
  prerequisites: z.array(z.string()),
  enables: z.array(z.string()).describe("What these ideas unlock later in the course"),
  key_concepts: z.array(
    z.object({
      name: z.string(),
      definition: z.string(),
      importance: z.number().int().describe("1-3"),
    }),
  ),
  sections: z.array(
    z.object({
      key: z.string().describe("short slug, unique"),
      title: z.string(),
      why: z.string().describe("The problem this section's idea solves"),
      pages: z.array(SourceRef),
      shape: z.enum(["sequence", "comparison", "hierarchy", "formula", "code", "data", "narrative"]),
      suggested_blocks: z.array(z.enum(SECTION_BLOCK_TYPES)).describe("1-3 block types"),
    }),
  ),
});
export type Outline = z.infer<typeof Outline>;
export type OutlineSection = Outline["sections"][number];

export const SectionOutput = z.object({
  blocks: z.array(
    z.discriminatedUnion("type", [
      DiagramBlock,
      ComparisonBlock,
      FormulaBlock,
      ProcessBlock,
      ChartBlock,
      InsightBlock,
      AnalogyBlock,
      CodeBlock,
      ConceptMapBlock,
    ]),
  ),
});

export const SynthesisOutput = z.object({
  tldr: TldrBlock,
  concept_map: ConceptMapBlock,
  insights: z.array(InsightBlock),
  misconceptions: z.array(MisconceptionBlock),
  exam_focus: ExamFocusBlock,
});
export type SynthesisOutput = z.infer<typeof SynthesisOutput>;
