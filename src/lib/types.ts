import type { Block, SourceRef } from "@/lib/blocks/schema";

export type ModuleRow = { id: string; code: string; title: string; created_at: string };

export type LectureRow = {
  id: string;
  module_id: string;
  title: string;
  status: "draft" | "processing" | "ready" | "failed";
  current_generation_id: string | null;
  created_at: string;
};

export type SourceFileRow = {
  id: string;
  kind: string;
  filename: string;
  page_count: number;
};

export type PageView = {
  fileId: string;
  page: number;
  text: string;
  thumbnailUrl: string | null;
};

export type BlockRow = {
  id: string;
  generation_id: string;
  section_key: string;
  section_title: string;
  section_order: number;
  position: number;
  type: Block["type"];
  data: Block;
  sources: SourceRef[];
  beyond_source: boolean;
  review_status: "pending" | "approved" | "edited";
};

export type GenerationRow = {
  id: string;
  version: number;
  status: string;
  progress: { sections_total?: number; dropped?: unknown[] };
  error: string | null;
};
