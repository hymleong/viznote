"use client";
import { useState, useTransition } from "react";
import { answerQuiz } from "@/app/study-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import type { SourceRef } from "@/lib/blocks/schema";

export type QuizItemView = { id: string; question: string; options: string[]; sources: SourceRef[] };

export function QuizPanel({ items, onCite }: { items: QuizItemView[]; onCite: (r: SourceRef) => void }) {
  const [results, setResults] = useState<Record<string, { correct: boolean; answer: string; explanation: string }>>({});
  const [pending, start] = useTransition();

  if (!items.length) return <Card className="text-sm text-zinc-500">The quiz appears after a generation finishes.</Card>;

  return (
    <div className="space-y-4">
      {items.map((q, i) => {
        const r = results[q.id];
        return (
          <Card key={q.id} className="space-y-3">
            <p className="font-medium">
              {i + 1}. {q.question}
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={`Options for question ${i + 1}`}>
              {q.options.map((o) => (
                <Button
                  key={o}
                  size="sm"
                  variant={r && o === r.answer ? "default" : "outline"}
                  disabled={pending || !!r}
                  onClick={() =>
                    start(async () => {
                      const res = await answerQuiz(q.id, o);
                      setResults((prev) => ({ ...prev, [q.id]: res }));
                    })
                  }
                >
                  {o}
                </Button>
              ))}
            </div>
            {r && (
              <div role="status" className="text-sm">
                <p className={r.correct ? "font-semibold text-emerald-700 dark:text-emerald-300" : "font-semibold text-red-700 dark:text-red-300"}>
                  {r.correct ? "Correct." : `Not quite. The answer is ${r.answer}.`}
                </p>
                <p className="text-zinc-700 dark:text-zinc-300">{r.explanation}</p>
                {q.sources[0] && (
                  <button type="button" className="mt-1 text-indigo-600 hover:underline" onClick={() => onCite(q.sources[0])}>
                    See the slide (p.{q.sources[0].page})
                  </button>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
