import { useState } from "react";

// ─── SPORTS CONFIG ───────────────────────────────────────────────────────────

const SPORTS = {
  football: {
    label: "Football", emoji: "⚽", color: "#00ff87",
    suggestions: ["Who would win: Peak Messi vs Peak Ronaldo in a one-on-one?", "Could Guardiola's City beat any club in history?", "Is the Premier League ruining international football?", "Which footballer has the highest football IQ ever?", "Would Ronaldinho thrive in modern football?"],
    analystA: { Role: "Tactical Analyst", accent: "#00ff87", bg: "#0a1a12", persona: "A sharp tactical football analyst. Focus on formations, pressing systems, positional play, tactical patterns. Reference managers like Guardiola, Klopp, Ancelotti. Be confident, analytical, opinionated. Max 4 sentences." },
    analystB: { Role: "Data & Stats", accent: "#ff6b35", bg: "#1a0f0a", persona: "A data-driven football analyst. Focus on xG, statistics, player metrics, historical data. Challenge conventional wisdom with numbers. Be precise, contrarian. Max 4 sentences." },
  },
  cricket: {
    label: "Cricket", emoji: "🏏", color: "#4fc3f7",
    suggestions: ["Could Tendulkar average 60 in today's T20-obsessed era?", "Is Kohli mentally the toughest batter ever?", "Which is harder — facing Warne or Murali on a turning track?", "Would the 2007 World T20 team beat the 2024 T20 World Cup winners?", "Is DRS killing the art of umpiring?"],
    analystA: { Role: "Technique Analyst", accent: "#4fc3f7", bg: "#0a1218", persona: "A cricket technique analyst. Focus on batting technique, bowling actions, footwork, shot selection, pitch reading. Reference legends like Tendulkar, Lara, McGrath. Be insightful and technical. Max 4 sentences." },
    analystB: { Role: "Stats & Strategy", accent: "#e040fb", bg: "#140a18", persona: "A cricket statistician and strategist. Focus on batting averages, strike rates, bowling economy, match situations, team selection strategy. Use data to challenge popular opinions. Max 4 sentences." },
  },
  tennis: {
    label: "Tennis", emoji: "🎾", color: "#ffd700",
    suggestions: ["Could peak Federer beat Djokovic on any surface?", "Is Sinner already better than a young Federer?", "Would Serena Williams beat a top-10 men's player?", "Is clay the ultimate test of a true tennis champion?", "Which Slam is the hardest to win — and why?"],
    analystA: { Role: "Game Analyst", accent: "#ffd700", bg: "#181200", persona: "A tennis game analyst. Focus on playing styles, court tactics, serve-return patterns, mental game, surface adaptation. Reference Federer, Nadal, Djokovic techniques. Be precise and tactical. Max 4 sentences." },
    analystB: { Role: "Stats & History", accent: "#ff4081", bg: "#180008", persona: "A tennis historian and statistician. Focus on Slam records, head-to-head stats, ranking history, era comparisons. Use historical data to back arguments. Be opinionated and evidence-driven. Max 4 sentences." },
  }
};

//─── API HELPERS ─────────────────────────────────────────────────────────────

async function askClaude(prompt, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  console.log("API Response:", data);
  return data.content[0].text;
}

async function getPlayerImage(name) {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
    const data = await res.json();
    console.log("Wiki image data:", data.title, data.thumbnail, data.originalimage);
    // Prefer originalimage (full res, no URL hacking needed), fall back to upscaled thumbnail
    if (data.originalimage?.source) return data.originalimage.source;
    const thumb = data.thumbnail?.source;
    if (!thumb) return null;
    return thumb.replace(/\/\d+px-/, "/400px-");
  } catch { return null; }
}

// ─── SHARED UI ───────────────────────────────────────────────────────────────

function LoadDots({ color }) {
  return (
    <div style={{ display: "flex", gap: "6px", padding: "12px 0" }}>
      {[0,1,2].map(i => <div key={i} style={{ width:"7px", height:"7px", borderRadius:"50%", background:color, animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
    </div>
  );
}

function PlayerAvatar({ image, name, size=80 }) {
  const [err, setErr] = useState(false);
  return (!image || err)
    ? <div style={{ width:size, height:size, background:"#111", borderRadius:"4px", border:"1px solid #1f1f1f", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, color:"#333", flexShrink:0 }}>👤</div>
    : <img src={image} alt={name} onError={() => setErr(true)} style={{ width:size, height:size, objectFit:"cover", objectPosition:"top", borderRadius:"4px", display:"block", flexShrink:0 }}/>;
}

const L = { fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#333", letterSpacing:"3px", marginBottom:"12px", textTransform:"uppercase" };
const SB = (color) => ({ background:color||"#fff", border:"none", padding:"14px 26px", color:"#000", fontFamily:"'Space Mono',monospace", fontSize:"10px", letterSpacing:"2px", fontWeight:"700", cursor:"pointer", whiteSpace:"nowrap", borderRadius:"0 4px 4px 0", transition:"opacity 0.2s" });
const IS = { background:"#0e0e0e", border:"1px solid #1f1f1f", borderRadius:"4px", padding:"14px 18px", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", outline:"none" };

// ─── DUAL ANALYST ────────────────────────────────────────────────────────────

function DualAnalyst({ sport }) {
  const [q, setQ] = useState(""); const [rA, setRA] = useState(""); const [rB, setRB] = useState("");
  const [lA, setLA] = useState(false); const [lB, setLB] = useState(false);
  const [hist, setHist] = useState([]);
  const { analystA: aA, analystB: aB, suggestions, color } = sport;

  const ask = async (query) => {
    const qry = query || q; if (!qry.trim()) return;
    setRA(""); setRB(""); setLA(true); setLB(true);
    setHist(p => [{question:qry, time:new Date().toLocaleTimeString()}, ...p.slice(0,4)]);
    try {
      const [a,b] = await Promise.all([askClaude(qry, aA.persona), askClaude(qry, aB.persona)]);
      setRA(a); setRB(b);
    } catch { setRA("Connection error."); setRB("Connection error."); }
    setLA(false); setLB(false); setQ("");
  };

  return (
    <div>
      <div style={L}>Ask the Analysts</div>
      <div style={{ display:"flex", border:"1px solid #1f1f1f", borderRadius:"4px", overflow:"hidden", marginBottom:"12px" }}>
        <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()} placeholder={`Ask anything about ${sport.label.toLowerCase()}...`} style={{ flex:1, background:"#0e0e0e", border:"none", padding:"14px 18px", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", outline:"none", borderRadius:"4px 0 0 4px" }}/>
        <button onClick={()=>ask()} style={SB(color)}>ANALYSE →</button>
      </div>
      <div style={{ display:"flex", gap:"8px", marginBottom:"28px", flexWrap:"wrap" }}>
        {suggestions.map((s,i) => (
          <button key={i} onClick={()=>ask(s)} style={{ background:"transparent", border:"1px solid #1a1a1a", borderRadius:"20px", padding:"6px 14px", color:"#555", fontFamily:"'DM Sans',sans-serif", fontSize:"11px", cursor:"pointer", transition:"all 0.2s" }}>{s}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:"16px", marginBottom:"28px" }}>
        {[{a:aA,r:rA,l:lA,side:"left"},{a:aB,r:rB,l:lB,side:"right"}].map(({a,r,l,side}) => (
          <div key={a.Role} style={{ flex:1, background:a.bg, border:`1px solid ${a.accent}22`, borderRadius:"8px", padding:"24px", position:"relative", minHeight:"240px", display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:`linear-gradient(90deg,${a.accent},${a.accent}00)` }}/>
            <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"28px", color:a.accent, letterSpacing:"4px" }}>{a.Role}</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:a.accent+"77", letterSpacing:"2px", marginBottom:"14px" }}>ANALYST</div>
            <div style={{ height:"1px", background:`linear-gradient(90deg,${a.accent}33,transparent)`, marginBottom:"16px" }}/>
            {l ? <LoadDots color={a.accent}/> : r ? <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", lineHeight:"1.9", color:"#ccc", margin:0 }}>{r}</p> : <p style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:a.accent+"22", margin:0 }}>AWAITING QUERY...</p>}
          </div>
        ))}
      </div>
      {hist.length>0 && (
        <div>
          <div style={L}>Recent Queries</div>
          {hist.map((h,i) => (
            <div key={i} onClick={()=>ask(h.question)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", background:"#0c0c0c", border:"1px solid #161616", borderRadius:"6px", marginBottom:"6px", cursor:"pointer", transition:"border-color 0.2s" }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:"#555" }}>{h.question}</span>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#2a2a2a" }}>{h.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PLAYER PROFILE ──────────────────────────────────────────────────────────

function PlayerProfile({ sport }) {
  const [s, setS] = useState(""); const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null); const [image, setImage] = useState(null);
  const { color, label } = sport;

  const search = async () => {
    if (!s.trim()) return; setLoading(true); setProfile(null); setImage(null);
    try {
      const data = await askClaude(`Profile of ${s} as a ${label} player.`, `You are a ${label} encyclopedia. Respond ONLY with raw JSON (no markdown, no backticks): {"name":"full name","nationality":"country","position":"position or role","currentTeam":"current team or retired","age":"age","careerSummary":"2-3 sentence summary","achievements":["a1","a2","a3","a4"],"keyStats":["s1","s2","s3"],"legacyQuote":"one punchy sentence on legacy"}`);
      const parsed = JSON.parse(data.replace(/```json|```/g,"").trim());
      setProfile(parsed);
      // Use the canonical full name Claude returned for a more accurate Wikipedia lookup
      const img = await getPlayerImage(parsed.name);
      setImage(img);
    } catch { setProfile({error:"Could not load profile."}); }
    setLoading(false);
  };

  return (
    <div>
      <div style={L}>Search {label} Player</div>
      <div style={{ display:"flex", border:"1px solid #1f1f1f", borderRadius:"4px", overflow:"hidden", marginBottom:"32px" }}>
        <input value={s} onChange={e=>setS(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder={`e.g. ${label==="Cricket"?"Virat Kohli":label==="Tennis"?"Roger Federer":"Lionel Messi"}`} style={{ flex:1, background:"#0e0e0e", border:"none", padding:"14px 18px", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", outline:"none" }}/>
        <button onClick={search} style={SB(color)}>SEARCH →</button>
      </div>
      {loading && <LoadDots color={color}/>}
      {profile&&!profile.error&&(
        <div style={{ animation:"fadeIn 0.4s ease" }}>
          <div style={{ display:"flex", gap:"0", marginBottom:"20px", background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:"10px", overflow:"hidden" }}>
            {/* Large photo panel */}
            <div style={{ width:"180px", flexShrink:0, background:"#0a0a0a", position:"relative" }}>
              {image
                ? <img src={image} alt={profile.name} onError={e => { e.target.style.display="none"; e.target.nextElementSibling.style.display="flex"; }} style={{ width:"100%", height:"100%", minHeight:"220px", objectFit:"cover", objectPosition:"top", display:"block" }}/>
                : null}
              <div style={{ display: image ? "none" : "flex", width:"100%", minHeight:"220px", alignItems:"center", justifyContent:"center", fontSize:"52px", color:"#1f1f1f" }}>👤</div>
              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"60px", background:"linear-gradient(transparent,#0d0d0d)" }}/>
            </div>
            {/* Info panel */}
            <div style={{ flex:1, padding:"24px 26px" }}>
              <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"36px", color:"#fff", letterSpacing:"3px", lineHeight:1 }}>{profile.name}</div>
              <div style={{ display:"flex", gap:"8px", marginTop:"10px", flexWrap:"wrap" }}>
                {[profile.nationality,profile.position,profile.currentTeam,`Age: ${profile.age}`].map((item,i) => (
                  <span key={i} style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#555", letterSpacing:"1px", background:"#161616", padding:"5px 10px", borderRadius:"20px", border:"1px solid #222" }}>{item}</span>
                ))}
              </div>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:"#888", lineHeight:"1.8", margin:"14px 0 0" }}>{profile.careerSummary}</p>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
            <div style={{ background:"#0d0d0d", border:`1px solid ${color}22`, borderRadius:"10px", padding:"20px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color, letterSpacing:"2px", marginBottom:"12px" }}>ACHIEVEMENTS</div>
              {profile.achievements?.map((a,i) => (
                <div key={i} style={{ display:"flex", gap:"10px", marginBottom:"9px", alignItems:"flex-start" }}>
                  <span style={{ color, fontSize:"10px", marginTop:"2px" }}>▸</span>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:"#aaa", lineHeight:"1.6" }}>{a}</span>
                </div>
              ))}
            </div>
            <div style={{ background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:"10px", padding:"20px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#555", letterSpacing:"2px", marginBottom:"12px" }}>KEY STATS</div>
              {profile.keyStats?.map((s,i) => (
                <div key={i} style={{ display:"flex", gap:"10px", marginBottom:"9px", alignItems:"flex-start" }}>
                  <span style={{ color:"#555", fontSize:"10px", marginTop:"2px" }}>▸</span>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:"#aaa", lineHeight:"1.6" }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop:"16px", background:"#0e0e0e", border:`1px solid ${color}18`, borderRadius:"10px", padding:"20px 24px" }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#333", letterSpacing:"2px", marginBottom:"8px" }}>LEGACY</div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:"#777", fontStyle:"italic", margin:0, lineHeight:"1.7" }}>"{profile.legacyQuote}"</p>
          </div>
        </div>
      )}
      {profile?.error&&<p style={{ color:"#ff6b35", fontFamily:"'Space Mono',monospace", fontSize:"11px" }}>{profile.error}</p>}
    </div>
  );
}

// ─── HEAD TO HEAD ────────────────────────────────────────────────────────────

function HeadToHead({ sport }) {
  const [p1,setP1]=useState(""); const [p2,setP2]=useState("");
  const [loading,setLoading]=useState(false); const [result,setResult]=useState(null); const [imgs,setImgs]=useState([null,null]);
  const { color, label, analystA: aA, analystB: aB } = sport;

  const compare = async () => {
    if (!p1.trim()||!p2.trim()) return; setLoading(true); setResult(null); setImgs([null,null]);
    try {
      const data = await askClaude(`Compare ${p1} vs ${p2} as ${label} players.`, `You are a ${label} analyst. Respond ONLY with raw JSON (no markdown): {"player1":{"name":"${p1}","strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"rating":"X/10","summary":"2 sentences"},"player2":{"name":"${p2}","strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"rating":"X/10","summary":"2 sentences"},"verdict":"2-3 sentence verdict","winner":"name"}`);
      const parsed = JSON.parse(data.replace(/```json|```/g,"").trim());
      setResult(parsed);
      // Use canonical names from Claude's response for accurate Wikipedia image lookup
      const [img1,img2] = await Promise.all([getPlayerImage(parsed.player1.name), getPlayerImage(parsed.player2.name)]);
      setImgs([img1,img2]);
    } catch { setResult({error:"Comparison failed."}); }
    setLoading(false);
  };

  const colors = [aA.accent, aB.accent];
  const bgs = [aA.bg, aB.bg];

  return (
    <div>
      <div style={L}>Compare Two {label} Players</div>
      <div style={{ display:"flex", gap:"12px", marginBottom:"32px", alignItems:"center" }}>
        <input value={p1} onChange={e=>setP1(e.target.value)} placeholder="Player 1" style={{...IS, flex:1, borderRadius:"4px"}} onKeyDown={e=>e.key==="Enter"&&compare()}/>
        <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"24px", color:"#2a2a2a", padding:"0 4px" }}>VS</div>
        <input value={p2} onChange={e=>setP2(e.target.value)} placeholder="Player 2" style={{...IS, flex:1, borderRadius:"4px"}} onKeyDown={e=>e.key==="Enter"&&compare()}/>
        <button onClick={compare} style={{...SB(color), borderRadius:"4px"}}>COMPARE →</button>
      </div>
      {loading&&<LoadDots color={color}/>}
      {result&&!result.error&&(
        <div style={{ animation:"fadeIn 0.4s ease" }}>
          <div style={{ display:"flex", gap:"16px", marginBottom:"16px" }}>
            {[{p:result.player1,img:imgs[0],c:colors[0],bg:bgs[0]},{p:result.player2,img:imgs[1],c:colors[1],bg:bgs[1]}].map(({p,img,c,bg}) => (
              <div key={p.name} style={{ flex:1, background:bg, border:`1px solid ${c}22`, borderRadius:"10px", padding:"22px", overflow:"hidden", position:"relative" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:`linear-gradient(90deg,${c},${c}00)` }}/>
                <div style={{ display:"flex", gap:"16px", marginBottom:"16px", alignItems:"center" }}>
                  <PlayerAvatar image={img} name={p.name} size={72}/>
                  <div>
                    <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"24px", color:c, letterSpacing:"3px" }}>{p.name}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"18px", color:c, marginTop:"4px", fontWeight:"700" }}>{p.rating}</div>
                  </div>
                </div>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:"#777", lineHeight:"1.8", margin:"0 0 16px" }}>{p.summary}</p>
                <div style={{ marginBottom:"12px" }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:c+"88", letterSpacing:"2px", marginBottom:"6px" }}>STRENGTHS</div>
                  {p.strengths?.map((s,i) => <div key={i} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"11px", color:"#aaa", marginBottom:"4px" }}>+ {s}</div>)}
                </div>
                <div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:"#ff444488", letterSpacing:"2px", marginBottom:"6px" }}>WEAKNESSES</div>
                  {p.weaknesses?.map((w,i) => <div key={i} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"11px", color:"#555", marginBottom:"4px" }}>− {w}</div>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:"#0e0e0e", border:`1px solid ${color}18`, borderRadius:"10px", padding:"20px 24px" }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#333", letterSpacing:"2px", marginBottom:"8px" }}>VERDICT</div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:"#888", margin:"0 0 12px", lineHeight:"1.8" }}>{result.verdict}</p>
            <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"16px", color:"#fff", letterSpacing:"3px" }}>WINNER: <span style={{ color }}>{result.winner}</span></div>
          </div>
        </div>
      )}
      {result?.error&&<p style={{ color:"#ff6b35", fontFamily:"'Space Mono',monospace", fontSize:"11px" }}>{result.error}</p>}
    </div>
  );
}

// ─── TIMELINE ────────────────────────────────────────────────────────────────

function Timeline({ sport }) {
  const [s,setS]=useState(""); const [loading,setLoading]=useState(false);
  const [timeline,setTimeline]=useState(null); const [image,setImage]=useState(null);
  const { color, label } = sport;
  const typeColor={debut:"#00ff87",transfer:"#4fc3f7",trophy:"#ffd700",milestone:"#ff6b35",retirement:"#888"};
  const typeIcon={debut:"🌟",transfer:"✈️",trophy:"🏆",milestone:"📊",retirement:"🎓"};

  const search = async () => {
    if (!s.trim()) return; setLoading(true); setTimeline(null); setImage(null);
    try {
      const data = await askClaude(`Career timeline of ${s} in ${label}.`, `You are a ${label} historian. Respond ONLY with raw JSON (no markdown): {"name":"player name","events":[{"year":"YYYY","event":"short description","type":"debut|transfer|trophy|milestone|retirement"}]} Include 6-10 key career moments. For cricket/tennis use transfer type for team/tour changes.`);
      const parsed = JSON.parse(data.replace(/```json|```/g,"").trim());
      setTimeline(parsed);
      const img = await getPlayerImage(parsed.name);
      setImage(img);
    } catch { setTimeline({error:"Could not load timeline."}); }
    setLoading(false);
  };

  return (
    <div>
      <div style={L}>Career Timeline</div>
      <div style={{ display:"flex", border:"1px solid #1f1f1f", borderRadius:"4px", overflow:"hidden", marginBottom:"32px" }}>
        <input value={s} onChange={e=>setS(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder={`e.g. ${label==="Cricket"?"Sachin Tendulkar":label==="Tennis"?"Serena Williams":"Cristiano Ronaldo"}`} style={{ flex:1, background:"#0e0e0e", border:"none", padding:"14px 18px", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", outline:"none" }}/>
        <button onClick={search} style={SB(color)}>TIMELINE →</button>
      </div>
      {loading&&<LoadDots color={color}/>}
      {timeline&&!timeline.error&&(
        <div style={{ animation:"fadeIn 0.4s ease" }}>
          <div style={{ display:"flex", gap:"0", marginBottom:"30px", background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:"10px", overflow:"hidden" }}>
            <div style={{ width:"120px", flexShrink:0, background:"#0a0a0a", position:"relative" }}>
              {image
                ? <img src={image} alt={timeline.name} onError={e => { e.target.style.display="none"; e.target.nextElementSibling.style.display="flex"; }} style={{ width:"100%", height:"100%", minHeight:"140px", objectFit:"cover", objectPosition:"top", display:"block" }}/>
                : null}
              <div style={{ display: image ? "none" : "flex", width:"100%", minHeight:"140px", alignItems:"center", justifyContent:"center", fontSize:"40px", color:"#1f1f1f" }}>👤</div>
              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"40px", background:"linear-gradient(transparent,#0d0d0d)" }}/>
            </div>
            <div style={{ flex:1, padding:"20px 24px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
              <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"32px", color:"#fff", letterSpacing:"4px" }}>{timeline.name}</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#333", letterSpacing:"2px", marginTop:"4px" }}>CAREER TIMELINE</div>
            </div>
          </div>
          <div style={{ position:"relative", paddingLeft:"42px" }}>
            <div style={{ position:"absolute", left:"15px", top:0, bottom:0, width:"1px", background:"linear-gradient(180deg,#1a1a1a,transparent)" }}/>
            {timeline.events?.map((e,i) => {
              const c = typeColor[e.type]||"#fff";
              return (
                <div key={i} style={{ position:"relative", marginBottom:"16px", animation:`fadeIn 0.4s ease ${i*0.06}s both` }}>
                  <div style={{ position:"absolute", left:"-32px", top:"50%", transform:"translateY(-50%)", width:"12px", height:"12px", borderRadius:"50%", background:c, boxShadow:`0 0 10px ${c}66` }}/>
                  <div style={{ background:"#0d0d0d", border:`1px solid ${c}1a`, borderRadius:"8px", padding:"14px 18px", display:"flex", gap:"16px", alignItems:"flex-start" }}>
                    <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"22px", color:c, letterSpacing:"2px", minWidth:"56px" }}>{e.year}</div>
                    <div style={{ flex:1 }}>
                      <span style={{ marginRight:"8px" }}>{typeIcon[e.type]}</span>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:"#bbb", lineHeight:"1.7" }}>{e.event}</span>
                    </div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:c+"55", letterSpacing:"1px", textTransform:"uppercase", paddingTop:"4px" }}>{e.type}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {timeline?.error&&<p style={{ color:"#ff6b35", fontFamily:"'Space Mono',monospace", fontSize:"11px" }}>{timeline.error}</p>}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

const TABS = [
  { id:"dual",     label:"Dual Analyst",   icon:"⚡" },
  { id:"profile",  label:"Player Profile", icon:"👤" },
  { id:"h2h",      label:"Head to Head",   icon:"⚔️" },
  { id:"timeline", label:"Timeline",       icon:"📅" },
];

const BG_PRESETS = ["#080808","#0a0a1a","#0d0a14","#0a1410","#1a0a0a","#0d0d0d","#111827"];

export default function App() {
  const [sportKey, setSportKey] = useState("football");
  const [tab, setTab] = useState("dual");
  const [bgColor, setBgColor] = useState("#080808");
  const sport = SPORTS[sportKey];

  const handleSportChange = (key) => { setSportKey(key); setTab("dual"); };

  return (
    <div style={{ minHeight:"100vh", background:bgColor, display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
        * { box-sizing:border-box; } input{outline:none;} button{cursor:pointer;}
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#0a0a0a; } ::-webkit-scrollbar-thumb { background:#222; border-radius:2px; }
      `}</style>

      {/* ── Top Header ── */}
      <div style={{ borderBottom:"1px solid #111", padding:"0 28px", background:"#040404", display:"flex", alignItems:"center", justifyContent:"space-between", height:"58px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ width:"32px", height:"32px", background:`linear-gradient(135deg,${sport.analystA.accent},${sport.analystB.accent})`, borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", transition:"background 0.4s", flexShrink:0 }}>{sport.emoji}</div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"22px", color:"#fff", letterSpacing:"5px", lineHeight:1 }}>SportIQ</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"7px", color:"#2a2a2a", letterSpacing:"3px" }}>AI SPORTS PLATFORM</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#00ff87", boxShadow:"0 0 6px #00ff8788" }}/>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#2a2a2a", letterSpacing:"2px" }}>POWERED BY CLAUDE</div>
        </div>
      </div>

      {/* ── Body: Sidebar + Content ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{ width:"220px", borderRight:"1px solid #111", background:"#040404", display:"flex", flexDirection:"column", flexShrink:0, padding:"24px 0" }}>

          {/* Sport Selector */}
          <div style={{ padding:"0 16px", marginBottom:"8px" }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:"#555", letterSpacing:"3px", marginBottom:"12px", paddingLeft:"4px" }}>SPORT</div>
            {Object.entries(SPORTS).map(([key, s]) => {
              const isActive = sportKey === key;
              return (
                <button key={key} onClick={() => handleSportChange(key)} style={{
                  width:"100%", background: isActive ? s.color+"12" : "transparent",
                  border: `1px solid ${isActive ? s.color+"40" : "transparent"}`,
                  borderRadius:"8px", padding:"10px 14px", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:"10px", marginBottom:"4px",
                  transition:"all 0.2s", textAlign:"left"
                }}>
                  <span style={{ fontSize:"18px" }}>{s.emoji}</span>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", letterSpacing:"2px", color: isActive ? s.color : "#fff" }}>{s.label.toUpperCase()}</span>
                  {isActive && <div style={{ marginLeft:"auto", width:"5px", height:"5px", borderRadius:"50%", background:s.color }}/>}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height:"1px", background:"#111", margin:"16px 16px 20px" }}/>

          {/* Tab Navigation */}
          <div style={{ padding:"0 16px", flex:1 }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:"#555", letterSpacing:"3px", marginBottom:"12px", paddingLeft:"4px" }}>FEATURES</div>
            {TABS.map(t => {
              const isActive = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  width:"100%", background: isActive ? sport.color+"10" : "transparent",
                  border: `1px solid ${isActive ? sport.color+"30" : "transparent"}`,
                  borderRadius:"8px", padding:"11px 14px", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:"10px", marginBottom:"4px",
                  transition:"all 0.2s", textAlign:"left"
                }}>
                  <span style={{ fontSize:"14px" }}>{t.icon}</span>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", letterSpacing:"1px", color: isActive ? sport.color : "#fff" }}>{t.label.toUpperCase()}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom accent */}
          <div style={{ padding:"16px", marginTop:"auto" }}>
            {/* Background color picker */}
            <div style={{ marginBottom:"12px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:"#222", letterSpacing:"3px", marginBottom:"10px", paddingLeft:"4px" }}>BACKGROUND</div>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"8px" }}>
                {BG_PRESETS.map(c => (
                  <button key={c} onClick={() => setBgColor(c)} style={{ width:"22px", height:"22px", borderRadius:"50%", background:c, border: bgColor===c ? `2px solid ${sport.color}` : "2px solid #333", cursor:"pointer", transition:"border 0.2s" }}/>
                ))}
                <label style={{ width:"22px", height:"22px", borderRadius:"50%", border:"2px solid #333", cursor:"pointer", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", title:"Custom" }}>
                  🎨
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ opacity:0, position:"absolute", width:"1px", height:"1px" }}/>
                </label>
              </div>
            </div>
            <div style={{ background:`${sport.color}08`, border:`1px solid ${sport.color}18`, borderRadius:"8px", padding:"12px 14px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:sport.color+"66", letterSpacing:"2px", marginBottom:"4px" }}>ACTIVE SPORT</div>
              <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"18px", color:sport.color, letterSpacing:"3px" }}>{sport.label.toUpperCase()}</div>
            </div>
          </div>
        </div>

        {/* ── Content Area ── */}
        <div style={{ flex:1, overflowY:"auto", background:bgColor }}>
          {/* Content header strip */}
          <div style={{ borderBottom:"1px solid #0f0f0f", padding:"18px 36px", display:"flex", alignItems:"center", gap:"12px", background:"#060606", position:"sticky", top:0, zIndex:10 }}>
            <span style={{ fontSize:"20px" }}>{TABS.find(t=>t.id===tab)?.icon}</span>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"20px", color:"#fff", letterSpacing:"3px" }}>{TABS.find(t=>t.id===tab)?.label.toUpperCase()}</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:"#555", letterSpacing:"2px" }}>{sport.label.toUpperCase()} · SPORTIQ</div>
            </div>
            <div style={{ marginLeft:"auto", height:"2px", flex:1, maxWidth:"120px", background:`linear-gradient(90deg,${sport.color}44,transparent)`, borderRadius:"1px" }}/>
          </div>

          {/* Main content — all tabs stay mounted to preserve state */}
          <div style={{ padding:"32px 36px", maxWidth:"900px" }}>
            <div style={{ display: tab==="dual"     ? "block" : "none" }}><DualAnalyst   key={sportKey} sport={sport}/></div>
            <div style={{ display: tab==="profile"  ? "block" : "none" }}><PlayerProfile key={sportKey} sport={sport}/></div>
            <div style={{ display: tab==="h2h"      ? "block" : "none" }}><HeadToHead    key={sportKey} sport={sport}/></div>
            <div style={{ display: tab==="timeline" ? "block" : "none" }}><Timeline      key={sportKey} sport={sport}/></div>
          </div>
        </div>
      </div>
    </div>
  );
}
