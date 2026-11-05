import type { Block, SourceRef } from "@/lib/blocks/schema";

export type QuizDraft = {
  kind: "mcq";
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  sources: SourceRef[];
};

function shuffle<T>(xs: T[], seed: number) {
  const a = [...xs];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** MCQs grounded in generated blocks: definition -> concept, and misconception true/false. */
export function deriveQuiz(blocks: { data: Block }[]): QuizDraft[] {
  const items: QuizDraft[] = [];
  const map = blocks.map((b) => b.data).find((b) => b.type === "concept_map");
  if (map && map.type === "concept_map" && map.nodes.length >= 4) {
    map.nodes
      .filter((n) => n.importance >= 2)
      .slice(0, 8)
      .forEach((n, i) => {
        const distractors = shuffle(map.nodes.filter((o) => o.id !== n.id), i + 1).slice(0, 3);
        items.push({
          kind: "mcq",
          question: `Which concept matches this definition? "${n.definition}"`,
          options: shuffle([n.label, ...distractors.map((d) => d.label)], i + 7),
          answer: n.label,
          explanation: `${n.label}: ${n.definition}`,
          sources: map.sources,
        });
      });
  }
  for (const b of blocks.map((x) => x.data)) {
    if (b.type !== "misconception") continue;
    items.push({
      kind: "mcq",
      question: `True or false: ${b.wrong_belief}`,
      options: ["True", "False"],
      answer: "False",
      explanation: `${b.why_wrong} Correct version: ${b.correct_version}`,
      sources: b.sources,
    });
  }
  return items;
}
