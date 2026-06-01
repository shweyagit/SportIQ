const { createClient } = require("@supabase/supabase-js");

// Use service key for server-side reads/writes (bypasses RLS)
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

async function storeDocument(content, metadata = {}, sport = "general") {
  if (!supabase) throw new Error("Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY missing)");
  if (!process.env.VOYAGE_API_KEY) throw new Error("VOYAGE_API_KEY not set");

  const embedding = await embedText(content);
  const { error } = await supabase
    .from("sports_docs")
    .insert({ content, metadata, sport, embedding });
  if (error) throw new Error(`Supabase insert error: ${error.message}`);
}

// Returns a context string to inject into prompts, or "" if RAG is unavailable.
async function retrieveContext(query, sport = null, limit = 3) {
  if (!supabase || !process.env.VOYAGE_API_KEY) return "";

  try {
    const embedding = await embedText(query);
    const { data, error } = await supabase.rpc("match_sports_docs", {
      query_embedding: embedding,
      match_sport: sport,
      match_count: limit,
    });
    if (error || !data?.length) return "";
    return data.map((d) => d.content).join("\n\n---\n\n");
  } catch {
    return ""; // RAG is best-effort; fall back to Claude's parametric knowledge
  }
}

module.exports = { embedText, storeDocument, retrieveContext };
