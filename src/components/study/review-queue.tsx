"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { rateCard } from "@/app/study-actions";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
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
  { value: 1, label: "Again" },
  { value: 2, label: "Hard" },
  { value: 3, label: "Good" },
  { value: 4, label: "Easy" },
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

  if (!card) return <Card>Nothing due. Come back tomorrow.</Card>;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <Badge>{card.kind}</Badge>
        <span>
          {index + 1} / {cards.length} ·{" "}
          <Link className="hover:underline" href={`/lectures/${card.lectureId}`}>
            {card.lectureTitle}
          </Link>
        </span>
      </div>
      <p className="text-lg font-medium">{card.front}</p>
      {revealed ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60">
            <Back text={card.back} />
          </div>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="How well did you recall it?">
            {RATINGS.map((r) => (
              <Button
                key={r.value}
                variant={r.value === 1 ? "destructive" : "outline"}
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
        <Button onClick={() => setRevealed(true)}>Show answer</Button>
      )}
    </Card>
  );
}
