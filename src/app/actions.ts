"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { inngest, GENERATE_EVENT } from "@/inngest/client";

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createModule(formData: FormData) {
  const input = z
    .object({ code: z.string().trim().min(1).max(20), title: z.string().trim().min(1).max(200) })
    .parse({ code: formData.get("code"), title: formData.get("title") });
  const { supabase } = await requireUser();
  const { error } = await supabase.from("modules").insert(input);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteModule(moduleId: string) {
  const { supabase } = await requireUser();
  await supabase.from("modules").delete().eq("id", z.string().uuid().parse(moduleId));
  revalidatePath("/");
}

export async function createLecture(formData: FormData) {
  const input = z
    .object({ module_id: z.string().uuid(), title: z.string().trim().min(1).max(200) })
    .parse({ module_id: formData.get("moduleId"), title: formData.get("title") });
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("lectures").insert(input).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/lectures/${data.id}`);
}

export async function deleteLecture(lectureId: string, moduleId: string) {
  const { supabase } = await requireUser();
  await supabase.from("lectures").delete().eq("id", z.string().uuid().parse(lectureId));
  redirect(`/modules/${moduleId}`);
}

/** Registers an uploaded PDF. Identical re-uploads (same SHA-256) are skipped. */
export async function registerPdf(raw: {
  lectureId: string;
  filename: string;
  sha256: string;
  pageCount: number;
}) {
  const input = z
    .object({
      lectureId: z.string().uuid(),
      filename: z.string().min(1).max(300),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      pageCount: z.number().int().min(1).max(1000),
    })
    .parse(raw);
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("source_files")
    .select("id")
    .eq("lecture_id", input.lectureId)
    .eq("sha256", input.sha256)
    .maybeSingle();
  if (existing) return { duplicate: true as const, id: existing.id as string };

  const { data, error } = await supabase
    .from("source_files")
    .insert({
      lecture_id: input.lectureId,
      kind: "pdf",
      filename: input.filename,
      sha256: input.sha256,
      page_count: input.pageCount,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const prefix = `${user.id}/${input.lectureId}/${data.id}`;
  await supabase.from("source_files").update({ storage_path: `${prefix}/original.pdf` }).eq("id", data.id);
  return { duplicate: false as const, id: data.id as string, prefix };
}

const PageInput = z.object({
  page: z.number().int().min(1),
  text: z.string().max(50_000),
  thumbnailPath: z.string().nullable(),
  imagePath: z.string().nullable(),
  density: z.number(),
});

export async function savePages(raw: { sourceFileId: string; pages: z.infer<typeof PageInput>[] }) {
  const input = z.object({ sourceFileId: z.string().uuid(), pages: z.array(PageInput) }).parse(raw);
  const { supabase, user } = await requireUser();
  const own = (p: string | null) => (p && p.startsWith(`${user.id}/`) ? p : null);
  const { error } = await supabase.from("pages").upsert(
    input.pages.map((p) => ({
      source_file_id: input.sourceFileId,
      page_number: p.page,
      text: p.text,
      thumbnail_path: own(p.thumbnailPath),
      image_path: own(p.imagePath),
      text_density: p.density,
    })),
    { onConflict: "source_file_id,page_number" },
  );
  if (error) throw new Error(error.message);
}

/** Pasted text / Markdown: split on headings into pseudo-pages so citations still work. */
export async function addPastedText(formData: FormData) {
  const input = z
    .object({
      lectureId: z.string().uuid(),
      title: z.string().trim().min(1).max(200),
      text: z.string().trim().min(20).max(400_000),
    })
    .parse({ lectureId: formData.get("lectureId"), title: formData.get("title"), text: formData.get("text") });
  const { supabase } = await requireUser();
  const sha256 = createHash("sha256").update(input.text).digest("hex");
  const sections = input.text
    .split(/\n(?=#{1,3}\s)/)
    .flatMap((s) => (s.length > 4000 ? s.match(/[\s\S]{1,4000}/g) ?? [] : [s]))
    .map((s) => s.trim())
    .filter(Boolean);

  const { data: existing } = await supabase
    .from("source_files")
    .select("id")
    .eq("lecture_id", input.lectureId)
    .eq("sha256", sha256)
    .maybeSingle();
  if (!existing) {
    const { data: file, error } = await supabase
      .from("source_files")
      .insert({ lecture_id: input.lectureId, kind: "text", filename: input.title, sha256, page_count: sections.length })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: pErr } = await supabase.from("pages").insert(
      sections.map((text, i) => ({ source_file_id: file.id, page_number: i + 1, text, text_density: 1 })),
    );
    if (pErr) throw new Error(pErr.message);
  }
  revalidatePath(`/lectures/${input.lectureId}`);
}

/** Queues a new, versioned generation. Previous versions are kept. */
export async function startGeneration(lectureId: string) {
  const id = z.string().uuid().parse(lectureId);
  const { supabase, user } = await requireUser();
  const { count } = await supabase
    .from("source_files")
    .select("id", { count: "exact", head: true })
    .eq("lecture_id", id);
  if (!count) throw new Error("Upload a PDF or paste text first");

  const { data: last } = await supabase
    .from("generations")
    .select("version")
    .eq("lecture_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: gen, error } = await supabase
    .from("generations")
    .insert({ lecture_id: id, owner_id: user.id, version: (last?.version ?? 0) + 1 })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("lectures").update({ status: "processing" }).eq("id", id);
  await inngest.send({ name: GENERATE_EVENT, data: { lectureId: id, generationId: gen.id, ownerId: user.id } });
  revalidatePath(`/lectures/${id}`);
  return gen.id as string;
}
