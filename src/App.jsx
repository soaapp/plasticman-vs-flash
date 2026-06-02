import React, { useState, useEffect, useRef } from "react";
import { Zap, Atom, Trophy, Repeat, ChevronRight, Loader2, Activity, Sparkles, Swords, Users, Timer } from "lucide-react";
import { callAgent, parseJSON, collapseWavefunction, sampleSuperposition } from "./api.js";
import { usePoll } from "./usePoll.js";

/* ------------------------------------------------------------------ *
 *  PLASTIC MAN  vs  THE FLASH  —  Schrödinger's Showdown
 *  - Animated character cards
 *  - Multi-agent fight (Flash agent + Plastic Man agent + Quantum Referee)
 *    running on the OpenAI API, proxied server-side (key stays on the server)
 *  - Live audience poll over WebSockets (whole room votes together)
 *  - Quantum collapse via a real Qiskit Hadamard-and-measure on Aer
 * ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bungee&family=Outfit:wght@300;500;700&family=Space+Mono:wght@400;700&display=swap');

.qs-root {
  --ink: #0a0a12;
  --panel: #12121f;
  --flash: #ee1c25;
  --flash-gold: #ffd200;
  --plastic: #ff2d95;
  --plastic-gold: #ffe600;
  --quantum: #1fe0c8;
  --paper: #f4f1e8;
  --mute: #8a8aa0;
  font-family: 'Outfit', sans-serif;
  color: var(--paper);
  background:
    radial-gradient(circle at 20% 10%, rgba(238,28,37,.18), transparent 45%),
    radial-gradient(circle at 80% 90%, rgba(255,45,149,.18), transparent 45%),
    var(--ink);
  min-height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 14px;
}
.qs-root::before {
  content:""; position:absolute; inset:0; pointer-events:none; opacity:.35;
  background-image: radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px);
  background-size: 6px 6px;
}
.qs-wrap { position:relative; z-index:2; padding: 28px 24px 36px; max-width: 920px; margin:0 auto; }

.qs-kicker { font-family:'Space Mono',monospace; letter-spacing:.32em; font-size:11px; color:var(--quantum); text-transform:uppercase; }
.qs-title { font-family:'Bungee'; line-height:.92; margin:6px 0 0; }

.qs-vs-title { display:flex; flex-direction:column; align-items:center; gap:2px; text-align:center; }
.qs-vs-title .l1 { font-family:'Bungee'; font-size: clamp(30px,7vw,58px); color:var(--plastic); text-shadow: 3px 3px 0 #000; }
.qs-vs-title .vs { font-family:'Bungee'; font-size: clamp(34px,8vw,68px); color:var(--flash-gold); -webkit-text-stroke:2px #000; transform: rotate(-4deg); margin:-6px 0; }
.qs-vs-title .l2 { font-family:'Bungee'; font-size: clamp(30px,7vw,58px); color:var(--flash); text-shadow: 3px 3px 0 #000; }

.qs-btn {
  font-family:'Bungee'; font-size:15px; letter-spacing:.04em;
  border:none; cursor:pointer; color:#0a0a12; background:var(--quantum);
  padding:14px 26px; border-radius:10px; box-shadow: 0 6px 0 #0a6b5e, 0 10px 24px rgba(31,224,200,.3);
  transition: transform .08s ease, box-shadow .08s ease; display:inline-flex; align-items:center; gap:10px;
}
.qs-btn:hover { transform: translateY(-1px); }
.qs-btn:active { transform: translateY(4px); box-shadow: 0 2px 0 #0a6b5e; }
.qs-btn:disabled { opacity:.5; cursor:not-allowed; }
.qs-btn.ghost { background:transparent; color:var(--paper); box-shadow:none; border:2px solid rgba(255,255,255,.25); }

.qs-cards { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:22px; }
@media (max-width:680px){ .qs-cards{ grid-template-columns:1fr; } }

.qs-card {
  background: linear-gradient(160deg, var(--panel), #0c0c16);
  border:3px solid #000; border-radius:16px; padding:18px;
  position:relative; overflow:hidden; box-shadow: 8px 8px 0 rgba(0,0,0,.5);
  opacity:0; transform: translateY(24px) rotate(var(--rot));
  animation: cardIn .6s cubic-bezier(.2,.8,.2,1) forwards;
}
.qs-card.flash { --rot:-1.5deg; border-top:6px solid var(--flash); animation-delay:.05s; }
.qs-card.plastic { --rot:1.5deg; border-top:6px solid var(--plastic); animation-delay:.18s; }
@keyframes cardIn { to { opacity:1; transform: translateY(0) rotate(var(--rot)); } }

.qs-emblem { width:78px; height:78px; border-radius:50%; display:grid; place-items:center; margin-bottom:10px; position:relative; }
.qs-emblem.flash { background: radial-gradient(circle, var(--flash-gold), #c9a000); box-shadow:0 0 26px rgba(255,210,0,.5); }
.qs-emblem.plastic { background: radial-gradient(circle, var(--plastic), #b8005f); box-shadow:0 0 26px rgba(255,45,149,.5); }
.qs-emblem .bolt { animation: flick 2.2s infinite; }
@keyframes flick { 0%,100%{opacity:1} 92%{opacity:1} 94%{opacity:.3} 96%{opacity:1} }
.qs-emblem.plastic .blob { animation: morph 4s ease-in-out infinite; }
@keyframes morph { 0%,100%{ border-radius:50% 50% 50% 50%; transform:scale(1);} 50%{ border-radius:60% 40% 55% 45%; transform:scale(1.08) rotate(8deg);} }

.qs-name { font-family:'Bungee'; font-size:22px; margin:0; }
.qs-name.flash { color:var(--flash); }
.qs-name.plastic { color:var(--plastic); }
.qs-alias { font-family:'Space Mono',monospace; font-size:12px; color:var(--mute); margin:2px 0 12px; }

.qs-stat { margin:9px 0; }
.qs-stat .lab { display:flex; justify-content:space-between; font-size:12px; font-family:'Space Mono',monospace; color:var(--mute); margin-bottom:3px; }
.qs-bar { height:9px; background:#000; border-radius:6px; overflow:hidden; }
.qs-bar > span { display:block; height:100%; border-radius:6px; width:0; animation: grow 1s ease forwards; }
.qs-card.flash .qs-bar > span { background:linear-gradient(90deg,var(--flash),var(--flash-gold)); }
.qs-card.plastic .qs-bar > span { background:linear-gradient(90deg,var(--plastic),var(--plastic-gold)); }
@keyframes grow { to { width: var(--w); } }

.qs-powers { margin-top:12px; display:flex; flex-wrap:wrap; gap:6px; }
.qs-chip { font-size:11px; font-family:'Space Mono',monospace; padding:4px 8px; border-radius:6px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); }

.qs-section { margin-top:26px; }
.qs-h { font-family:'Bungee'; font-size:18px; margin:0 0 4px; }
.qs-sub { color:var(--mute); font-size:14px; margin:0 0 16px; max-width:60ch; }

.qs-poll { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.qs-vote { cursor:pointer; border:3px solid #000; border-radius:12px; padding:16px; text-align:center; font-family:'Bungee'; font-size:16px; transition:transform .1s, box-shadow .1s; background:var(--panel); position:relative; overflow:hidden; }
.qs-vote.flash { color:var(--flash); } .qs-vote.plastic { color:var(--plastic); }
.qs-vote:hover { transform:translateY(-2px); }
.qs-vote.sel.flash { background:var(--flash); color:#fff; box-shadow:0 0 24px rgba(238,28,37,.5); }
.qs-vote.sel.plastic { background:var(--plastic); color:#fff; box-shadow:0 0 24px rgba(255,45,149,.5); }
.qs-vote .tallybar { position:absolute; left:0; bottom:0; height:5px; transition:width .5s ease; }
.qs-vote.flash .tallybar { background:var(--flash-gold); }
.qs-vote.plastic .tallybar { background:var(--plastic-gold); }
.qs-vote .pct { display:block; font-family:'Space Mono',monospace; font-size:12px; margin-top:6px; opacity:.85; }

.qs-pollmeta { display:flex; align-items:center; gap:8px; font-family:'Space Mono',monospace; font-size:12px; color:var(--mute); margin-top:12px; }
.qs-dot { width:8px; height:8px; border-radius:50%; background:var(--mute); }
.qs-dot.live { background:var(--quantum); box-shadow:0 0 8px var(--quantum); animation:pulse 1.4s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }

.qs-round { border:2px solid rgba(255,255,255,.1); border-radius:12px; padding:14px; margin-bottom:12px; background:rgba(255,255,255,.03);
  opacity:0; transform:translateY(12px); animation:fadeUp .5s forwards; }
@keyframes fadeUp { to { opacity:1; transform:translateY(0); } }
.qs-round .rh { display:flex; align-items:center; gap:8px; font-family:'Space Mono',monospace; font-size:12px; color:var(--quantum); margin-bottom:8px; }
.qs-moves { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px; }
.qs-move { padding:8px 10px; border-radius:8px; font-size:13px; }
.qs-move.flash { background:rgba(238,28,37,.12); border-left:3px solid var(--flash); }
.qs-move.plastic { background:rgba(255,45,149,.12); border-left:3px solid var(--plastic); }
.qs-move .mv { font-weight:700; }
.qs-move .tt { font-style:italic; color:var(--mute); font-size:12px; }
.qs-narr { font-size:14px; line-height:1.5; }
.qs-edge { font-family:'Space Mono',monospace; font-size:11px; margin-top:8px; color:var(--mute); }

.qs-momentum { display:flex; align-items:center; gap:10px; margin:16px 0; font-family:'Space Mono',monospace; font-size:12px; }
.qs-momentum .track { flex:1; height:12px; background:#000; border-radius:8px; position:relative; overflow:hidden; }
.qs-momentum .track .fill { position:absolute; top:0; bottom:0; left:50%; transition:all .6s ease; }

/* quantum */
.qs-quantum { text-align:center; padding:18px 0; }
.qs-qubit { width:200px; height:200px; margin:18px auto; position:relative; }
.qs-qubit .ring { position:absolute; inset:0; border-radius:50%; border:2px dashed rgba(31,224,200,.4); animation:spin 8s linear infinite; }
.qs-qubit .ring.b { inset:24px; border-color:rgba(255,45,149,.4); animation-direction:reverse; animation-duration:6s; }
@keyframes spin { to { transform:rotate(360deg); } }
.qs-superpos { position:absolute; inset:0; display:grid; place-items:center; }
.qs-superpos .glyph { font-family:'Bungee'; font-size:46px; animation:flickerState 1.1s steps(1) infinite; }
@keyframes flickerState { 0%,49%{ color:var(--flash); content:""; } 50%,100%{ color:var(--plastic); } }
.qs-collapsing .qs-qubit { animation: collapseShake .5s; }
@keyframes collapseShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }

.qs-amp { display:flex; gap:14px; justify-content:center; margin-top:8px; }
.qs-amp .col { font-family:'Space Mono',monospace; font-size:12px; }
.qs-amp .colbar { width:40px; background:#000; border-radius:6px; height:90px; display:flex; align-items:flex-end; overflow:hidden; margin:6px auto; }
.qs-amp .colbar > span { display:block; width:100%; transition:height .8s ease; }

.qs-result { text-align:center; padding:10px 0 4px; }
.qs-winner { font-family:'Bungee'; font-size:clamp(28px,7vw,52px); margin:6px 0; text-shadow:3px 3px 0 #000; }
.qs-stalemate { font-family:'Bungee'; font-size:clamp(22px,5vw,38px); color:var(--quantum); text-shadow:3px 3px 0 #000; }
.qs-flair { font-size:14px; color:var(--mute); max-width:56ch; margin:10px auto 0; line-height:1.55; }

.qs-note { margin-top:14px; font-family:'Space Mono',monospace; font-size:11px; color:var(--mute); border-left:2px solid var(--quantum); padding-left:10px; line-height:1.5; }
.qs-footer { margin-top:22px; display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }
.qs-spin { animation:spin 1s linear infinite; }
.qs-err { background:rgba(238,28,37,.15); border:1px solid var(--flash); padding:10px 12px; border-radius:8px; font-size:13px; margin-top:10px; }
`;

/* ----------------------------- agents ----------------------------- */
const FLASH_SYS = `You are Barry Allen, THE FLASH, in a comedic comic-book battle simulation against Plastic Man. You are the fastest man alive — light-speed movement, phasing through matter, the infinite mass punch, speed-stealing and the occasional time trick. You're confident, a little cocky, heroic. Given the fight state, pick ONE move (2-4 punchy words) and a short cocky taunt (max 12 words). Respond with ONLY minified JSON, no markdown: {"move":"...","taunt":"..."}`;

const PM_SYS = `You are Eel O'Brian, PLASTIC MAN, in a comedic comic-book battle simulation against the Flash. You are infinitely malleable, basically indestructible, you shapeshift into anything, regenerate from being shattered, and you're a total goofball who knows he can't really be hurt. Given the fight state, pick ONE move (2-4 silly words) and a goofy taunt (max 12 words). Respond with ONLY minified JSON, no markdown: {"move":"...","taunt":"..."}`;

const JUDGE_SYS = `You are the QUANTUM REFEREE narrating a Flash vs Plastic Man bout for a hackathon crowd. Given both fighters' moves this round, write vivid, funny play-by-play — 2 sentences max, about 40 words. Then judge who edged the round. Core running joke: the Flash cannot actually damage the indestructible, rubbery Plastic Man, and can never catch or pin him either — so lean into glorious stalemate energy and absurd comedy. Respond with ONLY minified JSON, no markdown: {"narration":"...","edge":"flash"|"plastic"|"even"}`;

const FIGHT_DURATION_MS = 60_000; // the bout runs for ~one minute
const MAX_ROUNDS = 40; // safety cap so a slow/looping API can't run away

/* ----------------------------- data ------------------------------- */
const FIGHTERS = {
  flash: {
    name: "THE FLASH",
    alias: "Barry Allen · Speed Force conduit",
    stats: [["Speed", 100], ["Strength", 76], ["Durability", 58], ["Intellect", 88], ["Catch Rate vs Foe", 22]],
    powers: ["Light-speed", "Phasing", "Infinite Mass Punch", "Time Travel", "Speed Steal"],
  },
  plastic: {
    name: "PLASTIC MAN",
    alias: "Eel O'Brian · malleable menace",
    stats: [["Speed", 44], ["Strength", 70], ["Durability", 100], ["Intellect", 64], ["Damage Taken", 4]],
    powers: ["Total Malleability", "Shapeshifting", "Near-Immortal", "Impact Absorb", "Regeneration"],
  },
};

/* ----------------------------- app -------------------------------- */
export default function App() {
  const [scene, setScene] = useState("intro"); // intro -> cards -> arena -> quantum -> result
  const [prediction, setPrediction] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [fighting, setFighting] = useState(false);
  const [error, setError] = useState(null);
  const [collapsing, setCollapsing] = useState(false);
  const [outcome, setOutcome] = useState(null); // 'flash' | 'plastic' | 'stalemate'
  const [measurement, setMeasurement] = useState(null); // raw quantum result for display
  const [timeLeft, setTimeLeft] = useState(FIGHT_DURATION_MS); // ms remaining in the bout
  const [qSample, setQSample] = useState(null); // latest live Aer superposition sample
  const logRef = useRef(null);
  const poll = usePoll();

  // Referee's scorecard (LLM judge), NOT the quantum outcome — purely the fight.
  const momentum = rounds.reduce((a, r) => a + (r.edge === "flash" ? 1 : r.edge === "plastic" ? -1 : 0), 0);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [rounds]);

  // While the qubit is unobserved — during the bout, and on the quantum screen
  // before you measure — resample the honest Hadamard every ~1.5s. It stays at
  // ~50/50 no matter how the fight is going; the jitter is real shot noise.
  useEffect(() => {
    const active = fighting || (scene === "quantum" && !collapsing);
    if (!active) return;
    let alive = true;
    const tick = () => {
      sampleSuperposition()
        .then((s) => { if (alive) setQSample(s); })
        .catch(() => {}); // keep the meter resilient to a dropped sample
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => { alive = false; clearInterval(id); };
  }, [fighting, scene, collapsing]);

  async function runFight() {
    setFighting(true);
    setError(null);
    setRounds([]);
    const history = [];
    const deadline = Date.now() + FIGHT_DURATION_MS;
    setTimeLeft(FIGHT_DURATION_MS);
    // tick the on-screen countdown while the bout runs
    const ticker = setInterval(() => setTimeLeft(Math.max(0, deadline - Date.now())), 250);
    try {
      let i = 0;
      // Keep starting fresh rounds until the minute is up (the in-flight round
      // finishes, so the bell may ring a beat past 0). MAX_ROUNDS is a backstop.
      while (Date.now() < deadline && i < MAX_ROUNDS) {
        i++;
        const secsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        const clock = `~${secsLeft}s left on the clock.`;
        const summary = history.length
          ? history.slice(-2).map((h) => `R${h.round}: ${h.narration}`).join(" ")
          : "The bell just rang; the bout has begun.";
        const [fRaw, pRaw] = await Promise.all([
          callAgent(FLASH_SYS, `Round ${i}. ${clock} Fight so far: ${summary}\nChoose your move now.`),
          callAgent(PM_SYS, `Round ${i}. ${clock} Fight so far: ${summary}\nChoose your move now.`),
        ]);
        const flash = parseJSON(fRaw, { move: "Sonic Blitz", taunt: "Too slow, stretch!" });
        const pm = parseJSON(pRaw, { move: "Rubber Rebound", taunt: "Boing! Missed me again!" });
        const jRaw = await callAgent(
          JUDGE_SYS,
          `Round ${i}.\nFlash used "${flash.move}" (taunt: "${flash.taunt}").\nPlastic Man used "${pm.move}" (taunt: "${pm.taunt}").\nNarrate and judge the round.`
        );
        const judge = parseJSON(jRaw, {
          narration: `The Flash unloads ${flash.move} at blinding speed — and Plastic Man simply jiggles, absorbs it, and grins.`,
          edge: "even",
        });
        const entry = { round: i, flash, pm, narration: judge.narration, edge: ["flash", "plastic", "even"].includes(judge.edge) ? judge.edge : "even" };
        history.push(entry);
        setRounds((r) => [...r, entry]);
      }
    } catch (e) {
      setError("The agents hit a snag reaching the OpenAI API. Check the server logs / API key and run the simulation again.");
    } finally {
      clearInterval(ticker);
      setTimeLeft(0);
      setFighting(false);
    }
  }

  // Real quantum measurement: POST to the backend, which runs a Qiskit
  // Hadamard-and-measure circuit on the Aer simulator and returns the
  // collapsed outcome along with the measured counts.
  async function collapse() {
    setCollapsing(true);
    setError(null);
    try {
      const res = await collapseWavefunction();
      // brief dramatic pause so the collapse animation reads
      setTimeout(() => {
        setMeasurement(res);
        setOutcome(res.outcome);
        setCollapsing(false);
        setScene("result");
      }, 2200);
    } catch (e) {
      setError("The quantum backend couldn't run the circuit. Is the Qiskit venv installed?");
      setCollapsing(false);
    }
  }

  function reset() {
    setScene("intro"); setPrediction(null); setRounds([]); setOutcome(null); setMeasurement(null); setError(null);
  }

  return (
    <div className="qs-root">
      <style>{CSS}</style>
      <div className="qs-wrap">
        {scene === "intro" && <Intro onStart={() => setScene("cards")} />}

        {scene === "cards" && (
          <Cards
            prediction={prediction}
            setPrediction={setPrediction}
            poll={poll}
            onNext={() => setScene("arena")}
          />
        )}

        {scene === "arena" && (
          <Arena
            rounds={rounds}
            fighting={fighting}
            error={error}
            momentum={momentum}
            timeLeft={timeLeft}
            qSample={qSample}
            logRef={logRef}
            onFight={runFight}
            onCollapse={() => setScene("quantum")}
          />
        )}

        {scene === "quantum" && (
          <Quantum collapsing={collapsing} qSample={qSample} error={error} onMeasure={collapse} />
        )}

        {scene === "result" && (
          <Result outcome={outcome} prediction={prediction} measurement={measurement} onReplay={reset} />
        )}
      </div>
    </div>
  );
}

/* --------------------------- scenes ------------------------------- */
function Intro({ onStart }) {
  return (
    <div style={{ textAlign: "center", padding: "30px 0" }}>
      <div className="qs-kicker">AI × Quantum · Lunch-Break Showdown</div>
      <div className="qs-vs-title" style={{ margin: "22px 0" }}>
        <div className="l1">PLASTIC MAN</div>
        <div className="vs">VS</div>
        <div className="l2">THE FLASH</div>
      </div>
      <p className="qs-sub" style={{ margin: "0 auto 22px" }}>
        Settle the eternal debate. Two AI agents take on their true superpowers, a Quantum Referee
        calls the action live, and the winner is decided by collapsing a qubit. Unstoppable force,
        meet indestructible rubber.
      </p>
      <button className="qs-btn" onClick={onStart}>
        <Swords size={18} /> ENTER THE ARENA <ChevronRight size={18} />
      </button>
    </div>
  );
}

function Cards({ prediction, setPrediction, poll, onNext }) {
  const { tally, voters, connected, vote } = poll;
  const total = tally.flash + tally.plastic;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  function pick(choice) {
    setPrediction(choice);
    vote(choice); // broadcast to the whole room over the WebSocket
  }

  return (
    <div>
      <div className="qs-kicker">Tale of the Tape</div>
      <h2 className="qs-title" style={{ fontSize: 24 }}>KNOW YOUR FIGHTERS</h2>
      <div className="qs-cards">
        <FighterCard which="flash" />
        <FighterCard which="plastic" />
      </div>

      <div className="qs-section">
        <div className="qs-kicker">Audience Poll · Live</div>
        <h3 className="qs-h">WHO TAKES IT?</h3>
        <p className="qs-sub">Cast your prediction before the simulation runs — every screen in the room votes into the same live tally over WebSockets.</p>
        <div className="qs-poll">
          <div className={`qs-vote plastic ${prediction === "plastic" ? "sel" : ""}`} onClick={() => pick("plastic")}>
            PLASTIC MAN
            <span className="pct">{pct(tally.plastic)}% · {tally.plastic}</span>
            <div className="tallybar" style={{ width: `${pct(tally.plastic)}%` }} />
          </div>
          <div className={`qs-vote flash ${prediction === "flash" ? "sel" : ""}`} onClick={() => pick("flash")}>
            THE FLASH
            <span className="pct">{pct(tally.flash)}% · {tally.flash}</span>
            <div className="tallybar" style={{ width: `${pct(tally.flash)}%` }} />
          </div>
        </div>
        <div className="qs-pollmeta">
          <span className={`qs-dot ${connected ? "live" : ""}`} />
          {connected ? "LIVE" : "connecting…"}
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Users size={13} /> {voters} in the room · {total} votes
          </span>
        </div>
      </div>

      <div className="qs-footer">
        <button className="qs-btn" disabled={!prediction} onClick={onNext}>
          {prediction ? "TO THE FIGHT" : "PICK A FIGHTER FIRST"} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function FighterCard({ which }) {
  const f = FIGHTERS[which];
  return (
    <div className={`qs-card ${which}`}>
      <div className={`qs-emblem ${which}`}>
        {which === "flash" ? (
          <Zap className="bolt" size={40} color="#0a0a12" fill="#0a0a12" />
        ) : (
          <div className="blob" style={{ width: 38, height: 38, background: "#0a0a12", borderRadius: "50% 50% 55% 45%" }} />
        )}
      </div>
      <h3 className={`qs-name ${which}`}>{f.name}</h3>
      <div className="qs-alias">{f.alias}</div>
      {f.stats.map(([lab, val]) => (
        <div className="qs-stat" key={lab}>
          <div className="lab"><span>{lab}</span><span>{val}</span></div>
          <div className="qs-bar"><span style={{ "--w": val + "%" }} /></div>
        </div>
      ))}
      <div className="qs-powers">
        {f.powers.map((p) => <span className="qs-chip" key={p}>{p}</span>)}
      </div>
    </div>
  );
}

function Arena({ rounds, fighting, error, momentum, timeLeft, qSample, logRef, onFight, onCollapse }) {
  const done = rounds.length > 0 && !fighting;
  const mPct = Math.max(-1, Math.min(1, momentum / Math.max(rounds.length, 1)));
  const secsLeft = Math.ceil((timeLeft || 0) / 1000);
  const clockPct = Math.max(0, Math.min(100, ((timeLeft || 0) / FIGHT_DURATION_MS) * 100));
  return (
    <div>
      <div className="qs-kicker">Multi-Agent Simulation · Live on OpenAI</div>
      <h2 className="qs-title" style={{ fontSize: 24 }}>THE BOUT · 60 SECONDS</h2>
      <p className="qs-sub">A Flash agent and a Plastic Man agent each choose their moves in parallel; a Quantum Referee agent narrates and scores every round. They trade blows for one minute — all three run on OpenAI, proxied through the server.</p>

      {rounds.length === 0 && !fighting && (
        <button className="qs-btn" onClick={onFight}><Activity size={18} /> BEGIN 60-SECOND BOUT</button>
      )}

      {fighting && (
        <div className="qs-momentum" style={{ margin: "16px 0 4px" }}>
          <Timer size={16} color="var(--quantum)" />
          <div className="track">
            <div className="fill" style={{ left: 0, width: `${clockPct}%`, background: "var(--quantum)" }} />
          </div>
          <span style={{ color: "var(--quantum)", minWidth: 38, textAlign: "right" }}>{secsLeft}s</span>
        </div>
      )}

      {error && <div className="qs-err">{error}</div>}

      <div ref={logRef} style={{ maxHeight: 430, overflowY: "auto", marginTop: 18, paddingRight: 4 }}>
        {rounds.map((r) => (
          <div className="qs-round" key={r.round}>
            <div className="rh"><Swords size={14} /> ROUND {r.round} · edge: {r.edge.toUpperCase()}</div>
            <div className="qs-moves">
              <div className="qs-move flash"><div className="mv">⚡ {r.flash.move}</div><div className="tt">“{r.flash.taunt}”</div></div>
              <div className="qs-move plastic"><div className="mv">🫳 {r.pm.move}</div><div className="tt">“{r.pm.taunt}”</div></div>
            </div>
            <div className="qs-narr">{r.narration}</div>
          </div>
        ))}
        {fighting && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--quantum)", fontFamily: "'Space Mono',monospace", fontSize: 13, padding: 12 }}>
            <Loader2 className="qs-spin" size={16} /> agents deliberating round {rounds.length + 1}…
          </div>
        )}
      </div>

      {qSample && <LiveSuperposition sample={qSample} sampling={fighting} />}

      {rounds.length > 0 && (
        <>
          <div className="qs-kicker" style={{ marginTop: 16 }}>Referee's Scorecard · LLM judge, not quantum</div>
          <div className="qs-momentum" style={{ marginTop: 6 }}>
            <span style={{ color: "var(--plastic)" }}>PLASTIC</span>
            <div className="track">
              <div className="fill" style={{
                background: mPct >= 0 ? "var(--flash)" : "var(--plastic)",
                left: mPct >= 0 ? "50%" : `${50 + mPct * 50}%`,
                width: `${Math.abs(mPct) * 50}%`,
              }} />
            </div>
            <span style={{ color: "var(--flash)" }}>FLASH</span>
          </div>
          <div className="qs-edge" style={{ textAlign: "center" }}>
            Who's landing the better rounds — the verdict still comes down to the qubit.
          </div>
        </>
      )}

      {done && (
        <div className="qs-footer">
          <button className="qs-btn ghost" onClick={onFight}><Repeat size={16} /> RE-SIM</button>
          <button className="qs-btn" onClick={onCollapse}><Atom size={18} /> COLLAPSE THE WAVEFUNCTION</button>
        </div>
      )}
    </div>
  );
}

function LiveSuperposition({ sample, sampling }) {
  const flashPct = Math.round((sample.pFlash ?? 0.5) * 100);
  const plasticPct = 100 - flashPct;
  return (
    <div style={{
      marginTop: 18, padding: "12px 14px", borderRadius: 12,
      border: "2px solid rgba(31,224,200,.25)", background: "rgba(31,224,200,.05)",
    }}>
      <div className="qs-pollmeta" style={{ marginTop: 0, marginBottom: 8 }}>
        <span className={`qs-dot ${sampling ? "live" : ""}`} />
        {sampling ? "LIVE" : "LAST SAMPLE"} · OUTCOME IN SUPERPOSITION
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Atom size={13} /> Aer · H→measure · {sample.shots} shots
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Space Mono',monospace", fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: "var(--plastic)" }}>PLASTIC {plasticPct}%</span>
        <span style={{ color: "var(--flash)" }}>{flashPct}% FLASH</span>
      </div>
      {/* track is Plastic; the Flash fill grows from the right with measured P(flash) */}
      <div style={{ height: 14, background: "var(--plastic)", borderRadius: 8, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: `${flashPct}%`, background: "var(--flash)", transition: "width .5s ease" }} />
      </div>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "var(--mute)", marginTop: 6 }}>
        measured {sample.counts?.["0"]} / {sample.counts?.["1"]} (flash/plastic) · stays ~50/50 no matter who's winning — both win until observed. Jitter is real shot noise; resamples on Aer every 1.5s.
      </div>
    </div>
  );
}

function Quantum({ collapsing, qSample, error, onMeasure }) {
  // Real, live Aer sample of the honest Hadamard — sits at ~50/50 with shot
  // noise. This is the SAME circuit the final measurement collapses.
  const pFlash = collapsing ? 0.5 : (qSample?.pFlash ?? 0.5);
  return (
    <div className={`qs-quantum ${collapsing ? "qs-collapsing" : ""}`}>
      <div className="qs-kicker">Schrödinger's Showdown</div>
      <h2 className="qs-title" style={{ fontSize: 24 }}>BOTH WIN — UNTIL OBSERVED</h2>
      <p className="qs-sub" style={{ margin: "8px auto 0" }}>
        This debate never resolves — so the outcome lives in honest superposition. A Hadamard gate
        holds an equal blend of both fighters; measuring the qubit collapses it to a single winner.
        The brawl was pure theater: it doesn't tip these odds.
      </p>

      <div className="qs-qubit">
        <div className="ring" />
        <div className="ring b" />
        <div className="qs-superpos">
          {collapsing ? <Loader2 className="qs-spin" size={48} color="var(--quantum)" /> : <div className="glyph">|ψ⟩</div>}
        </div>
      </div>

      <div className="qs-amp">
        <div className="col">
          <div style={{ color: "var(--plastic)" }}>PLASTIC</div>
          <div className="colbar"><span style={{ height: `${(1 - pFlash) * 100}%`, background: "var(--plastic)" }} /></div>
          <div>{Math.round((1 - pFlash) * 100)}%</div>
        </div>
        <div className="col">
          <div style={{ color: "var(--flash)" }}>FLASH</div>
          <div className="colbar"><span style={{ height: `${pFlash * 100}%`, background: "var(--flash)" }} /></div>
          <div>{Math.round(pFlash * 100)}%</div>
        </div>
      </div>

      {qSample && !collapsing && (
        <div className="qs-edge">
          live Aer sample · {qSample.counts?.["0"]} / {qSample.counts?.["1"]} over {qSample.shots} shots · resampling every 1.5s
        </div>
      )}

      {error && <div className="qs-err">{error}</div>}

      <div className="qs-footer">
        <button className="qs-btn" disabled={collapsing} onClick={onMeasure}>
          {collapsing ? <><Loader2 className="qs-spin" size={18} /> MEASURING…</> : <><Sparkles size={18} /> MEASURE THE QUBIT</>}
        </button>
      </div>

      <div className="qs-note">
        REAL MEASUREMENT. The bars above are a live Aer sample of <code>H→measure</code>; pressing the
        button calls <code>/api/quantum/collapse</code>, which runs that same single-qubit circuit and
        takes one shot as the verdict — a genuine 50/50 (plus the comic-book stalemate chance), wholly
        independent of the fight. Swap the Aer backend for real quantum hardware to decide it on a QPU.
      </div>
    </div>
  );
}

function Result({ outcome, prediction, measurement, onReplay }) {
  const map = {
    flash: { name: "THE FLASH", color: "var(--flash)", flair: "Speed wins the measurement — Barry catches the one frame where Plastic Man wasn't paying attention." },
    plastic: { name: "PLASTIC MAN", color: "var(--plastic)", flair: "The indestructible blob simply outlasts everything. You can't beat what refuses to break." },
  };
  const correct = outcome === prediction;
  return (
    <div className="qs-result">
      <div className="qs-kicker">Wavefunction Collapsed</div>
      {outcome === "stalemate" ? (
        <>
          <Trophy size={44} color="var(--quantum)" style={{ margin: "10px 0" }} />
          <div className="qs-stalemate">ETERNAL STALEMATE</div>
          <p className="qs-flair">The honest answer the debate always lands on: Flash can't damage him, Plastic Man can't catch him. They fight forever. The argument continues at lunch tomorrow.</p>
        </>
      ) : (
        <>
          <Trophy size={44} color={map[outcome].color} style={{ margin: "10px 0" }} />
          <div className="qs-winner" style={{ color: map[outcome].color }}>{map[outcome].name} WINS</div>
          <p className="qs-flair">{map[outcome].flair}</p>
          <p className="qs-flair" style={{ color: correct ? "var(--quantum)" : "var(--mute)" }}>
            {correct ? "✓ Your prediction was correct. Collect your bragging rights." : `✗ You backed ${prediction === "flash" ? "the Flash" : "Plastic Man"}. The qubit disagreed.`}
          </p>
        </>
      )}
      {measurement && (
        <div className="qs-note" style={{ display: "inline-block", textAlign: "left", marginTop: 18 }}>
          QISKIT · {measurement.backend} · circuit: {measurement.circuit}<br />
          measured bit |{measurement.bit}⟩ over {measurement.shots} shots →
          counts {JSON.stringify(measurement.counts)}
        </div>
      )}
      <div className="qs-footer">
        <button className="qs-btn" onClick={onReplay}><Repeat size={16} /> RUN IT BACK</button>
      </div>
    </div>
  );
}
