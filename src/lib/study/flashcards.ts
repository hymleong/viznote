import type { Block, SourceRef } from "@/lib/blocks/schema";

export type FlashcardDraft = {
  kind: "concept" | "formula" | "misconception";
  front: string;
  back: string;
  sources: SourceRef[];
  block_id: string;
};

/** Deterministic flashcards from concepts, formulas and misconceptions (no extra LLM call). */
export function deriveFlashcards(blocks: { id: string; data: Block }[]): FlashcardDraft[] {
  const cards: FlashcardDraft[] = [];
  const seen = new Set<string>();
  for (const { id, data: b } of blocks) {
    if (b.type === "concept_map") {
      for (const n of b.nodes) {
        const key = n.label.toLowerCase();
        if (n.importance < 2 || seen.has(key)) continue;
        seen.add(key);
        cards.push({ kind: "concept", front: `What is ${n.label}?`, back: n.definition, sources: b.sources, block_id: id });
      }
    } else if (b.type === "formula") {
      cards.push({
        kind: "formula",
        front: `State ${b.name} and what it captures.`,
        back: `$$${b.latex}$$\n${b.intuition}`,
        sources: b.sources,
        block_id: id,
      });
    } else if (b.type === "misconception") {
      cards.push({
        kind: "misconception",
        front: `True or false: ${b.wrong_belief}`,
        back: `False. ${b.why_wrong} Correct version: ${b.correct_version}`,
        sources: b.sources,
        block_id: id,
      });
    }
  }
  return cards;
}
