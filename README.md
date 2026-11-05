# Viznotes

Upload lecture materials and get back a visual study page: concept maps, flow diagrams,
comparison tables, formula cards and "why this matters" notes. Every block cites the slide
it came from.

## Stack

Next.js 16 (App Router, strict TypeScript) · Tailwind 4 · Supabase (Postgres, Auth, private
Storage, pgvector, Realtime) · Inngest (background jobs) · Anthropic API (`claude-sonnet-5-5`
for outline and synthesis, `claude-haiku-5-5` for per-section work) · React Flow · Mermaid ·
KaTeX · Recharts · Shiki · Zod.

## Setup

1. Create a Supabase project and apply the migration (the schema is SQL only, no dashboard edits):

   ```bash
   npx supabase link --project-ref <ref>
   ```

   ```bash
   npx supabase db push
   ```

2. In Supabase Auth, enable the Email and Google providers. Add `<site>/auth/callback` as a redirect URL.
3. Copy `.env.example` to `.env.local` and fill it in. `VOYAGE_API_KEY` is optional. It enables chunk embeddings, because Anthropic has no embeddings endpoint.
4. Run the app and the Inngest dev server:

   ```bash
   npm run dev
   ```

   ```bash
   npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
   ```

Checks: `npx tsc --noEmit` and `npm run lint`.

## How generation works

`src/inngest/generate-lecture.ts`. Generation never runs inside a request handler.

1. **Ingest**: the browser hashes the file (identical re-uploads are skipped), extracts text per page with pdf.js and renders thumbnails. Pages with little text also get a 1280px image, so the model sees the diagram. The job then chunks per slide and embeds the chunks.
2. **Outline** (Sonnet): sections, key concepts, prerequisites, difficulty.
3. **Sections** (Haiku, in parallel): 1-3 blocks per section. The first call runs alone to warm the prompt cache.
4. **Synthesis** (Sonnet): tldr, lecture-wide concept map, insights, misconceptions, exam focus.
5. **Validate**: each block is checked with Zod plus semantic rules (`src/lib/blocks/validate.ts`). A failing block is retried once with the error messages, then dropped and logged.

The model only returns typed JSON (structured outputs; `src/lib/blocks/schema.ts`), never HTML.
The source material sits behind a byte-identical system prompt with a cache breakpoint, so every pass reads it from the cache. Each pass has an output-token cap. Usage per pass is recorded on `generations` and shown at `/admin/usage`.
Sonnet calls opt in to server-side refusal fallback (`fallbacks: "default"`).
Blocks are inserted as they are produced, and the lecture page subscribes over Realtime, so the page fills in block by block.

## Safety

- LLM output is rendered by typed components only.
- Mermaid runs with `securityLevel: "strict"` and `htmlLabels: false`, and its SVG is sanitised with DOMPurify.
- KaTeX runs with `trust: false`.
- Code is rendered from Shiki tokens as React text.
- Storage is private and served through signed URLs. Every table has owner-only RLS. API keys stay server-side.

## Status

| Phase | Item | State |
| --- | --- | --- |
| 1 | Auth (email link + Google), modules/lectures CRUD | Done |
| 1 | PDF upload (client-side pdf.js), pasted text/Markdown | Done |
| 1 | Pipeline steps 1-5, versioned generations, realtime progress | Done |
| 1 | Renderers for all 12 block types, citations to source viewer | Done |
| 2 | Review: approve / edit (JSON editor, validated) / regenerate with instruction / delete, all versioned | Done |
| 2 | Flashcards from concepts, formulas and misconceptions, FSRS (`ts-fsrs`), one daily queue at `/review` | Done |
| 2 | Quiz, Ask (RAG chat) | Not started (tables and `match_chunks` exist; tabs are placeholders) |
| 3 | Cross-lecture linking, module graph, revision mode, exports, PPTX/audio, search | Not started (concepts are stored per lecture; `chunks.fts` and the vector index exist) |
