import React, { useState, useRef, useEffect } from "react";
import { Zap, Swords, ChevronRight, Repeat, Loader2, Trophy, SkipForward, BookOpen, Volume2, VolumeX, Cpu } from "lucide-react";
import { runFighter, runReferee, closingCall, AGENT_META } from "./agents.js";
import { narrator } from "./narrator.js";

/* ------------------------------------------------------------------ *
 *  PLASTIC MAN  vs  THE FLASH  —  a comic-book agent showdown
 *  - A Flash agent and a Plastic Man agent choose moves via real OpenAI
 *    TOOL CALLS (their powers are function tools); a Quantum Referee agent
 *    scores each round with a score_round tool. See src/agents.js.
 *  - Played as a paced 3-round SHOW with a live agent-flow trace, comic
 *    panels (POW/BOOM, speech bubbles), and in-browser narration.
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
  box-shadow: 9px 9px 0 rgba(0,0,0,.55); cursor:pointer; outline:none;
  transition: box-shadow .16s ease, filter .16s ease;
  opacity:0; transform: translateY(28px) rotate(var(--rot)); animation: cardIn .6s cubic-bezier(.2,.85,.25,1) forwards;
}
.qs-card.flash { --rot:-1.5deg; border-top:7px solid var(--flash); animation-delay:.05s; }
.qs-card.plastic { --rot:1.5deg; border-top:7px solid var(--plastic); animation-delay:.16s; }
@keyframes cardIn { to { opacity:1; transform: translateY(0) rotate(var(--rot)); } }
.qs-card:hover, .qs-card:focus-visible { filter: brightness(1.07); }
.qs-card.flash:hover, .qs-card.flash:focus-visible { box-shadow: 9px 9px 0 rgba(0,0,0,.55), 0 0 34px rgba(238,28,37,.42); }
.qs-card.plastic:hover, .qs-card.plastic:focus-visible { box-shadow: 9px 9px 0 rgba(0,0,0,.55), 0 0 34px rgba(255,45,149,.42); }
.qs-dossier-hint { margin-top:16px; padding-top:12px; border-top:1px dashed rgba(255,255,255,.14);
  font-family:'Space Mono',monospace; font-size:11px; letter-spacing:.14em; color:var(--accent);
  display:flex; align-items:center; gap:6px; transition: color .16s ease; }
.qs-card:hover .qs-dossier-hint, .qs-card:focus-visible .qs-dossier-hint { color:var(--paper); }
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

/* ---------- dossier modal ---------- */
.qs-modal { position:fixed; inset:0; z-index:60; display:grid; place-items:center; padding:18px;
  background:rgba(6,6,12,.76); backdrop-filter:blur(5px); animation: fadeIn .2s ease; }
@keyframes fadeIn { from{ opacity:0 } to{ opacity:1 } }
.qs-dossier { width:min(660px,100%); max-height:88vh; overflow-y:auto; position:relative;
  border:4px solid #000; border-radius:20px; padding:26px 26px 30px;
  background:linear-gradient(165deg,#1b1526,#0b0b14); box-shadow:14px 14px 0 rgba(0,0,0,.55);
  animation: slamIn .45s cubic-bezier(.2,1.3,.4,1) both; }
.qs-dossier.flash { border-top:8px solid var(--flash); }
.qs-dossier.plastic { border-top:8px solid var(--plastic); }
.qs-dossier .close { position:absolute; top:14px; right:16px; width:34px; height:34px; border-radius:50%;
  border:2px solid #000; background:rgba(255,255,255,.1); color:var(--paper); font-family:'Space Mono',monospace;
  font-size:14px; cursor:pointer; line-height:1; transition: background .15s ease; }
.qs-dossier .close:hover { background:rgba(255,255,255,.22); }
.dossier-head { display:flex; align-items:center; gap:16px; padding-right:36px; }
.dossier-origin { color:var(--paper); opacity:.92; line-height:1.6; margin:16px 0 0; font-size:15px; }
.dossier-sec { margin-top:22px; }
.dossier-sec .seclab { font-family:'Space Mono',monospace; letter-spacing:.18em; font-size:11px;
  text-transform:uppercase; color:var(--accent); margin-bottom:10px; }
.dossier-sec ul { margin:0; padding-left:18px; }
.dossier-sec li { margin:7px 0; line-height:1.55; font-size:14.5px; color:var(--paper); }
.clash-row { display:grid; grid-template-columns:128px 1fr; gap:12px; padding:10px 0; font-size:14px; line-height:1.5;
  border-top:1px solid rgba(255,255,255,.09); }
.clash-row:first-of-type { border-top:none; padding-top:2px; }
.clash-who { font-family:'Bangers'; letter-spacing:.03em; font-size:18px; line-height:1.1; }
.qs-dossier.flash .clash-who { color:var(--flash); }
.qs-dossier.plastic .clash-who { color:var(--plastic); }
@media (max-width:520px){ .clash-row{ grid-template-columns:1fr; gap:2px; } }

/* ---------- narration toggle ---------- */
.qs-narrtoggle { position:fixed; top:16px; right:16px; z-index:40; width:42px; height:42px; border-radius:50%;
  border:2px solid #000; background:var(--panel); color:var(--mute); cursor:pointer; display:grid; place-items:center;
  box-shadow:0 4px 0 rgba(0,0,0,.5); transition: color .15s ease, transform .08s ease, box-shadow .15s ease; }
.qs-narrtoggle.on { color:var(--accent); box-shadow:0 4px 0 rgba(0,0,0,.5), 0 0 16px rgba(31,224,200,.4); }
.qs-narrtoggle:active { transform:translateY(2px); box-shadow:0 2px 0 rgba(0,0,0,.5); }

/* ---------- live agent flow ---------- */
.flow-kicker { font-family:'Space Mono',monospace; letter-spacing:.16em; font-size:11px; color:var(--accent);
  display:flex; align-items:center; gap:7px; }
.qs-flow { display:flex; align-items:center; justify-content:center; gap:14px; flex-wrap:wrap; width:100%; max-width:780px; }
.flow-col { display:flex; flex-direction:column; gap:6px; align-items:stretch; }
.flow-par { font-family:'Space Mono',monospace; font-size:10px; color:var(--mute); text-align:center; letter-spacing:.12em; }
.flow-arrow { font-family:'Bangers'; font-size:28px; color:var(--mute); }
.flow-verdict { font-family:'Bangers'; font-size:22px; color:var(--paper); border:3px dashed rgba(255,255,255,.2);
  border-radius:12px; padding:14px 18px; }
.flow-node { min-width:212px; text-align:left; border:2px solid #000; border-radius:12px; padding:10px 12px;
  background:linear-gradient(160deg,#16121f,#0b0b14); box-shadow:5px 5px 0 rgba(0,0,0,.5);
  transition: box-shadow .2s ease, opacity .2s ease; }
.flow-node.flash { border-left:5px solid var(--flash); }
.flow-node.plastic { border-left:5px solid var(--plastic); }
.flow-node.referee { border-left:5px solid var(--accent); }
.flow-node.idle { opacity:.55; }
.flow-node.running { animation: nodePulse 1.1s ease-in-out infinite; }
@keyframes nodePulse { 0%,100%{ box-shadow:5px 5px 0 rgba(0,0,0,.5); } 50%{ box-shadow:5px 5px 0 rgba(0,0,0,.5), 0 0 22px rgba(31,224,200,.35); } }
.fn-head { display:flex; align-items:center; gap:7px; font-family:'Bangers'; letter-spacing:.02em; font-size:16px; }
.flow-node.flash .fn-head { color:var(--flash); }
.flow-node.plastic .fn-head { color:var(--plastic); }
.flow-node.referee .fn-head { color:var(--accent); }
.fn-dot { width:8px; height:8px; border-radius:50%; background:var(--mute); flex:none; }
.flow-node.running .fn-dot { background:var(--flash-gold); box-shadow:0 0 8px var(--flash-gold); animation: dotPulse 1s infinite; }
.flow-node.done .fn-dot { background:#39d98a; box-shadow:0 0 8px #39d98a; }
.fn-name { white-space:nowrap; }
.fn-line { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px;
  font-family:'Space Mono',monospace; font-size:11px; color:var(--mute); }
.fn-line.dim { opacity:.6; }
.fn-tool { display:inline-block; margin-top:7px; font-family:'Space Mono',monospace; font-size:12px; color:var(--paper);
  background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); border-radius:6px; padding:2px 7px; }
.guard { font-family:'Space Mono',monospace; font-size:10px; padding:1px 6px; border-radius:5px; white-space:nowrap; }
.guard.ok { color:#39d98a; background:rgba(57,217,138,.13); }
.guard.warn { color:var(--flash-gold); background:rgba(255,210,0,.13); }
.guard.bad { color:var(--flash); background:rgba(238,28,37,.15); }
@media (max-width:680px){ .flow-arrow{ transform:rotate(90deg); } .flow-node{ min-width:0; width:100%; } .qs-flow{ max-width:340px; } }

/* ---------- agent trace on the panel ---------- */
.qs-trace { position:relative; z-index:2; margin-top:14px; }
.qs-tracetoggle { width:100%; text-align:left; cursor:pointer; background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.12); border-radius:9px; padding:9px 12px; color:var(--accent);
  font-family:'Space Mono',monospace; font-size:12px; letter-spacing:.08em; display:flex; align-items:center; gap:8px; }
.qs-tracetoggle:hover { background:rgba(255,255,255,.08); }
.qs-tracetoggle .caret { margin-left:auto; }
.qs-tracebody { margin-top:8px; display:flex; flex-direction:column; gap:8px; }
.trace-row { border:1px solid rgba(255,255,255,.1); border-left-width:4px; border-radius:8px; padding:8px 10px; background:rgba(0,0,0,.28); }
.trace-row.flash { border-left-color:var(--flash); }
.trace-row.plastic { border-left-color:var(--plastic); }
.trace-row.referee { border-left-color:var(--accent); }
.tr-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.tr-agent { font-family:'Bangers'; letter-spacing:.03em; font-size:15px; }
.trace-row.flash .tr-agent { color:var(--flash); }
.trace-row.plastic .tr-agent { color:var(--plastic); }
.trace-row.referee .tr-agent { color:var(--accent); }
.tr-metrics { font-family:'Space Mono',monospace; font-size:11px; color:var(--mute); display:flex; align-items:center; gap:7px; }
.tr-call { display:block; margin-top:6px; font-family:'Space Mono',monospace; font-size:12px; color:var(--paper);
  background:rgba(255,255,255,.05); border-radius:6px; padding:6px 8px; word-break:break-word; }
`;

/* ----------------------------- config ----------------------------- */
const ROUNDS = 3;
const READ_MS = 60_000; // ~1 minute per round so the crowd can savor the quips
const MIN_CLASH_MS = 4200; // hold the live agent-flow on screen long enough to read

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    dossier: {
      tagline: "Fastest Man Alive · Justice League founding member",
      origin:
        "Police forensic scientist Barry Allen was struck by lightning and bathed in chemicals, bonding him to the Speed Force — the cosmic energy field behind all motion.",
      clashes: [
        { who: "SUPERMAN", note: "They've raced for charity more than once. Officially it's always 'too close to call' — though Barry has crossed the line first." },
        { who: "BATMAN", note: "Co-founders of the Justice League. Bats keeps a contingency plan for every member — including one to stop Barry." },
        { who: "WONDER WOMAN", note: "League teammate; alongside Superman and Diana, Barry is the team's heart (and its comic timing)." },
        { who: "REVERSE-FLASH", note: "Eobard Thawne — a speedster from the future who rebuilt his entire life around hating Barry." },
      ],
      feats: [
        "Sacrificed himself to save the entire multiverse in Crisis on Infinite Earths.",
        "In Flashpoint he ran back through time to save his mother — and accidentally rewrote all of reality.",
        "Runs fast enough to time-travel, phase through walls, and land an 'infinite mass punch.'",
      ],
      trivia: [
        "His Rogues — Captain Cold, Mirror Master, Heat Wave — actually follow a code of honor.",
        "The Speed Force lets him think and heal at super-speed, not just run.",
      ],
    },
  },
  plastic: {
    name: "PLASTIC MAN",
    alias: "Eel O'Brian · malleable menace",
    stats: [["Speed", 44], ["Strength", 70], ["Durability", 100], ["Intellect", 64], ["Damage Taken", 4]],
    powers: ["Total Malleability", "Shapeshifting", "Near-Immortal", "Impact Absorb", "Regeneration"],
    dossier: {
      tagline: "The Malleable Menace · secretly a JLA heavy hitter",
      origin:
        "Small-time crook Eel O'Brian was shot and doused in mystery acid during a botched heist. Instead of dying, he became living rubber — and decided to go straight.",
      clashes: [
        { who: "BATMAN", note: "Batman trusts him on the Justice League — and rates him so dangerous his shutdown plan was to freeze Plas solid and shatter him." },
        { who: "SUPERMAN", note: "Full League teammate beside the Man of Steel — the goofball who's quietly one of its most powerful members." },
        { who: "WONDER WOMAN", note: "Serves on the JLA with Diana; writers joke he could end most fights if he ever took one seriously." },
        { who: "WOOZY WINKS", note: "His bumbling sidekick, along for every ridiculous caper since the Golden Age." },
      ],
      feats: [
        "Once blown to pieces and left frozen at the bottom of the ocean for 3,000 years — then simply reassembled and carried on.",
        "Reshapes into anything: a parachute, a trampoline, a giant boxing glove, a perfect duplicate of a door.",
        "Effectively unkillable — you can't damage what just bounces back into shape.",
      ],
      trivia: [
        "Created by Jack Cole in 1941 — one of comics' very first shapeshifting heroes.",
        "His son, Offspring, inherited the stretchy powers.",
      ],
    },
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
  const [agents, setAgents] = useState({ flash: null, plastic: null, referee: null }); // live telemetry
  const [narrate, setNarrate] = useState(true);
  const skipRef = useRef(false);
  const runIdRef = useRef(0); // epoch: bumping it cancels any in-flight show loop
  const narrateRef = useRef(true);

  function toggleNarrate() {
    setNarrate((v) => {
      const nv = !v;
      narrateRef.current = nv;
      if (!nv) narrator.cancel();
      return nv;
    });
  }

  // The read window (skippable). Resolves when time's up, SKIP is pressed, or a
  // newer show run has started (alive() goes false).
  function waitRead(ms, alive) {
    return new Promise((resolve) => {
      const start = Date.now();
      setReadLeft(ms);
      const id = setInterval(() => {
        const left = Math.max(0, ms - (Date.now() - start));
        setReadLeft(left);
        if (left <= 0 || skipRef.current || !alive()) {
          clearInterval(id);
          skipRef.current = false;
          resolve();
        }
      }, 100);
    });
  }

  async function runShow() {
    const myRun = ++runIdRef.current; // claim this epoch
    const alive = () => runIdRef.current === myRun; // false once a newer run starts
    setScene("show");
    setLog([]);
    setVerdict(null);
    setError(null);
    skipRef.current = false;
    narrator.cancel();
    const history = [];
    try {
      for (let i = 1; i <= ROUNDS; i++) {
        if (!alive()) return;
        narrator.cancel();
        const clashStart = Date.now();
        setActiveIdx(i - 1);
        setPhase("clash"); // the clash + live agent flow cover the generation latency
        setAgents({ flash: { status: "running" }, plastic: { status: "running" }, referee: { status: "idle" } });

        const summary = history.length
          ? history.slice(-2).map((h) => `R${h.round}: ${h.narration}`).join(" ")
          : "The bell just rang; the bout has begun.";
        const fightState = `Round ${i} of ${ROUNDS}. Fight so far: ${summary}\nMake your move now.`;

        // Both fighter agents run in parallel; mark each done as it resolves so
        // the live flow diagram lights up node-by-node.
        const flashP = runFighter("flash", fightState).then((r) => { if (alive()) setAgents((a) => ({ ...a, flash: { ...r, status: "done" } })); return r; });
        const pmP = runFighter("plastic", fightState).then((r) => { if (alive()) setAgents((a) => ({ ...a, plastic: { ...r, status: "done" } })); return r; });
        const [flash, pm] = await Promise.all([flashP, pmP]);
        if (!alive()) return;

        // The referee agent scores the round (its own tool call).
        setAgents((a) => ({ ...a, referee: { status: "running" } }));
        const ref = await runReferee(
          `Round ${i}. Flash used "${flash.move}" (taunt: "${flash.taunt}"). Plastic Man used "${pm.move}" (taunt: "${pm.taunt}"). Call the round.`
        );
        if (!alive()) return;
        setAgents((a) => ({ ...a, referee: { ...ref, status: "done" } }));

        const edge = ref.edge;
        const entry = {
          round: i, flash, pm, narration: ref.narration, edge,
          fx: pickFx(edge, i),
          trace: [flash, pm, ref], // tool-call telemetry for the expandable panel
        };
        history.push(entry);
        // Hold the fully-resolved flow diagram briefly so the live tool calls
        // (and their latency/tokens/guardrails) are readable before the reveal.
        const elapsed = Date.now() - clashStart;
        if (elapsed < MIN_CLASH_MS) await sleep(MIN_CLASH_MS - elapsed);
        if (!alive()) return;

        setLog((l) => [...l, entry]);
        setPhase("reveal");

        if (narrateRef.current) {
          narrator.speak(flash.taunt, "flash");
          narrator.speak(pm.taunt, "plastic");
          narrator.speak(ref.narration, "referee");
        }
        await waitRead(READ_MS, alive);
        if (!alive()) return;
      }

      // verdict from the referee's scorecard — lean into the stalemate gag
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
      const verdictLine = winner === "stalemate" ? "an ETERNAL STALEMATE" : winner.toUpperCase() + " takes it on points";
      const closing =
        (await closingCall(`The ${ROUNDS}-round bout is over. Flash edged ${score.flash}, Plastic Man edged ${score.plastic}, ${score.even} even. The verdict: ${verdictLine}.`)) ||
        fallbackClose;
      if (!alive()) return;

      setVerdict({ winner, closing, score });
      if (narrateRef.current) narrator.speak(closing, "referee");
      setScene("result");
    } catch (e) {
      if (alive()) setError("The agents hit a snag reaching the OpenAI API. Check the server / API key and run it again.");
    }
  }

  function reset() {
    runIdRef.current++; // cancel any in-flight show loop
    narrator.cancel();
    setScene("intro");
    setLog([]);
    setActiveIdx(-1);
    setVerdict(null);
    setError(null);
    setAgents({ flash: null, plastic: null, referee: null });
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
            agents={agents}
            narrate={narrate}
            onToggleNarrate={toggleNarrate}
            onSkip={() => { skipRef.current = true; narrator.cancel(); }}
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
  const [open, setOpen] = useState(null); // which fighter's dossier is open
  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <div className="qs-kicker">Tale of the Tape</div>
        <h2 className="qs-h" style={{ fontSize: 26 }}>KNOW YOUR FIGHTERS</h2>
        <p className="qs-sub" style={{ margin: "8px auto 0", textAlign: "center" }}>
          Tap a fighter to open their dossier — origin, famous clashes, and iconic moments.
        </p>
      </div>
      <div className="qs-cards">
        <FighterCard which="flash" onOpen={setOpen} />
        <FighterCard which="plastic" onOpen={setOpen} />
      </div>
      <div className="qs-footer">
        <button className="qs-btn" onClick={onStart}>
          <Swords size={18} /> START THE SHOW <ChevronRight size={18} />
        </button>
      </div>
      {open && <Dossier which={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Emblem({ which, size = 36 }) {
  return (
    <div className={`qs-emblem ${which}`}>
      {which === "flash" ? <Zap className="bolt" size={size} color="#0a0a12" fill="#0a0a12" /> : <div className="blob" />}
    </div>
  );
}

function FighterCard({ which, onOpen }) {
  const f = FIGHTERS[which];
  return (
    <div
      className={`qs-card ${which}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(which)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(which); } }}
    >
      <Emblem which={which} />
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
      <div className="qs-dossier-hint"><BookOpen size={13} /> TAP FOR DOSSIER <ChevronRight size={13} /></div>
    </div>
  );
}

function Dossier({ which, onClose }) {
  const f = FIGHTERS[which];
  const d = f.dossier;
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="qs-modal" onClick={onClose}>
      <div className={`qs-dossier ${which}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${f.name} dossier`}>
        <button className="close" onClick={onClose} aria-label="Close dossier">✕</button>
        <div className="dossier-head">
          <Emblem which={which} size={32} />
          <div>
            <h3 className={`qs-name ${which}`} style={{ fontSize: 34 }}>{f.name}</h3>
            <div className="qs-alias" style={{ margin: 0 }}>{d.tagline}</div>
          </div>
        </div>
        <p className="dossier-origin">{d.origin}</p>

        <div className="dossier-sec">
          <div className="seclab">Famous Clashes &amp; Team-Ups</div>
          {d.clashes.map((c) => (
            <div className="clash-row" key={c.who}>
              <span className="clash-who">{c.who}</span>
              <span>{c.note}</span>
            </div>
          ))}
        </div>

        <div className="dossier-sec">
          <div className="seclab">Iconic Feats</div>
          <ul>{d.feats.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>

        <div className="dossier-sec">
          <div className="seclab">Did You Know</div>
          <ul>{d.trivia.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

function Show({ log, activeIdx, phase, readLeft, error, agents, narrate, onToggleNarrate, onSkip, onRetry }) {
  const round = log[activeIdx];
  const roundNo = activeIdx + 1;
  return (
    <div>
      <button
        className={`qs-narrtoggle ${narrate ? "on" : ""}`}
        onClick={onToggleNarrate}
        title={narrate ? "Mute narration" : "Unmute narration"}
        aria-label="Toggle narration"
      >
        {narrate ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

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
        <AgentFlow agents={agents} roundNo={roundNo} />
      ) : (
        <RoundPanel round={round} readLeft={readLeft} onSkip={onSkip} last={roundNo === ROUNDS} />
      )}
    </div>
  );
}

/* The live multi-agent flow shown during the "clash" beat: the two fighter
 * agents fire in parallel, then the referee — nodes light up as real tool
 * calls resolve, each showing the tool invoked, latency, tokens, guardrail. */
function AgentFlow({ agents, roundNo }) {
  const allDone = ["flash", "plastic", "referee"].every((k) => agents[k]?.status === "done");
  return (
    <div className="qs-clash">
      <div className="qs-speedlines" />
      <div className="roundno">ROUND {roundNo}</div>
      <div className="flow-kicker"><Cpu size={13} /> MULTI-AGENT ORCHESTRATION · LIVE TOOL CALLS</div>
      <div className="qs-flow">
        <div className="flow-col">
          <AgentNode role="flash" data={agents.flash} />
          <span className="flow-par">∥ parallel</span>
          <AgentNode role="plastic" data={agents.plastic} />
        </div>
        <div className="flow-arrow">→</div>
        <AgentNode role="referee" data={agents.referee} />
        <div className="flow-arrow">→</div>
        <div className="flow-verdict">VERDICT</div>
      </div>
      <div className="caption">
        {allDone ? <>resolving the panel…</> : <><Loader2 className="qs-spin" size={14} /> agents calling their power tools…</>}
      </div>
    </div>
  );
}

function AgentNode({ role, data }) {
  const meta = AGENT_META[role];
  const status = data?.status || "idle";
  const icon = role === "flash" ? <Zap size={13} fill="currentColor" /> : role === "plastic" ? <span>🫳</span> : <span>⚛</span>;
  return (
    <div className={`flow-node ${role} ${status}`}>
      <div className="fn-head"><span className="fn-dot" />{icon}<span className="fn-name">{meta.name}</span></div>
      {status === "idle" && <div className="fn-line dim">queued</div>}
      {status === "running" && <div className="fn-line"><Loader2 className="qs-spin" size={11} /> calling tool…</div>}
      {status === "done" && data?.tool && (
        <>
          <code className="fn-tool">{data.tool}()</code>
          <div className="fn-line"><span>{data.ms}ms · {data.tokens ?? "—"} tok</span><GuardBadge guard={data.guard} /></div>
        </>
      )}
    </div>
  );
}

function GuardBadge({ guard }) {
  const map = { ok: ["✓ ok", "ok"], coerced: ["⚠ coerced", "warn"], fallback: ["✗ fallback", "bad"] };
  const [label, cls] = map[guard] || map.ok;
  return <span className={`guard ${cls}`} title="output guardrail">{label}</span>;
}

function TraceRow({ t }) {
  const args = t.role === "referee"
    ? `narration: "…", edge: "${t.edge}"`
    : Object.entries(t.args || {}).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ");
  return (
    <div className={`trace-row ${t.role}`}>
      <div className="tr-head">
        <span className="tr-agent">{t.agent}</span>
        <span className="tr-metrics">{t.ms}ms · {t.tokens ?? "—"} tok <GuardBadge guard={t.guard} /></span>
      </div>
      <code className="tr-call">{t.tool}({args})</code>
    </div>
  );
}

function RoundPanel({ round, readLeft, onSkip, last }) {
  const [traceOpen, setTraceOpen] = useState(false);
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

      <div className="qs-trace">
        <button className="qs-tracetoggle" onClick={() => setTraceOpen((o) => !o)} aria-expanded={traceOpen}>
          <Cpu size={13} /> AGENT TRACE — {round.trace.length} tool calls <span className="caret">{traceOpen ? "▲" : "▼"}</span>
        </button>
        {traceOpen && (
          <div className="qs-tracebody">
            {round.trace.map((t, i) => <TraceRow key={i} t={t} />)}
          </div>
        )}
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
