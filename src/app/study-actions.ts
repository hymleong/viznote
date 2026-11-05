"use server";
import { revalidatePath } from "next/cache";
import { fsrs, Rating, type CardInput, type Grade } from "ts-fsrs";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const scheduler = fsrs({ enable_fuzz: true });

/** Grades an MCQ attempt and records it (attempts drive weak-concept tracking). */
export async function answerQuiz(itemId: string, response: string) {
  const id = z.string().uuid().parse(itemId);
  const text = z.string().max(2000).parse(response);
  const { supabase } = await requireUser();
  const { data: item, error } = await supabase
    .from("quiz_items")
    .select("answer, explanation, sources")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  const correct = text.trim().toLowerCase() === (item.answer as string).trim().toLowerCase();
  await supabase.from("quiz_attempts").insert({ quiz_item_id: id, response: text, correct, feedback: item.explanation });
  return { correct, answer: item.answer as string, explanation: item.explanation as string };
}

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
