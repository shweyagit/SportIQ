-- Run this in your Supabase SQL editor
-- Safe to re-run — all statements use IF NOT EXISTS / CREATE OR REPLACE

-- 1. Add type column
ALTER TABLE sports_docs ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'narrative';

-- 2. Add fts (full-text search) column for BM25 hybrid retrieval
ALTER TABLE sports_docs ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- 3. GIN index on fts for fast full-text search
CREATE INDEX IF NOT EXISTS sports_docs_fts_idx ON sports_docs USING gin(fts);

-- 4. Pure vector similarity function (kept for fallback)
CREATE OR REPLACE FUNCTION match_sports_docs(
  query_embedding vector(1536),
  match_sport     text    DEFAULT NULL,
  match_count     int     DEFAULT 3,
  match_type      text    DEFAULT NULL
)
RETURNS TABLE(
  id         bigint,
  content    text,
  sport      text,
  type       text,
  metadata   jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.sport,
    d.type,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM sports_docs d
  WHERE
    (match_sport IS NULL OR d.sport = match_sport)
    AND (match_type IS NULL OR d.type = match_type)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Hybrid function — BM25 (full-text) + semantic (vector) via Reciprocal Rank Fusion
--    RRF score = 1/(60 + semantic_rank) + 1/(60 + bm25_rank)
--    The constant 60 is the standard RRF smoothing factor
CREATE OR REPLACE FUNCTION match_sports_docs_hybrid(
  query_embedding vector(1536),
  query_text      text,
  match_sport     text    DEFAULT NULL,
  match_count     int     DEFAULT 3,
  match_type      text    DEFAULT NULL
)
RETURNS TABLE(
  id         bigint,
  content    text,
  sport      text,
  type       text,
  metadata   jsonb,
  similarity float,
  bm25_rank  float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      d.id,
      d.content,
      d.sport,
      d.type,
      d.metadata,
      1 - (d.embedding <=> query_embedding)                              AS similarity,
      ts_rank(d.fts, plainto_tsquery('english', query_text))             AS bm25_rank,
      rank() OVER (ORDER BY d.embedding <=> query_embedding)             AS vec_rank,
      rank() OVER (ORDER BY ts_rank(d.fts, plainto_tsquery('english', query_text)) DESC) AS txt_rank
    FROM sports_docs d
    WHERE
      (match_sport IS NULL OR d.sport = match_sport)
      AND (match_type IS NULL OR d.type = match_type)
  )
  SELECT
    r.id,
    r.content,
    r.sport,
    r.type,
    r.metadata,
    r.similarity,
    r.bm25_rank
  FROM ranked r
  ORDER BY
    (1.0 / (60 + r.vec_rank)) + (1.0 / (60 + r.txt_rank)) DESC
  LIMIT match_count;
END;
$$;
