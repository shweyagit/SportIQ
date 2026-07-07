const { createClient } = require("@supabase/supabase-js");

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

// Contextual Retrieval — prepend a Claude-generated context summary to each chunk
// before embedding. This preserves the chunk's position and topic within the full
// document, dramatically improving retrieval accuracy.
// Uses Claude Haiku (fast + cheap) — runs once at ingest time, not at query time.
async function generateChunkContext(chunk) {
  if (!process.env.ANTHROPIC_KEY) return "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: `In 1-2 sentences, state what sport, player, and specific topic this chunk covers. Be precise — name the player and the exact subject (e.g. technique, stats, a specific match, a weakness).\n\nChunk:\n${chunk}`,
        }],
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.content[0].text.trim();
  } catch {
    return "";
  }
}

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

  // Contextual Retrieval: prepend Claude-generated context summary before embedding
  // The stored content stays as the original chunk — only the embedding uses the
  // contextualized version so retrieval is more accurate without bloating stored text
  const context = await generateChunkContext(content);
  const textToEmbed = context ? `Context: ${context}\n\n${content}` : content;

  const embedding = await embedText(textToEmbed);
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
