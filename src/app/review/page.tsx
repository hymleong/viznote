import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ReviewQueue, type QueueCard } from "@/components/study/review-queue";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Daily review" };

/** One daily review queue across every module. */
export default async function ReviewPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("flashcards")
    .select("id, kind, front, back, lecture_id, lectures(title)")
    .lte("due", new Date().toISOString())
    .order("due")
    .limit(100);
  const cards: QueueCard[] = (data ?? []).map((c) => ({
    id: c.id as string,
    kind: c.kind as string,
    front: c.front as string,
    back: c.back as string,
    lectureId: c.lecture_id as string,
    lectureTitle: ((c.lectures as { title?: string } | null)?.title ?? "") as string,
  }));

  return (
    <main className="rise mx-auto w-full max-w-2xl space-y-8 px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <PageHeader
        eyebrow="Spaced repetition"
        title="Daily review"
        description={`${cards.length} card${cards.length === 1 ? "" : "s"} due`}
      />
      <ReviewQueue cards={cards} />
    </main>
  );
}
