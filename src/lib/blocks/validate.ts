import { Block, type SourceRef } from "./schema";

export type ValidationContext = {
  /** fileId -> number of pages */
  pageCounts: Record<string, number>;
};

const MERMAID_HEADERS = [
  "flowchart",
  "graph",
  "sequenceDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "timeline",
];

function checkSources(sources: SourceRef[], ctx: ValidationContext, errors: string[]) {
  for (const s of sources) {
    const count = ctx.pageCounts[s.fileId];
    if (count === undefined) errors.push(`sources: unknown fileId "${s.fileId}"`);
    else if (s.page < 1 || s.page > count)
      errors.push(`sources: page ${s.page} out of range 1-${count} for ${s.fileId}`);
  }
}

/**
 * Structural (Zod) + semantic validation of a single block.
 * Returns the parsed block or a list of human-readable errors that are fed
 * back to the model on the single retry.
 */
export function validateBlock(
  raw: unknown,
  ctx: ValidationContext,
): { ok: true; block: Block } | { ok: false; errors: string[] } {
  const parsed = Block.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  const b = parsed.data;
  const errors: string[] = [];
  checkSources(b.sources, ctx, errors);
  if (b.sources.length === 0 && !b.beyond_source)
    errors.push("sources: cite at least one page, or set beyond_source=true");

  switch (b.type) {
    case "tldr":
      if (b.summary.length !== 3) errors.push("summary: must be exactly 3 sentences");
      break;
    case "concept_map": {
      const ids = new Set(b.nodes.map((n) => n.id));
      if (b.nodes.length < 2) errors.push("nodes: need at least 2 nodes");
      if (ids.size !== b.nodes.length) errors.push("nodes: ids must be unique");
      for (const n of b.nodes)
        if (n.importance < 1 || n.importance > 3) errors.push(`nodes.${n.id}.importance must be 1-3`);
      for (const e of b.edges)
        if (!ids.has(e.from) || !ids.has(e.to))
          errors.push(`edges: ${e.from} -> ${e.to} references a missing node id`);
      break;
    }
    case "diagram": {
      const src = b.mermaid.trim();
      if (!MERMAID_HEADERS.some((h) => src.startsWith(h)))
        errors.push(`mermaid: must start with one of ${MERMAID_HEADERS.join(", ")}`);
      if (/<\s*script|javascript:|\bclick\b|\bhref\b|<\/?[a-z]+[^>]*>/i.test(src))
        errors.push("mermaid: HTML tags, click and href directives are not allowed");
      if (!b.caption.trim()) errors.push("caption: required (used as alt text)");
      break;
    }
    case "comparison":
      if (b.items.length < 2 || b.items.length > 4) errors.push("items: compare 2-4 things");
      for (const d of b.dimensions)
        if (d.values.length !== b.items.length)
          errors.push(`dimensions.${d.name}: needs exactly ${b.items.length} values`);
      break;
    case "formula":
      if (!b.latex.trim()) errors.push("latex: required");
      if (b.worked_example.steps.length === 0) errors.push("worked_example.steps: required");
      break;
    case "process":
      if (b.steps.length < 2) errors.push("steps: a process needs at least 2 steps");
      break;
    case "chart":
      if (b.rows.length < 2) errors.push("rows: need at least 2 data points");
      for (const r of b.rows)
        if (r.values.length !== b.series.length)
          errors.push(`rows.${r.label}: needs ${b.series.length} values`);
      break;
    case "exam_focus":
      if (b.points.length === 0) errors.push("points: required");
      break;
    case "code": {
      const lines = b.code.split("\n").length;
      for (const a of b.annotations)
        if (a.line < 1 || a.line > lines) errors.push(`annotations: line ${a.line} out of range`);
      break;
    }
    default:
      break;
  }

  return errors.length ? { ok: false, errors } : { ok: true, block: b };
}
