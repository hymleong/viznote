import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET } from "@/lib/env";
import type { SourceContent } from "@/lib/llm/anthropic";

/** Caps that keep a single lecture's prompt bounded (cost control). */
const MAX_SOURCE_CHARS = 350_000;
const MAX_IMAGES = 24;

export type BuiltSource = {
  content: SourceContent;
  /** alias ("F1") -> page count; aliases keep citations short and reliable */
  pageCounts: Record<string, number>;
  /** alias -> source_files.id */
  aliasToFileId: Record<string, string>;
};

/**
 * Builds the lecture material once per generation. The result is memoised by
 * the job step, so every pass sends a byte-identical prefix and hits the cache.
 */
export async function buildSource(admin: SupabaseClient, lectureId: string): Promise<BuiltSource> {
  const { data: files, error } = await admin
    .from("source_files")
    .select("id, filename, page_count")
    .eq("lecture_id", lectureId)
    .order("created_at");
  if (error) throw error;

  const content: SourceContent = [];
  const pageCounts: Record<string, number> = {};
  const aliasToFileId: Record<string, string> = {};
  let chars = 0;
  let images = 0;
  let buffer = "";
  const flush = () => {
    if (buffer) content.push({ type: "text", text: buffer });
    buffer = "";
  };

  for (const [i, file] of (files ?? []).entries()) {
    const alias = `F${i + 1}`;
    aliasToFileId[alias] = file.id;
    pageCounts[alias] = file.page_count;
    buffer += `\n=== file ${alias}: ${file.filename} (${file.page_count} pages) ===\n`;

    const { data: pages, error: pErr } = await admin
      .from("pages")
      .select("page_number, text, image_path")
      .eq("source_file_id", file.id)
      .order("page_number");
    if (pErr) throw pErr;

    for (const p of pages ?? []) {
      const text = (p.text as string).slice(0, Math.max(0, MAX_SOURCE_CHARS - chars));
      chars += text.length;
      buffer += `\n[file ${alias} page ${p.page_number}]\n${text || "(no extractable text)"}\n`;
      if (p.image_path && images < MAX_IMAGES) {
        const { data: signed } = await admin.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(p.image_path as string, 60 * 60 * 3);
        if (signed?.signedUrl) {
          flush();
          content.push({ type: "image", source: { type: "url", url: signed.signedUrl } });
          images++;
        }
      }
    }
  }
  flush();
  return { content, pageCounts, aliasToFileId };
}

/** One chunk per slide, merging very short consecutive slides. */
export function chunkPages(pages: { page_number: number; text: string }[]) {
  const chunks: { page_start: number; page_end: number; content: string }[] = [];
  let cur: { page_start: number; page_end: number; content: string } | null = null;
  for (const p of pages) {
    const text = p.text.trim();
    if (!text) continue;
    if (cur && cur.content.length + text.length < 600) {
      cur.page_end = p.page_number;
      cur.content += `\n${text}`;
    } else {
      if (cur) chunks.push(cur);
      cur = { page_start: p.page_number, page_end: p.page_number, content: text };
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}
