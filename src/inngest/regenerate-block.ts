import { z } from "zod";
import { inngest, REGENERATE_EVENT } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSource } from "@/lib/pipeline/source";
import { MAX_TOKENS, MODELS, structuredCall, withCacheBreakpoint } from "@/lib/llm/anthropic";
import { SCHEMA_BY_TYPE } from "@/lib/blocks/schema";
import { validateBlock } from "@/lib/blocks/validate";
import type { Block } from "@/lib/blocks/schema";

const EventData = z.object({
  blockId: z.string().uuid(),
  ownerId: z.string().uuid(),
  instruction: z.string().max(500),
});

export const regenerateBlock = inngest.createFunction(
  { id: "regenerate-block", triggers: { event: REGENERATE_EVENT }, retries: 1 },
  async ({ event, step }) => {
    const { blockId, ownerId, instruction } = EventData.parse(event.data);
    return step.run("regenerate", async () => {
      const admin = createAdminClient();
      const { data: old, error } = await admin.from("blocks").select("*").eq("id", blockId).eq("owner_id", ownerId).single();
      if (error) throw error;
      const src = await buildSource(admin, old.lecture_id as string);
      const fileIdToAlias = Object.fromEntries(Object.entries(src.aliasToFileId).map(([a, id]) => [id, a]));
      const current = old.data as Block;
      const aliased = {
        ...current,
        sources: current.sources.map((s) => ({ fileId: fileIdToAlias[s.fileId] ?? s.fileId, page: s.page })),
      };
      const type = old.type as Block["type"];
      const isOverview = old.section_key === "overview";

      const res = await structuredCall({
        pass: `regenerate:${type}`,
        model: isOverview ? MODELS.synthesis : MODELS.chunk,
        source: withCacheBreakpoint(src.content),
        instructions: `TASK: regenerate one block of type "${type}".
Current version:
${JSON.stringify(aliased)}

Student's instruction: ${instruction || "(none: improve clarity and insight)"}

Return a new version of this block, of the same type, that follows the instruction. Stay faithful to the source.`,
        schema: z.object({ block: SCHEMA_BY_TYPE[type] }),
        maxTokens: MAX_TOKENS.repair,
        effort: "medium",
      });
      const checked = validateBlock(res.data.block, { pageCounts: src.pageCounts });
      if (!checked.ok) throw new Error(`Regenerated block invalid: ${checked.errors.join("; ")}`);
      const mapped = {
        ...checked.block,
        sources: checked.block.sources
          .filter((s) => src.aliasToFileId[s.fileId])
          .map((s) => ({ fileId: src.aliasToFileId[s.fileId], page: s.page })),
      };

      await admin.from("blocks").insert({
        owner_id: ownerId,
        generation_id: old.generation_id,
        lecture_id: old.lecture_id,
        section_key: old.section_key,
        section_title: old.section_title,
        section_order: old.section_order,
        position: old.position,
        type,
        data: mapped,
        sources: mapped.sources,
        beyond_source: mapped.beyond_source,
        version: (old.version as number) + 1,
        previous_block_id: old.id,
      });
      await admin.from("blocks").update({ is_current: false }).eq("id", old.id);
      const { data: gen } = await admin.from("generations").select("model_usage").eq("id", old.generation_id).single();
      await admin
        .from("generations")
        .update({ model_usage: [...((gen?.model_usage as unknown[]) ?? []), res.usage] })
        .eq("id", old.generation_id);
      return { ok: true };
    });
  },
);
