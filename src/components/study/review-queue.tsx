"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { CircleCheck } from "lucide-react";
import { rateCard } from "@/app/study-actions";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Math } from "@/components/blocks/math";

export type QueueCard = {
  id: string;
  kind: string;
  front: string;
  back: string;
  lectureId: string;
  lectureTitle: string;
};

const RATINGS = [
  { value: 1, label: "Again", tone: "text-bad" },
  { value: 2, label: "Hard", tone: "text-warn" },
  { value: 3, label: "Good", tone: "text-accent" },
  { value: 4, label: "Easy", tone: "text-good" },
] as const;

function Back({ text }: { text: string }) {
  const m = text.match(/^\$\$([\s\S]+?)\$\$\n?([\s\S]*)$/);
  if (!m) return <p>{text}</p>;
  return (
    <>
      <Math latex={m[1]} display />
      <p>{m[2]}</p>
    </>
  );
}

export function ReviewQueue({ cards }: { cards: QueueCard[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pending, start] = useTransition();
  const card = cards[index];

  if (!card)
    return (
      <EmptyState icon={<CircleCheck aria-hidden />} title="All caught up" description="Nothing due. Come back tomorrow.">
        <Button asChild variant="secondary">
          <Link href="/">Back to library</Link>
        </Button>
      </EmptyState>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill">
          <div
            className="h-full rounded-full bg-accent-fill transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${(index / cards.length) * 100}%` }}
          />
        </div>
        <span className="text-footnote text-label-2 tabular-nums">
          {index + 1} of {cards.length}
        </span>
      </div>

      <Card className="flex min-h-72 flex-col gap-6 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <Badge>{card.kind}</Badge>
          <Link
            className="truncate text-footnote text-accent hover:underline hover:underline-offset-4"
            href={`/lectures/${card.lectureId}`}
          >
            {card.lectureTitle}
          </Link>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-label">{card.front}</p>
        {revealed ? (
          <div className="mt-auto space-y-5">
            <div className="rounded-2xl bg-surface-2 p-5 text-headline text-label">
              <Back text={card.back} />
            </div>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="How well did you recall it?">
              {RATINGS.map((r) => (
                <Button
                  key={r.value}
                  variant="secondary"
                  size="lg"
                  className={`px-2 ${r.tone}`}
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await rateCard(card.id, r.value);
                      setRevealed(false);
                      setIndex((i) => i + 1);
                    })
                  }
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <Button size="lg" className="mt-auto w-full" onClick={() => setRevealed(true)}>
            Show answer
          </Button>
        )}
      </Card>
    </div>
  );
}
