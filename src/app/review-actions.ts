"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { validateBlock } from "@/lib/blocks/validate";
import { inngest, REGENERATE_EVENT } from "@/inngest/client";

const Id = z.string().uuid();

async function loadBlock(blockId: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("id", Id.parse(blockId))
    .single();
  if (error) throw new Error(error.message);
  return { supabase, user, block: data };
}

export async function approveBlock(blockId: string) {
  const { supabase, block } = await loadBlock(blockId);
  await supabase.from("blocks").update({ review_status: "approved" }).eq("id", block.id);
  revalidatePath(`/lectures/${block.lecture_id}`);
}

/** Soft delete: the row is kept so version history stays intact. */
export async function deleteBlock(blockId: string) {
  const { supabase, block } = await loadBlock(blockId);
  await supabase.from("blocks").update({ deleted_at: new Date().toISOString() }).eq("id", block.id);
  revalidatePath(`/lectures/${block.lecture_id}`);
}

/** Inline edit: validated with the same Zod + semantic rules, saved as a new version. */
export async function editBlock(blockId: string, data: unknown) {
  const { supabase, user, block } = await loadBlock(blockId);
  const { data: files } = await supabase
    .from("source_files")
    .select("id, page_count")
    .eq("lecture_id", block.lecture_id);
  const pageCounts = Object.fromEntries((files ?? []).map((f) => [f.id as string, f.page_count as number]));
  const result = validateBlock(data, { pageCounts });
  if (!result.ok) return { ok: false as const, errors: result.errors };
  if (result.block.type !== block.type) return { ok: false as const, errors: ["type: cannot change block type"] };

  const { error } = await supabase.from("blocks").insert({
    owner_id: user.id,
    generation_id: block.generation_id,
    lecture_id: block.lecture_id,
    section_key: block.section_key,
    section_title: block.section_title,
    section_order: block.section_order,
    position: block.position,
    type: block.type,
    data: result.block,
    sources: result.block.sources,
    beyond_source: result.block.beyond_source,
    review_status: "edited",
    version: block.version + 1,
    previous_block_id: block.id,
  });
  if (error) return { ok: false as const, errors: [error.message] };
  await supabase.from("blocks").update({ is_current: false }).eq("id", block.id);
  revalidatePath(`/lectures/${block.lecture_id}`);
  return { ok: true as const };
}

/** Regeneration runs in the background job; the previous version is never discarded. */
export async function regenerateBlock(blockId: string, instruction: string) {
  const { user, block } = await loadBlock(blockId);
  await inngest.send({
    name: REGENERATE_EVENT,
    data: { blockId: block.id, ownerId: user.id, instruction: instruction.slice(0, 500) },
  });
}
