"use server";
import { revalidatePath } from "next/cache";
import { fsrs, Rating, type CardInput, type Grade } from "ts-fsrs";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const scheduler = fsrs({ enable_fuzz: true });

/** Schedules the next review with FSRS and logs the rating. */
export async function rateCard(cardId: string, rating: 1 | 2 | 3 | 4) {
  const id = z.string().uuid().parse(cardId);
  const grade = z.number().int().min(Rating.Again).max(Rating.Easy).parse(rating) as Grade;
  const { supabase } = await requireUser();
  const { data: card, error } = await supabase.from("flashcards").select("id, fsrs").eq("id", id).single();
  if (error) throw new Error(error.message);

  const { card: next } = scheduler.next(card.fsrs as CardInput, new Date(), grade);
  await supabase
    .from("flashcards")
    .update({ fsrs: next, due: next.due.toISOString() })
    .eq("id", id);
  await supabase.from("review_logs").insert({ flashcard_id: id, rating: grade, state: next });
  revalidatePath("/review");
}
