-- Run this in your Supabase SQL editor before running seed.js
-- 1. Add type column to sports_docs
ALTER TABLE sports_docs ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'narrative';

-- 2. Update the match function to support filtering by type
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
    sports_docs.id,
    sports_docs.content,
    sports_docs.sport,
    sports_docs.type,
    sports_docs.metadata,
    1 - (sports_docs.embedding <=> query_embedding) AS similarity
  FROM sports_docs
  WHERE
    (match_sport IS NULL OR sports_docs.sport = match_sport)
    AND (match_type IS NULL OR sports_docs.type = match_type)
  ORDER BY sports_docs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
