"use client";
import { useState, useTransition } from "react";
import { CircleCheck, CircleX, Target } from "lucide-react";
import { answerQuiz } from "@/app/study-actions";
import { Card, EmptyState } from "@/components/ui/primitives";
import type { SourceRef } from "@/lib/blocks/schema";

export type QuizItemView = { id: string; question: string; options: string[]; sources: SourceRef[] };

export function QuizPanel({ items, onCite }: { items: QuizItemView[]; onCite: (r: SourceRef) => void }) {
  const [results, setResults] = useState<Record<string, { correct: boolean; answer: string; explanation: string }>>({});
  const [pending, start] = useTransition();

  if (!items.length)
    return (
      <EmptyState
        icon={<Target aria-hidden />}
        title="No quiz yet"
        description="The quiz appears after a generation finishes."
      />
    );

  return (
    <div className="space-y-5">
      {items.map((q, i) => {
        const r = results[q.id];
        return (
          <Card key={q.id} className="space-y-4">
            <div className="space-y-1">
              <p className="text-footnote font-semibold text-label-2">Question {i + 1}</p>
              <p className="text-headline font-semibold text-label">{q.question}</p>
            </div>
            <div className="grid gap-2" role="group" aria-label={`Options for question ${i + 1}`}>
              {q.options.map((o) => {
                const isAnswer = !!r && o === r.answer;
                const tone = isAnswer
                  ? "border-good bg-good/10"
                  : `border-separator bg-surface enabled:hover:bg-fill${r ? " opacity-60" : ""}`;
                return (
                  <button
                    key={o}
                    type="button"
                    disabled={pending || !!r}
                    onClick={() =>
                      start(async () => {
                        const res = await answerQuiz(q.id, o);
                        setResults((prev) => ({ ...prev, [q.id]: res }));
                      })
                    }
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-subhead text-label transition-colors duration-200 ${tone}`}
                  >
                    <span className="flex-1">{o}</span>
                    {isAnswer && <CircleCheck aria-hidden className="size-5 shrink-0 text-good" />}
                  </button>
                );
              })}
            </div>
            {r && (
              <div
                role="status"
                className={`flex gap-3 rounded-2xl p-4 text-subhead ${r.correct ? "bg-good/10" : "bg-bad/10"}`}
              >
                {r.correct ? (
                  <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-good" />
                ) : (
                  <CircleX aria-hidden className="mt-0.5 size-5 shrink-0 text-bad" />
                )}
                <div className="space-y-1">
                  <p className={r.correct ? "font-semibold text-good" : "font-semibold text-bad"}>
                    {r.correct ? "Correct." : `Not quite. The answer is ${r.answer}.`}
                  </p>
                  <p className="text-label-2">{r.explanation}</p>
                  {q.sources[0] && (
                    <button
                      type="button"
                      className="font-medium text-accent hover:underline hover:underline-offset-4"
                      onClick={() => onCite(q.sources[0])}
                    >
                      See the slide (p.{q.sources[0].page})
                    </button>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
