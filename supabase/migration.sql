-- Run this in the Supabase SQL Editor to set up the RAG knowledge base.

-- 1. Enable the pgvector extension (already available on all Supabase projects)
create extension if not exists vector;

-- 2. Create the sports knowledge base table
create table if not exists sports_docs (
  id          bigserial primary key,
  content     text        not null,
  metadata    jsonb       default '{}',
  sport       text        default 'general',
  embedding   vector(1536),             -- matches text-embedding-3-small dimensions
  created_at  timestamptz default now()
);

-- 3. Similarity search function (called via supabase.rpc)
create or replace function match_sports_docs(
  query_embedding vector(1536),
  match_sport     text    default null,
  match_count     int     default 3
)
returns table (
  id         bigint,
  content    text,
  metadata   jsonb,
  sport      text,
  similarity float
)
language sql stable
security definer
as $$
  select
    id,
    content,
    metadata,
    sport,
    1 - (embedding <=> query_embedding) as similarity
  from sports_docs
  where (match_sport is null or sport = match_sport)
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 4. IVFFlat index for fast approximate nearest-neighbour search
--    (populate the table with at least ~100 rows before this becomes useful)
create index if not exists sports_docs_embedding_idx
  on sports_docs
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 5. Optional: restrict direct table access to service-role only
--    (the match function uses security definer so anon/authed roles can call it)
alter table sports_docs enable row level security;
create policy "service role full access" on sports_docs
  using (auth.role() = 'service_role');

