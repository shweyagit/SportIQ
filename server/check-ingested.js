require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data, count } = await supabase
    .from("sports_docs")
    .select("id, content, metadata, sport", { count: "exact" })
    .eq("metadata->>source", "sportsdb")
    .order("id", { ascending: false })
    .limit(5);

  console.log(`Total auto-ingested docs: ${count}`);
  console.log("---");
  if (!data || data.length === 0) {
    console.log("Nothing ingested yet");
    return;
  }
  data.forEach((d) => {
    console.log("Player:", d.metadata.playerName, "| Sport:", d.sport);
    console.log("Content:", d.content.slice(0, 200));
    console.log("---");
  });
})().catch(console.error);
