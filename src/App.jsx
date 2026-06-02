import React, { useState, useRef } from "react";
import { Zap, Swords, ChevronRight, Repeat, Loader2, Trophy, SkipForward } from "lucide-react";
import { callAgent, parseJSON } from "./api.js";

/* ------------------------------------------------------------------ *
 *  PLASTIC MAN  vs  THE FLASH  —  a comic-book agent showdown
 *  - A Flash agent and a Plastic Man agent trash-talk and trade moves
 *  - A Quantum Referee agent calls each round, live on the OpenAI API
 *  - Played as a paced 5-round SHOW: each round slams in as a comic panel
 *    with a giant POW/BOOM, speech-bubble taunts, and a 10s read window
 * ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bangers&family=Bungee&family=Outfit:wght@300;500;700;900&family=Space+Mono:wght@400;700&display=swap');

* { box-sizing: border-box; }

.qs-root {
  --ink: #0a0a12;
  --ink2: #14141f;
  --panel: #16121f;
  --flash: #ee1c25;
  --flash-gold: #ffd200;
  --plastic: #ff2d95;
  --plastic-gold: #ffe600;
  --accent: #1fe0c8;
  --paper: #f6f3ea;
  --mute: #9a9ab2;
  --ph: 4px; /* panel halftone scale */
  font-family: 'Outfit', sans-serif;
  color: var(--paper);
  min-height: 100vh;
  width: 100%;
  position: relative;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 18% 8%, rgba(238,28,37,.20), transparent 42%),
    radial-gradient(circle at 84% 92%, rgba(255,45,149,.20), transparent 42%),
    radial-gradient(circle at 60% 50%, rgba(31,224,200,.06), transparent 55%),
    var(--ink);
  display: flex;
  flex-direction: column;
  align-items: center;
}
/* halftone dot field over the whole stage */
.qs-root::before {
  content:""; position:fixed; inset:0; pointer-events:none; z-index:0; opacity:.5;
  background-image: radial-gradient(rgba(255,255,255,.07) 1px, transparent 1.4px);
  background-size: 7px 7px;
}
/* faint grain/vignette */
.qs-root::after {
  content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
  background: radial-gradient(circle at 50% 40%, transparent 55%, rgba(0,0,0,.55));
}

.qs-stage {
  position: relative; z-index: 2;
  width: 100%; max-width: 960px;
  padding: clamp(20px, 4vw, 40px) clamp(16px, 4vw, 28px) 48px;
  min-height: 100vh;
  display: flex; flex-direction: column; justify-content: center;
}

.qs-kicker { font-family:'Space Mono',monospace; letter-spacing:.34em; font-size:11px; color:var(--accent); text-transform:uppercase; }
.qs-h { font-family:'Bungee'; margin:6px 0 0; line-height:.96; }
.qs-sub { color:var(--mute); font-size:15px; line-height:1.55; max-width:62ch; }

/* ---------- buttons ---------- */
.qs-btn {
  font-family:'Bungee'; font-size:15px; letter-spacing:.04em;
  border:none; cursor:pointer; color:#0a0a12; background:var(--accent);
  padding:15px 28px; border-radius:12px; box-shadow: 0 6px 0 #0a6b5e, 0 12px 28px rgba(31,224,200,.34);
  transition: transform .08s ease, box-shadow .08s ease; display:inline-flex; align-items:center; gap:10px;
}
.qs-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 0 #0a6b5e, 0 16px 30px rgba(31,224,200,.4); }
.qs-btn:active { transform: translateY(4px); box-shadow: 0 2px 0 #0a6b5e; }
.qs-btn:disabled { opacity:.5; cursor:not-allowed; }
.qs-btn.ghost { background:transparent; color:var(--paper); box-shadow:none; border:2px solid rgba(255,255,255,.25); }
.qs-btn.sm { font-size:12px; padding:9px 16px; box-shadow:0 4px 0 #0a6b5e; }

/* ---------- intro ---------- */
.qs-center { text-align:center; display:flex; flex-direction:column; align-items:center; gap:6px; }
.qs-vs { display:flex; flex-direction:column; align-items:center; line-height:.86; margin:8px 0 14px; }
.qs-vs .l { font-family:'Bangers'; letter-spacing:.02em; font-size:clamp(44px,11vw,104px); -webkit-text-stroke:3px #000; }
.qs-vs .l.p { color:var(--plastic); transform:rotate(-3deg); text-shadow:5px 5px 0 #000; }
.qs-vs .l.f { color:var(--flash); transform:rotate(2deg); text-shadow:5px 5px 0 #000; }
.qs-vs .x { font-family:'Bangers'; font-size:clamp(40px,9vw,80px); color:var(--flash-gold); -webkit-text-stroke:3px #000; transform:rotate(-6deg); margin:-10px 0; filter: drop-shadow(0 0 16px rgba(255,210,0,.5)); animation: vsThrob 1.6s ease-in-out infinite; }
@keyframes vsThrob { 0%,100%{ transform:rotate(-6deg) scale(1);} 50%{ transform:rotate(-6deg) scale(1.08);} }

/* ---------- character cards ---------- */
.qs-cards { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:24px; }
@media (max-width:680px){ .qs-cards{ grid-template-columns:1fr; } }
.qs-card {
  background: linear-gradient(160deg, var(--panel), #0b0b14);
  border:3px solid #000; border-radius:18px; padding:20px; position:relative; overflow:hidden;
  box-shadow: 9px 9px 0 rgba(0,0,0,.55);
  opacity:0; transform: translateY(28px) rotate(var(--rot)); animation: cardIn .6s cubic-bezier(.2,.85,.25,1) forwards;
}
.qs-card.flash { --rot:-1.5deg; border-top:7px solid var(--flash); animation-delay:.05s; }
.qs-card.plastic { --rot:1.5deg; border-top:7px solid var(--plastic); animation-delay:.16s; }
@keyframes cardIn { to { opacity:1; transform: translateY(0) rotate(var(--rot)); } }
.qs-emblem { width:74px; height:74px; border-radius:50%; display:grid; place-items:center; margin-bottom:10px; border:3px solid #000; }
.qs-emblem.flash { background: radial-gradient(circle, var(--flash-gold), #c9a000); box-shadow:0 0 26px rgba(255,210,0,.5); }
.qs-emblem.plastic { background: radial-gradient(circle, var(--plastic), #b8005f); box-shadow:0 0 26px rgba(255,45,149,.5); }
.qs-emblem .bolt { animation: flick 2.4s infinite; }
@keyframes flick { 0%,100%{opacity:1} 92%{opacity:1} 94%{opacity:.3} 96%{opacity:1} }
.qs-emblem .blob { width:36px; height:36px; background:#0a0a12; border-radius:50% 50% 55% 45%; animation: morph 3.6s ease-in-out infinite; }
@keyframes morph { 0%,100%{ border-radius:50%; transform:scale(1) rotate(0);} 50%{ border-radius:60% 40% 55% 45%; transform:scale(1.1) rotate(10deg);} }
.qs-name { font-family:'Bangers'; letter-spacing:.03em; font-size:30px; margin:0; }
.qs-name.flash { color:var(--flash); } .qs-name.plastic { color:var(--plastic); }
.qs-alias { font-family:'Space Mono',monospace; font-size:12px; color:var(--mute); margin:2px 0 14px; }
.qs-stat { margin:9px 0; }
.qs-stat .lab { display:flex; justify-content:space-between; font-size:12px; font-family:'Space Mono',monospace; color:var(--mute); margin-bottom:3px; }
.qs-bar { height:9px; background:#000; border-radius:6px; overflow:hidden; }
.qs-bar > span { display:block; height:100%; border-radius:6px; width:0; animation: grow 1.1s ease forwards; }
.qs-card.flash .qs-bar > span { background:linear-gradient(90deg,var(--flash),var(--flash-gold)); }
.qs-card.plastic .qs-bar > span { background:linear-gradient(90deg,var(--plastic),var(--plastic-gold)); }
@keyframes grow { to { width: var(--w); } }
.qs-powers { margin-top:14px; display:flex; flex-wrap:wrap; gap:6px; }
.qs-chip { font-size:11px; font-family:'Space Mono',monospace; padding:4px 9px; border-radius:6px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); }

/* ---------- show: round dots ---------- */
.qs-dots { display:flex; gap:8px; justify-content:center; margin-bottom:18px; }
.qs-dots .d { width:22px; height:7px; border-radius:4px; background:rgba(255,255,255,.14); transition:background .3s; }
.qs-dots .d.flash { background:var(--flash); } .qs-dots .d.plastic { background:var(--plastic); } .qs-dots .d.even { background:var(--accent); }
.qs-dots .d.cur { box-shadow:0 0 0 2px rgba(255,255,255,.4); animation: dotPulse 1s infinite; }
@keyframes dotPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

/* ---------- show: clash interstitial ---------- */
.qs-clash { position:relative; min-height:400px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:24px; overflow:hidden; text-align:center; }
.qs-clash > * { position:relative; z-index:2; }
.qs-clash .roundno { font-family:'Bangers'; letter-spacing:.04em; font-size:clamp(42px,9vw,76px); color:var(--paper); -webkit-text-stroke:2px #000; text-shadow:5px 5px 0 #000; }
.qs-clash .arena { display:flex; align-items:center; justify-content:center; gap:clamp(14px,4vw,34px); }
.qs-clash .vsword { font-family:'Bangers'; font-size:clamp(30px,7vw,54px); color:var(--flash-gold); -webkit-text-stroke:2px #000; filter:drop-shadow(0 0 14px rgba(255,210,0,.5)); animation: vsThrob 1s infinite; }
.qs-clash .ce { width:clamp(78px,16vw,104px); height:clamp(78px,16vw,104px); border-radius:50%; border:4px solid #000; display:grid; place-items:center; box-shadow:6px 6px 0 rgba(0,0,0,.5); }
.qs-clash .ce.l { background:radial-gradient(circle,var(--plastic),#b8005f); animation: clashL 1.2s cubic-bezier(.5,0,.6,1) infinite alternate; }
.qs-clash .ce.r { background:radial-gradient(circle,var(--flash-gold),#c9a000); animation: clashR 1.2s cubic-bezier(.5,0,.6,1) infinite alternate; }
@keyframes clashL { from{ transform:translateX(-34px) rotate(-8deg);} to{ transform:translateX(10px) rotate(0);} }
@keyframes clashR { from{ transform:translateX(34px) rotate(8deg);} to{ transform:translateX(-10px) rotate(0);} }
.qs-clash .caption { font-family:'Space Mono',monospace; font-size:13px; color:var(--accent); display:flex; align-items:center; gap:8px; }
.qs-speedlines { position:absolute; inset:0; z-index:0; opacity:.5;
  background: repeating-conic-gradient(from 0deg at 50% 50%, transparent 0 6deg, rgba(255,255,255,.07) 6deg 7deg);
  animation: spin 9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ---------- show: comic panel ---------- */
.qs-panel {
  position:relative; border:4px solid #000; border-radius:14px; padding:22px 20px 20px;
  background: linear-gradient(160deg, #1b1526, #0b0b14);
  box-shadow: 10px 10px 0 rgba(0,0,0,.55);
  overflow:hidden; animation: slamIn .5s cubic-bezier(.2,1.3,.4,1) both;
}
@keyframes slamIn {
  0% { opacity:0; transform: scale(1.25) translateY(-12px); }
  70% { opacity:1; }
  85% { transform: scale(.98) translateY(2px); }
  100% { transform: scale(1) translateY(0); }
}
.qs-panel .panel-halftone { position:absolute; inset:0; pointer-events:none; opacity:.3;
  background: radial-gradient(rgba(255,255,255,.06) 1px, transparent 1.3px); background-size: var(--ph) var(--ph); }
/* impact speed lines that streak across on reveal */
.qs-panel .streaks { position:absolute; inset:-20%; pointer-events:none; z-index:0; opacity:.16;
  background: repeating-linear-gradient(115deg, transparent 0 16px, var(--streak,#fff) 16px 18px);
  animation: streakIn .55s ease-out both; }
@keyframes streakIn { from{ opacity:0; transform:translateX(-12%);} to{ opacity:.16; transform:translateX(0);} }

.qs-panel .rh { position:relative; z-index:2; display:flex; align-items:center; justify-content:space-between; font-family:'Space Mono',monospace; font-size:12px; color:var(--accent); margin-bottom:6px; }
.qs-fighters { position:relative; z-index:2; display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:6px; }
@media (max-width:560px){ .qs-fighters{ grid-template-columns:1fr; } }
.qs-side { display:flex; flex-direction:column; gap:10px; }
.qs-side .who { font-family:'Bangers'; letter-spacing:.03em; font-size:22px; display:flex; align-items:center; gap:8px; }
.qs-side.flash .who { color:var(--flash); } .qs-side.plastic .who { color:var(--plastic); }
.qs-move { font-family:'Bungee'; font-size:15px; padding:9px 12px; border-radius:9px; border:2px solid #000; }
.qs-side.flash .qs-move { background:rgba(238,28,37,.16); border-left:5px solid var(--flash); }
.qs-side.plastic .qs-move { background:rgba(255,45,149,.16); border-left:5px solid var(--plastic); }

/* speech bubbles */
.bubble { position:relative; background:var(--paper); color:#11111a; border:3px solid #000; border-radius:16px;
  padding:11px 13px; font-family:'Bangers'; letter-spacing:.02em; font-size:18px; line-height:1.1;
  box-shadow:4px 4px 0 rgba(0,0,0,.5); opacity:0; transform:scale(.6); animation: popBubble .4s cubic-bezier(.2,1.5,.4,1) forwards; }
.qs-side.flash .bubble { animation-delay:.18s; } .qs-side.plastic .bubble { animation-delay:.3s; }
.bubble::after { content:""; position:absolute; bottom:-13px; width:22px; height:22px; background:var(--paper);
  border-right:3px solid #000; border-bottom:3px solid #000; transform:rotate(45deg); }
.qs-side.flash .bubble::after { left:24px; } .qs-side.plastic .bubble::after { right:24px; }
@keyframes popBubble { to { opacity:1; transform:scale(1); } }

.qs-narr { position:relative; z-index:2; margin-top:18px; padding:13px 15px; border-radius:10px;
  background:rgba(0,0,0,.32); border-left:3px solid var(--accent); font-size:15px; line-height:1.55; }
.qs-narr .ref { font-family:'Space Mono',monospace; font-size:11px; color:var(--accent); display:block; margin-bottom:4px; letter-spacing:.12em; }

/* the big onomatopoeia */
.qs-fx { position:absolute; top:-6px; right:-2px; z-index:5; width:190px; height:190px; pointer-events:none;
  display:grid; place-items:center; transform:rotate(8deg); }
.qs-fx .rays { position:absolute; inset:0;
  background: repeating-conic-gradient(from 0deg at 50% 50%, var(--fx) 0 9deg, transparent 9deg 20deg);
  -webkit-mask: radial-gradient(circle, #000 38%, transparent 70%); mask: radial-gradient(circle, #000 38%, transparent 70%);
  opacity:.85; animation: spin 7s linear infinite; }
.qs-fx .word { position:relative; font-family:'Bangers'; letter-spacing:.02em; font-size:clamp(34px,9vw,58px);
  color:var(--fx); -webkit-text-stroke:3px #000; text-shadow:4px 4px 0 #000, 0 0 22px rgba(0,0,0,.4);
  animation: fxPop .5s cubic-bezier(.2,1.7,.4,1) both, fxWobble 2.4s ease-in-out .5s infinite; }
@keyframes fxPop { 0%{ transform:scale(0) rotate(-30deg); opacity:0;} 70%{ transform:scale(1.25) rotate(6deg);} 100%{ transform:scale(1) rotate(0); opacity:1;} }
@keyframes fxWobble { 0%,100%{ transform:rotate(-3deg);} 50%{ transform:rotate(3deg);} }
@media (max-width:560px){ .qs-fx { width:130px; height:130px; top:-14px; } }

/* read window */
.qs-read { display:flex; align-items:center; gap:14px; margin-top:18px; }
.qs-read .track { flex:1; height:8px; background:rgba(255,255,255,.12); border-radius:6px; overflow:hidden; }
.qs-read .track .fill { height:100%; background:linear-gradient(90deg,var(--accent),#7fffe8); border-radius:6px; transition:width .12s linear; }
.qs-read .lab { font-family:'Space Mono',monospace; font-size:12px; color:var(--mute); white-space:nowrap; }

/* ---------- result ---------- */
.qs-result { text-align:center; display:flex; flex-direction:column; align-items:center; gap:6px; }
.qs-winner { font-family:'Bangers'; letter-spacing:.03em; font-size:clamp(46px,12vw,108px); -webkit-text-stroke:3px #000; text-shadow:6px 6px 0 #000; line-height:.9; margin:6px 0;
  animation: slamIn .55s cubic-bezier(.2,1.3,.4,1) both; }
.qs-stale { font-family:'Bangers'; font-size:clamp(40px,10vw,88px); color:var(--accent); -webkit-text-stroke:3px #000; text-shadow:6px 6px 0 #000; line-height:.9; margin:6px 0;
  animation: slamIn .55s cubic-bezier(.2,1.3,.4,1) both; }
.qs-flair { font-size:16px; color:var(--mute); max-width:54ch; line-height:1.6; margin:6px auto 0; }
.qs-verdict { margin-top:10px; padding:14px 18px; border:3px solid #000; border-radius:14px; background:rgba(0,0,0,.34);
  border-left:4px solid var(--accent); max-width:60ch; }
.qs-verdict .ref { font-family:'Space Mono',monospace; font-size:11px; color:var(--accent); letter-spacing:.14em; display:block; margin-bottom:5px; }
.qs-verdict .line { font-family:'Bangers'; font-size:22px; letter-spacing:.02em; line-height:1.15; }
.qs-burstwrap { position:relative; display:grid; place-items:center; width:200px; height:200px; }
.qs-burstwrap .rays { position:absolute; inset:0;
  background: repeating-conic-gradient(from 0deg at 50% 50%, var(--fx,#1fe0c8) 0 8deg, transparent 8deg 18deg);
  -webkit-mask: radial-gradient(circle,#000 30%, transparent 72%); mask: radial-gradient(circle,#000 30%, transparent 72%);
  opacity:.7; animation: spin 8s linear infinite; }

.qs-footer { margin-top:26px; display:flex; gap:12px; flex-wrap:wrap; justify-content:center; }
.qs-spin { animation: spin 1s linear infinite; }
.qs-err { background:rgba(238,28,37,.16); border:1px solid var(--flash); padding:12px 14px; border-radius:10px; font-size:14px; margin-top:14px; }
`;

/* ----------------------------- agents ----------------------------- */
const FLASH_SYS = `You are Barry Allen, THE FLASH, in a comedic comic-book battle simulation against Plastic Man. You are the fastest man alive — light-speed movement, phasing through matter, the infinite mass punch, speed-stealing and the occasional time trick. You're confident, a little cocky, heroic, and very funny. Given the fight state, pick ONE move (2-4 punchy words) and a cocky, joke-filled taunt (max 16 words). Respond with ONLY minified JSON, no markdown: {"move":"...","taunt":"..."}`;

const PM_SYS = `You are Eel O'Brian, PLASTIC MAN, in a comedic comic-book battle simulation against the Flash. You are infinitely malleable, basically indestructible, you shapeshift into anything, regenerate from being shattered, and you're a total goofball who knows he can't really be hurt. Given the fight state, pick ONE move (2-4 silly words) and a goofy, pun-filled taunt (max 16 words). Respond with ONLY minified JSON, no markdown: {"move":"...","taunt":"..."}`;

const JUDGE_SYS = `You are the QUANTUM REFEREE narrating a Flash vs Plastic Man bout for a hyped lunchtime crowd. Given both fighters' moves this round, write vivid, hilarious play-by-play — 2 to 3 sentences, about 50 words, packed with jokes. Then judge who edged the round. Core running joke: the Flash cannot actually damage the indestructible, rubbery Plastic Man, and can never catch or pin him either — so lean into glorious stalemate energy and absurd comedy. Respond with ONLY minified JSON, no markdown: {"narration":"...","edge":"flash"|"plastic"|"even"}`;

const ROUNDS = 5;
const READ_MS = 10_000; // dwell time per round so the crowd can read the jokes

/* comic onomatopoeia, chosen by who edged the round */
const FX = {
  flash: ["ZOOM!", "ZIP!", "FWOOSH!", "ZAK!", "WHIP!"],
  plastic: ["BOING!", "SPROING!", "BWOMP!", "SPLAT!", "WOBBLE!"],
  even: ["POW!", "BANG!", "WHAM!", "KAPOW!", "BOOM!"],
};
const FX_COLOR = { flash: "var(--flash-gold)", plastic: "var(--plastic-gold)", even: "var(--accent)" };
function pickFx(edge, i) {
  const pool = FX[edge] || FX.even;
  return pool[i % pool.length];
}

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
  const [scene, setScene] = useState("intro"); // intro -> cards -> show -> result
  const [log, setLog] = useState([]); // resolved rounds
  const [activeIdx, setActiveIdx] = useState(-1);
  const [phase, setPhase] = useState("clash"); // clash | reveal (within show)
  const [readLeft, setReadLeft] = useState(READ_MS);
  const [verdict, setVerdict] = useState(null); // { winner, closing, score }
  const [error, setError] = useState(null);
  const skipRef = useRef(false);
  const runningRef = useRef(false);

  // a 10s read window that can be cut short with the SKIP button
  function waitRead(ms) {
    return new Promise((resolve) => {
      const start = Date.now();
      setReadLeft(ms);
      const id = setInterval(() => {
        const left = Math.max(0, ms - (Date.now() - start));
        setReadLeft(left);
        if (left <= 0 || skipRef.current) {
          clearInterval(id);
          skipRef.current = false;
          resolve();
        }
      }, 100);
    });
  }

  async function runShow() {
    if (runningRef.current) return;
    runningRef.current = true;
    setScene("show");
    setLog([]);
    setVerdict(null);
    setError(null);
    skipRef.current = false;
    const history = [];
    try {
      for (let i = 1; i <= ROUNDS; i++) {
        setActiveIdx(i - 1);
        setPhase("clash"); // the clash animation covers the generation latency
        const summary = history.length
          ? history.slice(-2).map((h) => `R${h.round}: ${h.narration}`).join(" ")
          : "The bell just rang; the bout has begun.";
        const [fRaw, pRaw] = await Promise.all([
          callAgent(FLASH_SYS, `Round ${i} of ${ROUNDS}. Fight so far: ${summary}\nChoose your move now.`),
          callAgent(PM_SYS, `Round ${i} of ${ROUNDS}. Fight so far: ${summary}\nChoose your move now.`),
        ]);
        const flash = parseJSON(fRaw, { move: "Sonic Blitz", taunt: "Too slow, stretch! I lapped you twice already." });
        const pm = parseJSON(pRaw, { move: "Rubber Rebound", taunt: "Boing! Missed me — try again in a millennium, speedy!" });
        const jRaw = await callAgent(
          JUDGE_SYS,
          `Round ${i}.\nFlash used "${flash.move}" (taunt: "${flash.taunt}").\nPlastic Man used "${pm.move}" (taunt: "${pm.taunt}").\nNarrate and judge the round.`
        );
        const judge = parseJSON(jRaw, {
          narration: `The Flash unloads ${flash.move} at blinding speed — and Plastic Man simply jiggles, absorbs it, snaps back into shape, and grins. Nobody is closer to winning. The crowd loves it.`,
          edge: "even",
        });
        const edge = ["flash", "plastic", "even"].includes(judge.edge) ? judge.edge : "even";
        const entry = { round: i, flash, pm, narration: judge.narration, edge, fx: pickFx(edge, i) };
        history.push(entry);
        setLog((l) => [...l, entry]);
        setPhase("reveal");
        await waitRead(READ_MS);
      }

      // verdict from the referee's scorecard — no quantum, lean into the gag
      const score = history.reduce(
        (a, r) => ({ ...a, [r.edge]: a[r.edge] + 1 }),
        { flash: 0, plastic: 0, even: 0 }
      );
      const m = score.flash - score.plastic;
      const winner = m >= 2 ? "flash" : m <= -2 ? "plastic" : "stalemate";

      const fallbackClose =
        winner === "stalemate"
          ? "Dead heat! He can't be hit, you can't be caught — see you at lunch tomorrow to argue again!"
          : winner === "flash"
          ? "The Flash edges it on points — by the only frame Plastic Man wasn't paying attention!"
          : "Plastic Man bounces away with it — you simply cannot beat what refuses to break!";
      let closing = fallbackClose;
      try {
        const cRaw = await callAgent(
          JUDGE_SYS,
          `The ${ROUNDS}-round bout is over. Flash edged ${score.flash}, Plastic Man edged ${score.plastic}, ${score.even} even. The verdict is ${
            winner === "stalemate" ? "an ETERNAL STALEMATE" : winner.toUpperCase() + " takes it on points"
          }. Give ONE punchy, funny closing call for the crowd (max 24 words). Respond with ONLY minified JSON: {"line":"..."}`
        );
        closing = parseJSON(cRaw, { line: fallbackClose }).line || fallbackClose;
      } catch (e) {
        /* keep fallback */
      }

      setVerdict({ winner, closing, score });
      setScene("result");
    } catch (e) {
      setError("The agents hit a snag reaching the OpenAI API. Check the server / API key and run it again.");
    } finally {
      runningRef.current = false;
    }
  }

  function reset() {
    setScene("intro");
    setLog([]);
    setActiveIdx(-1);
    setVerdict(null);
    setError(null);
  }

  return (
    <div className="qs-root">
      <style>{CSS}</style>
      <div className="qs-stage">
        {scene === "intro" && <Intro onStart={() => setScene("cards")} />}
        {scene === "cards" && <Cards onStart={runShow} />}
        {scene === "show" && (
          <Show
            log={log}
            activeIdx={activeIdx}
            phase={phase}
            readLeft={readLeft}
            error={error}
            onSkip={() => { skipRef.current = true; }}
            onRetry={runShow}
          />
        )}
        {scene === "result" && <Result verdict={verdict} onReplay={reset} />}
      </div>
    </div>
  );
}

/* --------------------------- scenes ------------------------------- */
function Intro({ onStart }) {
  return (
    <div className="qs-center">
      <div className="qs-kicker">A Comic-Book Agent Showdown</div>
      <div className="qs-vs">
        <div className="l p">PLASTIC MAN</div>
        <div className="x">VS</div>
        <div className="l f">THE FLASH</div>
      </div>
      <p className="qs-sub" style={{ marginBottom: 22 }}>
        Settle the eternal debate. Two AI agents take on their true superpowers and a Quantum Referee
        calls the action live — round by round, in glorious comic-book panels. Unstoppable force,
        meet indestructible rubber.
      </p>
      <button className="qs-btn" onClick={onStart}>
        <Swords size={18} /> ENTER THE ARENA <ChevronRight size={18} />
      </button>
    </div>
  );
}

function Cards({ onStart }) {
  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <div className="qs-kicker">Tale of the Tape</div>
        <h2 className="qs-h" style={{ fontSize: 26 }}>KNOW YOUR FIGHTERS</h2>
      </div>
      <div className="qs-cards">
        <FighterCard which="flash" />
        <FighterCard which="plastic" />
      </div>
      <div className="qs-footer">
        <button className="qs-btn" onClick={onStart}>
          <Swords size={18} /> START THE SHOW <ChevronRight size={18} />
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
        {which === "flash" ? <Zap className="bolt" size={36} color="#0a0a12" fill="#0a0a12" /> : <div className="blob" />}
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

function Show({ log, activeIdx, phase, readLeft, error, onSkip, onRetry }) {
  const round = log[activeIdx];
  const roundNo = activeIdx + 1;
  return (
    <div>
      <div className="qs-dots">
        {Array.from({ length: ROUNDS }).map((_, i) => {
          const done = log[i];
          const cls = done ? done.edge : "";
          const cur = i === activeIdx ? "cur" : "";
          return <div key={i} className={`d ${cls} ${cur}`} />;
        })}
      </div>

      {error ? (
        <div style={{ textAlign: "center" }}>
          <div className="qs-err">{error}</div>
          <div className="qs-footer">
            <button className="qs-btn" onClick={onRetry}><Repeat size={16} /> TRY AGAIN</button>
          </div>
        </div>
      ) : phase === "clash" || !round ? (
        <div className="qs-clash">
          <div className="qs-speedlines" />
          <div className="roundno">ROUND {roundNo}</div>
          <div className="arena">
            <div className="ce l"><div className="blob" style={{ width: 46, height: 46, background: "#0a0a12", borderRadius: "50% 50% 55% 45%" }} /></div>
            <div className="vsword">FIGHT!</div>
            <div className="ce r"><Zap size={46} color="#0a0a12" fill="#0a0a12" /></div>
          </div>
          <div className="caption"><Loader2 className="qs-spin" size={14} /> the agents are trash-talking…</div>
        </div>
      ) : (
        <RoundPanel round={round} readLeft={readLeft} onSkip={onSkip} last={roundNo === ROUNDS} />
      )}
    </div>
  );
}

function RoundPanel({ round, readLeft, onSkip, last }) {
  const streak = round.edge === "plastic" ? "var(--plastic)" : round.edge === "flash" ? "var(--flash)" : "#fff";
  const pct = Math.max(0, Math.min(100, (readLeft / READ_MS) * 100));
  const secs = Math.ceil(readLeft / 1000);
  return (
    // key forces a remount each round so the slam + onomatopoeia animations replay
    <div className="qs-panel" key={round.round} style={{ "--streak": streak }}>
      <div className="streaks" />
      <div className="panel-halftone" />

      <div className="qs-fx" style={{ "--fx": FX_COLOR[round.edge] }}>
        <div className="rays" />
        <div className="word">{round.fx}</div>
      </div>

      <div className="rh">
        <span><Swords size={13} style={{ verticalAlign: "-2px" }} /> ROUND {round.round} OF {ROUNDS}</span>
        <span>EDGE · {round.edge.toUpperCase()}</span>
      </div>

      <div className="qs-fighters">
        <div className="qs-side flash">
          <div className="who"><Zap size={18} fill="currentColor" /> THE FLASH</div>
          <div className="qs-move">⚡ {round.flash.move}</div>
          <div className="bubble">“{round.flash.taunt}”</div>
        </div>
        <div className="qs-side plastic">
          <div className="who">🫳 PLASTIC MAN</div>
          <div className="qs-move">🫨 {round.pm.move}</div>
          <div className="bubble">“{round.pm.taunt}”</div>
        </div>
      </div>

      <div className="qs-narr">
        <span className="ref">⚛ QUANTUM REFEREE</span>
        {round.narration}
      </div>

      <div className="qs-read">
        <div className="track"><div className="fill" style={{ width: `${pct}%` }} /></div>
        <span className="lab">{last ? "verdict" : "next round"} in {secs}s</span>
        <button className="qs-btn ghost sm" onClick={onSkip}>
          <SkipForward size={14} /> {last ? "VERDICT" : "SKIP"}
        </button>
      </div>
    </div>
  );
}

function Result({ verdict, onReplay }) {
  if (!verdict) return null;
  const { winner, closing, score } = verdict;
  const map = {
    flash: { name: "THE FLASH", color: "var(--flash)", fx: "var(--flash-gold)", flair: "Speed takes it on points — Barry caught the one frame Plastic Man wasn't paying attention." },
    plastic: { name: "PLASTIC MAN", color: "var(--plastic)", fx: "var(--plastic-gold)", flair: "The indestructible blob simply outlasts everything. You can't beat what refuses to break." },
  };
  const isStale = winner === "stalemate";
  return (
    <div className="qs-result">
      <div className="qs-kicker">The Final Bell</div>

      <div className="qs-burstwrap" style={{ "--fx": isStale ? "var(--accent)" : map[winner].fx }}>
        <div className="rays" />
        <Trophy size={64} color={isStale ? "var(--accent)" : map[winner].color} style={{ position: "relative", zIndex: 2 }} />
      </div>

      {isStale ? (
        <div className="qs-stale">ETERNAL<br />STALEMATE</div>
      ) : (
        <div className="qs-winner" style={{ color: map[winner].color }}>{map[winner].name}<br />WINS</div>
      )}

      <p className="qs-flair">
        {isStale
          ? "The honest answer the debate always lands on: the Flash can't damage him, Plastic Man can't catch him. They fight forever. The argument resumes at lunch tomorrow."
          : map[winner].flair}
      </p>

      <div className="qs-verdict">
        <span className="ref">⚛ QUANTUM REFEREE · FINAL CALL</span>
        <span className="line">“{closing}”</span>
      </div>

      <div className="qs-flair" style={{ fontFamily: "'Space Mono',monospace", fontSize: 12 }}>
        scorecard — Flash {score.flash} · Plastic {score.plastic} · even {score.even}
      </div>

      <div className="qs-footer">
        <button className="qs-btn" onClick={onReplay}><Repeat size={16} /> RUN IT BACK</button>
      </div>
    </div>
  );
}
