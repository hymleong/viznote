import { z } from "zod";
import { inngest, GENERATE_EVENT } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmbeddingProvider, toPgVector } from "@/lib/embeddings";
import { buildSource, chunkPages, type BuiltSource } from "@/lib/pipeline/source";
import {
  MAX_TOKENS,
  MODELS,
  structuredCall,
  withCacheBreakpoint,
  type PassUsage,
} from "@/lib/llm/anthropic";
import {
  OUTLINE_INSTRUCTIONS,
  SYNTHESIS_INSTRUCTIONS,
  repairInstructions,
  sectionInstructions,
} from "@/lib/llm/prompts";
import * as S from "@/lib/blocks/schema";
import { validateBlock, type ValidationContext } from "@/lib/blocks/validate";

const EventData = z.object({
  lectureId: z.string().uuid(),
  generationId: z.string().uuid(),
  ownerId: z.string().uuid(),
});

const SCHEMA_BY_TYPE: Record<S.BlockType, z.ZodType> = {
  tldr: S.TldrBlock,
  concept_map: S.ConceptMapBlock,
  diagram: S.DiagramBlock,
  comparison: S.ComparisonBlock,
  formula: S.FormulaBlock,
  process: S.ProcessBlock,
  chart: S.ChartBlock,
  insight: S.InsightBlock,
  misconception: S.MisconceptionBlock,
  analogy: S.AnalogyBlock,
  exam_focus: S.ExamFocusBlock,
  code: S.CodeBlock,
};

type Dropped = { section: string; type: string; errors: string[] };

/**
 * Validate every block; retry each failing block once with the error message;
 * drop it (and log) if it still fails.
 */
async function validateAll(
  raw: S.Block[],
  section: string,
  src: BuiltSource,
  usage: PassUsage[],
): Promise<{ blocks: S.Block[]; dropped: Dropped[] }> {
  const ctx: ValidationContext = { pageCounts: src.pageCounts };
  const blocks: S.Block[] = [];
  const dropped: Dropped[] = [];
  for (const candidate of raw) {
    const first = validateBlock(candidate, ctx);
    if (first.ok) {
      blocks.push(first.block);
      continue;
    }
    try {
      const repaired = await structuredCall({
        pass: `repair:${section}:${candidate.type}`,
        model: MODELS.chunk,
        source: withCacheBreakpoint(src.content),
        instructions: repairInstructions(JSON.stringify(candidate), first.errors),
        schema: z.object({ block: SCHEMA_BY_TYPE[candidate.type] }),
        maxTokens: MAX_TOKENS.repair,
        effort: "low",
      });
      usage.push(repaired.usage);
      const second = validateBlock(repaired.data.block, ctx);
      if (second.ok) blocks.push(second.block);
      else dropped.push({ section, type: candidate.type, errors: second.errors });
    } catch (e) {
      dropped.push({ section, type: candidate.type, errors: [String(e)] });
    }
  }
  if (dropped.length) console.warn("[generate] dropped blocks", JSON.stringify(dropped));
  return { blocks, dropped };
}

function mapSources(block: S.Block, src: BuiltSource): S.Block {
  return {
    ...block,
    sources: block.sources
      .filter((s) => src.aliasToFileId[s.fileId])
      .map((s) => ({ fileId: src.aliasToFileId[s.fileId], page: s.page })),
  };
}

export const generateLecture = inngest.createFunction(
  {
    id: "generate-lecture",
    triggers: { event: GENERATE_EVENT },
    retries: 2,
    concurrency: { limit: 4 },
    onFailure: async ({ event, error }) => {
      const parsed = EventData.safeParse(event.data.event.data);
      if (!parsed.success) return;
      const admin = createAdminClient();
      await admin
        .from("generations")
        .update({ status: "failed", error: error.message })
        .eq("id", parsed.data.generationId);
      await admin.from("lectures").update({ status: "failed" }).eq("id", parsed.data.lectureId);
    },
  },
  async ({ event, step }) => {
    const { lectureId, generationId, ownerId } = EventData.parse(event.data);
    const admin = createAdminClient();
    const setStatus = (status: string, progress: Record<string, unknown> = {}) =>
      admin.from("generations").update({ status, progress }).eq("id", generationId);

    // 1. Ingest: chunk per slide/section and embed.
    await step.run("ingest", async () => {
      await setStatus("ingesting");
      await admin.from("lectures").update({ status: "processing" }).eq("id", lectureId);
      const { data: files } = await admin.from("source_files").select("id").eq("lecture_id", lectureId);
      await admin.from("chunks").delete().eq("lecture_id", lectureId);
      const provider = getEmbeddingProvider();
      for (const f of files ?? []) {
        const { data: pages } = await admin
          .from("pages")
          .select("page_number, text")
          .eq("source_file_id", f.id)
          .order("page_number");
        const chunks = chunkPages((pages ?? []) as { page_number: number; text: string }[]);
        if (!chunks.length) continue;
        const vectors = provider ? await provider.embed(chunks.map((c) => c.content), "document") : null;
        const { error } = await admin.from("chunks").insert(
          chunks.map((c, i) => ({
            ...c,
            owner_id: ownerId,
            lecture_id: lectureId,
            source_file_id: f.id,
            embedding: vectors ? toPgVector(vectors[i]) : null,
          })),
        );
        if (error) throw error;
      }
    });

    const src = await step.run("build-source", async () => {
      const built = await buildSource(admin, lectureId);
      return { ...built, content: withCacheBreakpoint(built.content) };
    });
    const source = src.content as BuiltSource["content"];

    // 2. Outline pass (Sonnet).
    const outlineResult = await step.run("outline", async () => {
      await setStatus("outlining");
      const res = await structuredCall({
        pass: "outline",
        model: MODELS.synthesis,
        source,
        instructions: OUTLINE_INSTRUCTIONS,
        schema: S.Outline,
        maxTokens: MAX_TOKENS.outline,
        effort: "medium",
      });
      await admin.from("generations").update({ outline: res.data }).eq("id", generationId);
      return res;
    });
    const outline = outlineResult.data as S.Outline;

    // 3. Section pass (Haiku, parallel). The first call runs alone to warm the cache.
    const runSection = (section: S.OutlineSection, order: number) =>
      step.run(`section-${order}-${section.key}`, async () => {
        const usage: PassUsage[] = [];
        const res = await structuredCall({
          pass: `section:${section.key}`,
          model: MODELS.chunk,
          source,
          instructions: sectionInstructions({
            title: section.title,
            why: section.why,
            shape: section.shape,
            pages: section.pages.map((p) => `${p.fileId} p${p.page}`).join(", "),
            suggested: section.suggested_blocks,
            lectureProblem: outline.problem,
          }),
          schema: S.SectionOutput,
          maxTokens: MAX_TOKENS.section,
          effort: "medium",
        });
        usage.push(res.usage);
        const { blocks, dropped } = await validateAll(res.data.blocks.slice(0, 3), section.key, src, usage);
        if (blocks.length) {
          const { error } = await admin.from("blocks").insert(
            blocks.map((b, position) => {
              const mapped = mapSources(b, src);
              return {
                owner_id: ownerId,
                generation_id: generationId,
                lecture_id: lectureId,
                section_key: section.key,
                section_title: section.title,
                section_order: order,
                position,
                type: mapped.type,
                data: mapped,
                sources: mapped.sources,
                beyond_source: mapped.beyond_source,
              };
            }),
          );
          if (error) throw error;
        }
        return { usage, dropped };
      });

    await setStatus("sections", { sections_total: outline.sections.length });
    const sectionResults =
      outline.sections.length > 0 ? [await runSection(outline.sections[0], 0)] : [];
    sectionResults.push(...(await Promise.all(outline.sections.slice(1).map((s, i) => runSection(s, i + 1)))));

    // 4. Synthesis pass (Sonnet): tldr, insights, misconceptions, exam focus, concept map.
    const synthesis = await step.run("synthesis", async () => {
      await setStatus("synthesizing");
      const usage: PassUsage[] = [];
      const res = await structuredCall({
        pass: "synthesis",
        model: MODELS.synthesis,
        source,
        instructions: `${SYNTHESIS_INSTRUCTIONS}\n\nOUTLINE:\n${JSON.stringify(outline)}`,
        schema: S.SynthesisOutput,
        maxTokens: MAX_TOKENS.synthesis,
        effort: "high",
      });
      usage.push(res.usage);
      const d = res.data;
      const ordered: S.Block[] = [d.tldr, d.concept_map, ...d.insights, ...d.misconceptions, d.exam_focus];
      const { blocks, dropped } = await validateAll(ordered, "overview", src, usage);
      if (blocks.length) {
        const { error } = await admin.from("blocks").insert(
          blocks.map((b, position) => {
            const mapped = mapSources(b, src);
            return {
              owner_id: ownerId,
              generation_id: generationId,
              lecture_id: lectureId,
              section_key: "overview",
              section_title: "Overview",
              section_order: -1,
              position,
              type: mapped.type,
              data: mapped,
              sources: mapped.sources,
              beyond_source: mapped.beyond_source,
            };
          }),
        );
        if (error) throw error;
      }
      return { usage, dropped, concepts: outline.key_concepts };
    });

    // Finalise: snapshot the versioned document, record token usage, store concepts.
    await step.run("finalize", async () => {
      const usage = [outlineResult.usage, ...sectionResults.flatMap((r) => r.usage), ...synthesis.usage];
      const dropped = [...sectionResults.flatMap((r) => r.dropped), ...synthesis.dropped];
      const sum = (k: keyof PassUsage) => usage.reduce((a, u) => a + (Number(u[k]) || 0), 0);
      const { data: blocks } = await admin
        .from("blocks")
        .select("id, section_key, section_title, section_order, position, type, data")
        .eq("generation_id", generationId)
        .order("section_order")
        .order("position");

      await admin
        .from("generations")
        .update({
          status: "complete",
          progress: { sections_total: outline.sections.length, dropped },
          document: { outline, blocks },
          model_usage: usage,
          input_tokens: sum("input_tokens"),
          output_tokens: sum("output_tokens"),
          cache_read_tokens: sum("cache_read_input_tokens"),
          cache_write_tokens: sum("cache_creation_input_tokens"),
          completed_at: new Date().toISOString(),
        })
        .eq("id", generationId);
      await admin
        .from("lectures")
        .update({ status: "ready", current_generation_id: generationId })
        .eq("id", lectureId);

      const { data: lecture } = await admin.from("lectures").select("module_id").eq("id", lectureId).single();
      if (lecture) {
        await admin.from("concepts").upsert(
          synthesis.concepts.map((c) => ({
            owner_id: ownerId,
            module_id: lecture.module_id,
            lecture_id: lectureId,
            name: c.name,
            definition: c.definition,
            importance: Math.min(3, Math.max(1, c.importance)),
          })),
          { onConflict: "lecture_id,name" },
        );
      }
    });

    return { generationId, sections: outline.sections.length };
  },
);
