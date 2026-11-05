import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReviewQueue, type QueueCard } from "@/components/study/review-queue";

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
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <Link href="/" className="text-sm text-indigo-600 hover:underline">
        ← Modules
      </Link>
      <h1 className="text-2xl font-bold">Daily review</h1>
      <ReviewQueue cards={cards} />
    </main>
  );
}
