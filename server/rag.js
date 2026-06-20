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

// Returns { context, sources } — context is injected into the prompt,
// sources are surfaced in the UI to prove RAG is working.
async function retrieveContext(query, sport = null, type = null, limit = 3) {
  if (!supabase || !process.env.VOYAGE_API_KEY) return { context: "", sources: [] };

  try {
    const embedding = await embedText(query);
    const { data, error } = await supabase.rpc("match_sports_docs", {
      query_embedding: embedding,
      match_sport: sport,
      match_count: limit,
      match_type: type,
    });
    if (error || !data?.length) return { context: "", sources: [] };
    return {
      context: data.map((d) => d.content).join("\n\n---\n\n"),
      sources: data.map((d) => ({
        snippet: d.content.slice(0, 120) + "...",
        sport: d.sport,
        type: d.type,
      })),
    };
  } catch {
    return { context: "", sources: [] };
  }
}

module.exports = { embedText, storeDocument, retrieveContext };
