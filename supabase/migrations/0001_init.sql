-- Viznotes initial schema. Owner-only RLS on every table.
create extension if not exists vector;
create extension if not exists pgcrypto;

-- ───────────────────────── modules / lectures ─────────────────────────
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  code text not null,
  title text not null,
  created_at timestamptz not null default now()
);

create table public.lectures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  position int not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'processing', 'ready', 'failed')),
  current_generation_id uuid,
  created_at timestamptz not null default now()
);
create index on public.lectures (module_id);

-- ───────────────────────── sources ─────────────────────────
create table public.source_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  kind text not null check (kind in ('pdf', 'text', 'pptx', 'transcript', 'audio')),
  filename text not null,
  storage_path text,
  sha256 text not null,
  page_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (lecture_id, sha256)
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_file_id uuid not null references public.source_files(id) on delete cascade,
  page_number int not null,
  text text not null default '',
  thumbnail_path text,
  image_path text, -- higher-res render, only for diagram-heavy (low text density) pages
  text_density real not null default 0,
  unique (source_file_id, page_number)
);

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  source_file_id uuid not null references public.source_files(id) on delete cascade,
  page_start int not null,
  page_end int not null,
  content text not null,
  embedding vector(1024),
  fts tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now()
);
create index on public.chunks using hnsw (embedding vector_cosine_ops);
create index on public.chunks using gin (fts);
create index on public.chunks (lecture_id);

-- ───────────────────────── generations / blocks ─────────────────────────
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  version int not null,
  status text not null default 'queued'
    check (status in ('queued', 'ingesting', 'outlining', 'sections', 'synthesizing', 'linking', 'complete', 'failed')),
  progress jsonb not null default '{}'::jsonb,
  outline jsonb,
  document jsonb,
  model_usage jsonb not null default '[]'::jsonb,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (lecture_id, version)
);

alter table public.lectures
  add constraint lectures_current_generation_fk
  foreign key (current_generation_id) references public.generations(id) on delete set null;

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  generation_id uuid not null references public.generations(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  section_key text not null,
  section_title text not null,
  section_order int not null,
  position int not null,
  type text not null,
  data jsonb not null,
  sources jsonb not null default '[]'::jsonb,
  beyond_source boolean not null default false,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'edited')),
  -- versioning: regenerating inserts a new row pointing at the old one; nothing is discarded
  version int not null default 1,
  previous_block_id uuid references public.blocks(id) on delete set null,
  is_current boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.blocks (generation_id, section_order, position);

-- ───────────────────────── concepts ─────────────────────────
create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  name text not null,
  definition text not null default '',
  importance int not null default 2 check (importance between 1 and 3),
  embedding vector(1024),
  mastery real not null default 0,
  created_at timestamptz not null default now(),
  unique (lecture_id, name)
);

create table public.concept_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  from_concept_id uuid not null references public.concepts(id) on delete cascade,
  to_concept_id uuid not null references public.concepts(id) on delete cascade,
  relation text not null,
  scope text not null default 'lecture' check (scope in ('lecture', 'cross_lecture')),
  confidence real not null default 1,
  created_at timestamptz not null default now()
);

-- ───────────────────────── study ─────────────────────────
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete set null,
  block_id uuid references public.blocks(id) on delete set null,
  kind text not null check (kind in ('concept', 'formula', 'misconception')),
  front text not null,
  back text not null,
  sources jsonb not null default '[]'::jsonb,
  fsrs jsonb not null default '{}'::jsonb,
  due timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.flashcards (owner_id, due);

create table public.review_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  rating int not null check (rating between 1 and 4),
  state jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz not null default now()
);

create table public.quiz_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete set null,
  kind text not null check (kind in ('mcq', 'short')),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  answer text not null,
  explanation text not null default '',
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quiz_item_id uuid not null references public.quiz_items(id) on delete cascade,
  response text not null,
  correct boolean not null,
  feedback text not null default '',
  created_at timestamptz not null default now()
);

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scope text not null check (scope in ('lecture', 'module')),
  lecture_id uuid references public.lectures(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  allow_general_knowledge boolean not null default false,
  title text not null default 'New chat',
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ───────────────────────── RLS: owner-only on every table ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'modules', 'lectures', 'source_files', 'pages', 'chunks', 'generations', 'blocks',
    'concepts', 'concept_links', 'flashcards', 'review_logs', 'quiz_items',
    'quiz_attempts', 'chat_threads', 'chat_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())',
      t || '_owner_all', t
    );
  end loop;
end $$;

-- ───────────────────────── private storage ─────────────────────────
insert into storage.buckets (id, name, public)
values ('sources', 'sources', false)
on conflict (id) do nothing;

-- objects live under "<owner uid>/..."; only the owner can touch them
create policy "sources_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'sources' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sources_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'sources' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sources_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'sources' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sources_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'sources' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────────────────── realtime (progress streaming) ─────────────────────────
alter publication supabase_realtime add table public.generations, public.blocks;

-- ───────────────────────── retrieval helpers (RLS applies: security invoker) ─────────────────────────
create or replace function public.match_chunks(
  query_embedding vector(1024),
  match_count int default 8,
  p_lecture_id uuid default null,
  p_module_id uuid default null
) returns table (id uuid, lecture_id uuid, source_file_id uuid, page_start int, page_end int, content text, similarity float)
language sql stable security invoker as $$
  select c.id, c.lecture_id, c.source_file_id, c.page_start, c.page_end, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  join public.lectures l on l.id = c.lecture_id
  where c.embedding is not null
    and (p_lecture_id is null or c.lecture_id = p_lecture_id)
    and (p_module_id is null or l.module_id = p_module_id)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- token usage per generation (admin view); security_invoker keeps RLS in force
create view public.generation_usage with (security_invoker = true) as
  select g.id, g.lecture_id, l.title as lecture_title, g.version, g.status,
         g.input_tokens, g.output_tokens, g.cache_read_tokens, g.cache_write_tokens,
         g.model_usage, g.created_at, g.completed_at
  from public.generations g
  join public.lectures l on l.id = g.lecture_id;
