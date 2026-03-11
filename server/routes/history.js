const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// GET /api/history  (requires Authorization: Bearer <token>)
router.get("/", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Authorization header required" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid or expired token" });

  const { data, error } = await supabase
    .from("searches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ user_id: user.id, count: data.length, searches: data });
});

// DELETE /api/history/:id
router.delete("/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Authorization header required" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid or expired token" });

  const { error } = await supabase.from("searches").delete().eq("id", req.params.id).eq("user_id", user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Search deleted successfully" });
});

module.exports = router;
