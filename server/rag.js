const { createClient } = require("@supabase/supabase-js");

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

async function embedText(text) {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ model: "voyage-large-2", input: text }),
  });
  if (!res.ok) throw new Error(`Voyage AI embeddings error: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

async function storeDocument(content, metadata = {}, sport = "general", type = "narrative") {
  if (!supabase) throw new Error("Supabase not configured");
  if (!process.env.VOYAGE_API_KEY) throw new Error("VOYAGE_API_KEY not set");

  const embedding = await embedText(content);
  const { error } = await supabase
    .from("sports_docs")
    .insert({ content, metadata, sport, type, embedding });
  if (error) throw new Error(`Supabase insert error: ${error.message}`);
}

// Minimum similarity score to use a retrieved doc — below this, context is too weak to be useful
const SIMILARITY_THRESHOLD = 0.65;

// Returns { context, sources, belowThreshold } — context is injected into the prompt,
// sources are surfaced in the UI, belowThreshold signals when retrieval quality was poor.
// Uses hybrid retrieval: BM25 (exact keyword match) + semantic (vector similarity) via RRF.
async function retrieveContext(query, sport = null, type = null, limit = 3) {
  if (!supabase || !process.env.VOYAGE_API_KEY) return { context: "", sources: [], belowThreshold: false };

  try {
    const embedding = await embedText(query);
    const { data, error } = await supabase.rpc("match_sports_docs_hybrid", {
      query_embedding: embedding,
      query_text:      query,
      match_sport:     sport,
      match_count:     limit,
      match_type:      type,
    });
    if (error || !data?.length) return { context: "", sources: [], belowThreshold: false };

    // Log both scores for observability
    data.forEach(d => console.log(`[RAG] similarity=${d.similarity.toFixed(3)} bm25=${d.bm25_rank.toFixed(4)} type=${d.type} sport=${d.sport}`));

    // Filter out docs below quality threshold
    const qualified = data.filter(d => d.similarity >= SIMILARITY_THRESHOLD);

    if (!qualified.length) {
      console.log(`[RAG] All docs below threshold (${SIMILARITY_THRESHOLD}) — skipping context injection`);
      return { context: "", sources: [], belowThreshold: true };
    }

    console.log(`[RAG] ${qualified.length}/${data.length} docs passed threshold`);

    return {
      context: qualified.map((d) => d.content).join("\n\n---\n\n"),
      sources: qualified.map((d) => ({
        content:    d.content,
        snippet:    d.content.slice(0, 120) + "...",
        sport:      d.sport,
        type:       d.type,
        similarity: parseFloat(d.similarity.toFixed(3)),
        bm25_rank:  parseFloat((d.bm25_rank || 0).toFixed(4)),
      })),
      belowThreshold: false,
    };
  } catch {
    return { context: "", sources: [], belowThreshold: false };
  }
}

module.exports = { embedText, storeDocument, retrieveContext };
