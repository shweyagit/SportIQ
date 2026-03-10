import { useState } from "react";

// ─── SPORTS CONFIG ───────────────────────────────────────────────────────────

const SPORTS = {
  football: {
    label: "Football", emoji: "⚽", color: "#00ff87",
    suggestions: ["Is Mbappe worth his transfer fee?", "Messi or Ronaldo GOAT?", "Is Tiki-Taka dead?", "Will Arsenal win the PL?", "Best manager of the decade?"],
    analystA: { name: "ALEX", role: "Tactical Analyst", accent: "#00ff87", bg: "#0a1a12", persona: "You are Marco, a sharp tactical football analyst. Focus on formations, pressing systems, positional play, tactical patterns. Reference managers like Guardiola, Klopp, Ancelotti. Be confident, analytical, opinionated. Max 4 sentences." },
    analystB: { name: "PEP", role: "Data & Stats", accent: "#ff6b35", bg: "#1a0f0a", persona: "You are Sofia, a data-driven football analyst. Focus on xG, statistics, player metrics, historical data. Challenge conventional wisdom with numbers. Be precise, contrarian. Max 4 sentences." },
  },
  cricket: {
    label: "Cricket", emoji: "🏏", color: "#4fc3f7",
    suggestions: ["Kohli or Tendulkar — who is greater?", "Is Test cricket dying?", "Best T20 team of all time?", "Can England win the next Ashes?", "Greatest ODI innings ever?"],
    analystA: { name: "ANDY", role: "Technique Analyst", accent: "#4fc3f7", bg: "#0a1218", persona: "You are Ravi, a cricket technique analyst. Focus on batting technique, bowling actions, footwork, shot selection, pitch reading. Reference legends like Tendulkar, Lara, McGrath. Be insightful and technical. Max 4 sentences." },
    analystB: { name: "GARY", role: "Stats & Strategy", accent: "#e040fb", bg: "#140a18", persona: "You are Priya, a cricket statistician and strategist. Focus on batting averages, strike rates, bowling economy, match situations, team selection strategy. Use data to challenge popular opinions. Max 4 sentences." },
  },
  tennis: {
    label: "Tennis", emoji: "🎾", color: "#ffd700",
    suggestions: ["Federer, Nadal or Djokovic — the GOAT?", "Is Sinner the future of tennis?", "Best serve in history?", "Will anyone break Djokovic's Slam record?", "Clay vs Grass — hardest surface?"],
    analystA: { name: "GORAN", role: "Game Analyst", accent: "#ffd700", bg: "#181200", persona: "You are Alex, a tennis game analyst. Focus on playing styles, court tactics, serve-return patterns, mental game, surface adaptation. Reference Federer, Nadal, Djokovic techniques. Be precise and tactical. Max 4 sentences." },
    analystB: { name: "PATRICK", role: "Stats & History", accent: "#ff4081", bg: "#180008", persona: "You are Diana, a tennis historian and statistician. Focus on Slam records, head-to-head stats, ranking history, era comparisons. Use historical data to back arguments. Be opinionated and evidence-driven. Max 4 sentences." },
  }
};

// ─── API HELPERS ─────────────────────────────────────────────────────────────

async function askClaude(prompt, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: prompt }] })
  });
  const data = await res.json();
  return data.content[0].text;
}

async function getPlayerImage(name) {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
    const data = await res.json();
    return data.thumbnail?.source || null;
  } catch { return null; }
}

// ─── SHARED UI ───────────────────────────────────────────────────────────────

function LoadDots({ color }) {
  return (
    <div style={{ display: "flex", gap: "5px", padding: "10px 0" }}>
      {[0,1,2].map(i => <div key={i} style={{ width:"6px", height:"6px", borderRadius:"50%", background:color, animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
    </div>
  );
}

function PlayerAvatar({ image, name, size=80 }) {
  return image
    ? <img src={image} alt={name} style={{ width:size, height:size, objectFit:"cover", borderRadius:"2px", display:"block" }}/>
    : <div style={{ width:size, height:size, background:"#111", borderRadius:"2px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, color:"#333" }}>👤</div>;
}

function NavTab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ background:"none", border:"none", fontFamily:"'Space Mono',monospace", fontSize:"10px", letterSpacing:"2px", color:active?"#fff":"#444", borderBottom:active?"1px solid #fff":"1px solid transparent", padding:"10px 0", marginRight:"26px", cursor:"pointer", transition:"all 0.2s" }}>{label}</button>
  );
}

const L = { fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#333", letterSpacing:"3px", marginBottom:"10px" };
const SB = (color) => ({ background:color||"#fff", border:"none", padding:"14px 24px", color:"#000", fontFamily:"'Space Mono',monospace", fontSize:"10px", letterSpacing:"2px", fontWeight:"700", cursor:"pointer", whiteSpace:"nowrap" });
const IS = { background:"#0e0e0e", border:"1px solid #1f1f1f", borderRadius:"2px", padding:"14px 18px", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", outline:"none" };

// ─── SPORT SELECTOR ──────────────────────────────────────────────────────────

function SportSelector({ selected, onChange }) {
  return (
    <div style={{ display:"flex", gap:"10px", marginBottom:"28px" }}>
      {Object.entries(SPORTS).map(([key, sport]) => (
        <button key={key} onClick={() => onChange(key)} style={{
          background: selected===key ? sport.color+"18" : "transparent",
          border: `1px solid ${selected===key ? sport.color+"66" : "#1f1f1f"}`,
          borderRadius:"2px", padding:"10px 20px", cursor:"pointer",
          transition:"all 0.2s", display:"flex", alignItems:"center", gap:"8px"
        }}>
          <span style={{ fontSize:"18px" }}>{sport.emoji}</span>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", letterSpacing:"2px", color: selected===key ? sport.color : "#444" }}>{sport.label.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}

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
      <div style={L}>ASK THE ANALYSTS</div>
      <div style={{ display:"flex", border:"1px solid #1f1f1f", borderRadius:"2px", overflow:"hidden", marginBottom:"12px" }}>
        <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()} placeholder={`Ask anything about ${sport.label.toLowerCase()}...`} style={{ flex:1, background:"#0e0e0e", border:"none", padding:"14px 18px", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", outline:"none" }}/>
        <button onClick={()=>ask()} style={SB(color)}>ANALYSE →</button>
      </div>
      <div style={{ display:"flex", gap:"8px", marginBottom:"24px", flexWrap:"wrap" }}>
        {suggestions.map((s,i) => <button key={i} onClick={()=>ask(s)} style={{ background:"transparent", border:"1px solid #1a1a1a", borderRadius:"2px", padding:"5px 10px", color:"#444", fontFamily:"'DM Sans',sans-serif", fontSize:"11px", cursor:"pointer" }}>{s}</button>)}
      </div>
      <div style={{ display:"flex", gap:"14px", marginBottom:"24px" }}>
        {[{a:aA,r:rA,l:lA,side:"left"},{a:aB,r:rB,l:lB,side:"right"}].map(({a,r,l,side}) => (
          <div key={a.name} style={{ flex:1, background:a.bg, border:`1px solid ${a.accent}18`, borderRadius:"2px", padding:"22px", position:"relative", minHeight:"220px", display:"flex", flexDirection:"column" }}>
            <div style={{ position:"absolute", top:0, [side==="left"?"left":"right"]:0, width:"2px", height:"100%", background:a.accent }}/>
            <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"26px", color:a.accent, letterSpacing:"4px" }}>{a.name}</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:a.accent+"77", letterSpacing:"2px", marginBottom:"12px" }}>{a.role}</div>
            <div style={{ height:"1px", background:`linear-gradient(90deg,${a.accent}33,transparent)`, marginBottom:"14px" }}/>
            {l ? <LoadDots color={a.accent}/> : r ? <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", lineHeight:"1.8", color:"#ccc", margin:0 }}>{r}</p> : <p style={{ fontFamily:"'Space Mono',monospace", fontSize:"10px", color:a.accent+"22", margin:0 }}>AWAITING QUERY...</p>}
          </div>
        ))}
      </div>
      {hist.length>0 && <div><div style={L}>RECENT QUERIES</div>{hist.map((h,i) => <div key={i} onClick={()=>ask(h.question)} style={{ display:"flex", justifyContent:"space-between", padding:"9px 12px", background:"#0c0c0c", border:"1px solid #161616", borderRadius:"2px", marginBottom:"5px", cursor:"pointer" }}><span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:"#555" }}>{h.question}</span><span style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#333" }}>{h.time}</span></div>)}</div>}
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
      const [img, data] = await Promise.all([
        getPlayerImage(s),
        askClaude(`Profile of ${s} as a ${label} player.`, `You are a ${label} encyclopedia. Respond ONLY with raw JSON (no markdown, no backticks): {"name":"full name","nationality":"country","position":"position or role","currentTeam":"current team or retired","age":"age","careerSummary":"2-3 sentence summary","achievements":["a1","a2","a3","a4"],"keyStats":["s1","s2","s3"],"legacyQuote":"one punchy sentence on legacy"}`)
      ]);
      setImage(img);
      setProfile(JSON.parse(data.replace(/```json|```/g,"").trim()));
    } catch { setProfile({error:"Could not load profile."}); }
    setLoading(false);
  };

  return (
    <div>
      <div style={L}>SEARCH {label.toUpperCase()} PLAYER</div>
      <div style={{ display:"flex", border:"1px solid #1f1f1f", borderRadius:"2px", overflow:"hidden", marginBottom:"28px" }}>
        <input value={s} onChange={e=>setS(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder={`e.g. ${label==="Cricket"?"Virat Kohli":label==="Tennis"?"Roger Federer":"Lionel Messi"}`} style={{ flex:1, background:"#0e0e0e", border:"none", padding:"14px 18px", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", outline:"none" }}/>
        <button onClick={search} style={SB(color)}>SEARCH →</button>
      </div>
      {loading && <LoadDots color={color}/>}
      {profile&&!profile.error&&(
        <div style={{ animation:"fadeIn 0.4s ease" }}>
          <div style={{ display:"flex", gap:"22px", marginBottom:"22px", background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:"2px", padding:"22px" }}>
            <PlayerAvatar image={image} name={profile.name} size={96}/>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"32px", color:"#fff", letterSpacing:"3px", lineHeight:1 }}>{profile.name}</div>
              <div style={{ display:"flex", gap:"10px", marginTop:"8px", flexWrap:"wrap" }}>
                {[profile.nationality,profile.position,profile.currentTeam,`Age: ${profile.age}`].map((item,i) => <span key={i} style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#555", letterSpacing:"1px", background:"#111", padding:"4px 8px", borderRadius:"2px" }}>{item}</span>)}
              </div>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:"#888", lineHeight:"1.7", margin:"10px 0 0" }}>{profile.careerSummary}</p>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
            <div style={{ background:"#0d0d0d", border:`1px solid ${color}18`, borderRadius:"2px", padding:"18px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color, letterSpacing:"2px", marginBottom:"10px" }}>ACHIEVEMENTS</div>
              {profile.achievements?.map((a,i) => <div key={i} style={{ display:"flex", gap:"8px", marginBottom:"7px" }}><span style={{ color, fontSize:"10px" }}>▸</span><span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:"#aaa" }}>{a}</span></div>)}
            </div>
            <div style={{ background:"#0d0d0d", border:"1px solid #1f1f1f", borderRadius:"2px", padding:"18px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#888", letterSpacing:"2px", marginBottom:"10px" }}>KEY STATS</div>
              {profile.keyStats?.map((s,i) => <div key={i} style={{ display:"flex", gap:"8px", marginBottom:"7px" }}><span style={{ color:"#888", fontSize:"10px" }}>▸</span><span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:"#aaa" }}>{s}</span></div>)}
            </div>
          </div>
          <div style={{ marginTop:"14px", background:"#0e0e0e", border:"1px solid #1f1f1f", borderRadius:"2px", padding:"16px 22px" }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#333", letterSpacing:"2px", marginBottom:"6px" }}>LEGACY</div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", color:"#666", fontStyle:"italic", margin:0, lineHeight:"1.6" }}>"{profile.legacyQuote}"</p>
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
      const [img1,img2,data]=await Promise.all([
        getPlayerImage(p1), getPlayerImage(p2),
        askClaude(`Compare ${p1} vs ${p2} as ${label} players.`, `You are a ${label} analyst. Respond ONLY with raw JSON (no markdown): {"player1":{"name":"${p1}","strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"rating":"X/10","summary":"2 sentences"},"player2":{"name":"${p2}","strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"rating":"X/10","summary":"2 sentences"},"verdict":"2-3 sentence verdict","winner":"name"}`)
      ]);
      setImgs([img1,img2]);
      setResult(JSON.parse(data.replace(/```json|```/g,"").trim()));
    } catch { setResult({error:"Comparison failed."}); }
    setLoading(false);
  };

  const colors = [aA.accent, aB.accent];
  const bgs = [aA.bg, aB.bg];

  return (
    <div>
      <div style={L}>COMPARE TWO {label.toUpperCase()} PLAYERS</div>
      <div style={{ display:"flex", gap:"10px", marginBottom:"28px", alignItems:"center" }}>
        <input value={p1} onChange={e=>setP1(e.target.value)} placeholder={`Player 1`} style={{...IS, flex:1}} onKeyDown={e=>e.key==="Enter"&&compare()}/>
        <span style={{ fontFamily:"'Bebas Neue',serif", fontSize:"22px", color:"#333" }}>VS</span>
        <input value={p2} onChange={e=>setP2(e.target.value)} placeholder={`Player 2`} style={{...IS, flex:1}} onKeyDown={e=>e.key==="Enter"&&compare()}/>
        <button onClick={compare} style={SB(color)}>COMPARE →</button>
      </div>
      {loading&&<LoadDots color={color}/>}
      {result&&!result.error&&(
        <div style={{ animation:"fadeIn 0.4s ease" }}>
          <div style={{ display:"flex", gap:"14px", marginBottom:"14px" }}>
            {[{p:result.player1,img:imgs[0],c:colors[0],bg:bgs[0]},{p:result.player2,img:imgs[1],c:colors[1],bg:bgs[1]}].map(({p,img,c,bg}) => (
              <div key={p.name} style={{ flex:1, background:bg, border:`1px solid ${c}18`, borderRadius:"2px", padding:"20px" }}>
                <div style={{ display:"flex", gap:"14px", marginBottom:"14px", alignItems:"center" }}>
                  <PlayerAvatar image={img} name={p.name} size={68}/>
                  <div>
                    <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"22px", color:c, letterSpacing:"3px" }}>{p.name}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"16px", color:c, marginTop:"4px" }}>{p.rating}</div>
                  </div>
                </div>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:"#888", lineHeight:"1.7", margin:"0 0 12px" }}>{p.summary}</p>
                <div style={{ marginBottom:"8px" }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:c+"88", letterSpacing:"2px", marginBottom:"5px" }}>STRENGTHS</div>
                  {p.strengths?.map((s,i) => <div key={i} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"11px", color:"#aaa", marginBottom:"3px" }}>+ {s}</div>)}
                </div>
                <div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:"#ff444488", letterSpacing:"2px", marginBottom:"5px" }}>WEAKNESSES</div>
                  {p.weaknesses?.map((w,i) => <div key={i} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"11px", color:"#666", marginBottom:"3px" }}>− {w}</div>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:"#0e0e0e", border:"1px solid #1f1f1f", borderRadius:"2px", padding:"16px 22px" }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#333", letterSpacing:"2px", marginBottom:"6px" }}>VERDICT</div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:"#888", margin:"0 0 10px", lineHeight:"1.7" }}>{result.verdict}</p>
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
      const [img,data]=await Promise.all([
        getPlayerImage(s),
        askClaude(`Career timeline of ${s} in ${label}.`, `You are a ${label} historian. Respond ONLY with raw JSON (no markdown): {"name":"player name","events":[{"year":"YYYY","event":"short description","type":"debut|transfer|trophy|milestone|retirement"}]} Include 6-10 key career moments. For cricket/tennis use transfer type for team/tour changes.`)
      ]);
      setImage(img);
      setTimeline(JSON.parse(data.replace(/```json|```/g,"").trim()));
    } catch { setTimeline({error:"Could not load timeline."}); }
    setLoading(false);
  };

  return (
    <div>
      <div style={L}>CAREER TIMELINE</div>
      <div style={{ display:"flex", border:"1px solid #1f1f1f", borderRadius:"2px", overflow:"hidden", marginBottom:"28px" }}>
        <input value={s} onChange={e=>setS(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder={`e.g. ${label==="Cricket"?"Sachin Tendulkar":label==="Tennis"?"Serena Williams":"Cristiano Ronaldo"}`} style={{ flex:1, background:"#0e0e0e", border:"none", padding:"14px 18px", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:"14px", outline:"none" }}/>
        <button onClick={search} style={SB(color)}>TIMELINE →</button>
      </div>
      {loading&&<LoadDots color={color}/>}
      {timeline&&!timeline.error&&(
        <div style={{ animation:"fadeIn 0.4s ease" }}>
          <div style={{ display:"flex", gap:"14px", alignItems:"center", marginBottom:"26px" }}>
            <PlayerAvatar image={image} name={timeline.name} size={70}/>
            <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"30px", color:"#fff", letterSpacing:"4px" }}>{timeline.name}</div>
          </div>
          <div style={{ position:"relative", paddingLeft:"38px" }}>
            <div style={{ position:"absolute", left:"13px", top:0, bottom:0, width:"1px", background:"#1a1a1a" }}/>
            {timeline.events?.map((e,i) => {
              const c = typeColor[e.type]||"#fff";
              return (
                <div key={i} style={{ position:"relative", marginBottom:"14px", animation:`fadeIn 0.4s ease ${i*0.06}s both` }}>
                  <div style={{ position:"absolute", left:"-30px", top:"8px", width:"10px", height:"10px", borderRadius:"50%", background:c, boxShadow:`0 0 8px ${c}55` }}/>
                  <div style={{ background:"#0d0d0d", border:`1px solid ${c}18`, borderRadius:"2px", padding:"12px 16px", display:"flex", gap:"14px", alignItems:"flex-start" }}>
                    <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"20px", color:c, letterSpacing:"2px", minWidth:"52px" }}>{e.year}</div>
                    <div style={{ flex:1 }}><span style={{ marginRight:"7px" }}>{typeIcon[e.type]}</span><span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px", color:"#bbb", lineHeight:"1.6" }}>{e.event}</span></div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:c+"55", letterSpacing:"1px", textTransform:"uppercase" }}>{e.type}</div>
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

export default function App() {
  const [sportKey, setSportKey] = useState("football");
  const [tab, setTab] = useState("dual");
  const sport = SPORTS[sportKey];
  const tabs = [{id:"dual",label:"DUAL ANALYST"},{id:"profile",label:"PLAYER PROFILE"},{id:"h2h",label:"HEAD TO HEAD"},{id:"timeline",label:"TIMELINE"}];

  const handleSportChange = (key) => { setSportKey(key); setTab("dual"); };

  return (
    <div style={{ minHeight:"100vh", background:"#080808" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
        * { box-sizing:border-box; } input{outline:none;} button{cursor:pointer;}
      `}</style>

      {/* Header */}
      <div style={{ borderBottom:"1px solid #141414", padding:"16px 36px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={{ width:"28px", height:"28px", background:`linear-gradient(135deg,${sport.analystA.accent},${sport.analystB.accent})`, borderRadius:"2px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", transition:"background 0.4s" }}>{sport.emoji}</div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',serif", fontSize:"19px", color:"#fff", letterSpacing:"4px" }}>PITCH INTELLIGENCE</div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"8px", color:"#2a2a2a", letterSpacing:"2px" }}>AI SPORTS PLATFORM</div>
          </div>
        </div>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"9px", color:"#222", letterSpacing:"1px" }}>POWERED BY CLAUDE</div>
      </div>

      {/* Sport Selector */}
      <div style={{ borderBottom:"1px solid #0e0e0e", padding:"16px 36px", background:"#050505" }}>
        <SportSelector selected={sportKey} onChange={handleSportChange}/>
        {/* Feature Tabs */}
        <div style={{ display:"flex" }}>
          {tabs.map(t => <NavTab key={t.id} label={t.label} active={tab===t.id} onClick={()=>setTab(t.id)}/>)}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:"980px", margin:"0 auto", padding:"32px 36px" }}>
        {tab==="dual"    && <DualAnalyst   key={sportKey} sport={sport}/>}
        {tab==="profile" && <PlayerProfile key={sportKey} sport={sport}/>}
        {tab==="h2h"     && <HeadToHead    key={sportKey} sport={sport}/>}
        {tab==="timeline"&& <Timeline      key={sportKey} sport={sport}/>}
      </div>
    </div>
  );
}
