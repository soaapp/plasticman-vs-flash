import React, { useState, useRef, useEffect } from "react";
import { Zap, Swords, ChevronRight, ChevronLeft, Repeat, Loader2, Trophy, FastForward, BookOpen, Cpu, Brain, Wrench, Maximize2, X } from "lucide-react";
import { runFighter, runReferee, closingCall, AGENT_META } from "./agents.js";

/* ------------------------------------------------------------------ *
 *  PLASTIC MAN vs THE FLASH — a comic-book agent showdown
 *  Each round is a 4-beat cinematic: agents pick a TOOL (real OpenAI
 *  tool calls) → the tools DRAW as giant power cards → they CLASH →
 *  an OUTCOME lands. A live AGENT CONSOLE streams every agent's
 *  reasoning + tool_call the whole way through.
 * ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bangers&family=Bungee&family=Outfit:wght@300;500;700;900&family=Space+Mono:wght@400;700&display=swap');

* { box-sizing: border-box; }

.qs-root {
  --ink:#0a0a12; --panel:#16121f; --flash:#ee1c25; --flash-gold:#ffd200;
  --plastic:#ff2d95; --plastic-gold:#ffe600; --accent:#1fe0c8; --paper:#f6f3ea; --mute:#9a9ab2; --good:#39d98a;
  font-family:'Outfit',sans-serif; color:var(--paper); min-height:100vh; width:100%;
  position:relative; overflow-x:hidden; display:flex; flex-direction:column; align-items:center;
  background:
    radial-gradient(circle at 18% 8%, rgba(238,28,37,.20), transparent 42%),
    radial-gradient(circle at 84% 92%, rgba(255,45,149,.20), transparent 42%),
    radial-gradient(circle at 60% 50%, rgba(31,224,200,.06), transparent 55%),
    var(--ink);
}
.qs-root::before { content:""; position:fixed; inset:0; pointer-events:none; z-index:0; opacity:.5;
  background-image: radial-gradient(rgba(255,255,255,.07) 1px, transparent 1.4px); background-size:7px 7px; }
.qs-root::after { content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
  background: radial-gradient(circle at 50% 40%, transparent 55%, rgba(0,0,0,.55)); }

.qs-stage { position:relative; z-index:2; width:100%; max-width:none;
  padding: clamp(16px,3vw,32px) clamp(14px,2vw,40px) 56px; min-height:100vh;
  display:flex; flex-direction:column; justify-content:center; }

.qs-kicker { font-family:'Space Mono',monospace; letter-spacing:.34em; font-size:11px; color:var(--accent); text-transform:uppercase; }
.qs-h { font-family:'Bungee'; margin:6px 0 0; line-height:.96; }
.qs-sub { color:var(--mute); font-size:15px; line-height:1.55; max-width:62ch; }

.qs-btn { font-family:'Bungee'; font-size:15px; letter-spacing:.04em; border:none; cursor:pointer; color:#0a0a12; background:var(--accent);
  padding:15px 28px; border-radius:12px; box-shadow:0 6px 0 #0a6b5e, 0 12px 28px rgba(31,224,200,.34);
  transition:transform .08s ease, box-shadow .08s ease; display:inline-flex; align-items:center; gap:10px; }
.qs-btn:hover { transform:translateY(-2px); }
.qs-btn:active { transform:translateY(4px); box-shadow:0 2px 0 #0a6b5e; }
.qs-btn:disabled { opacity:.5; cursor:not-allowed; }
.qs-btn.ghost { background:transparent; color:var(--paper); box-shadow:none; border:2px solid rgba(255,255,255,.25); }
.qs-btn.sm { font-size:12px; padding:9px 16px; box-shadow:0 4px 0 #0a6b5e; }

.qs-center { text-align:center; display:flex; flex-direction:column; align-items:center; gap:6px; }
.qs-vs { display:flex; flex-direction:column; align-items:center; line-height:.86; margin:8px 0 14px; }
.qs-vs .l { font-family:'Bangers'; letter-spacing:.02em; font-size:clamp(44px,11vw,104px); -webkit-text-stroke:3px #000; }
.qs-vs .l.p { color:var(--plastic); transform:rotate(-3deg); text-shadow:5px 5px 0 #000; }
.qs-vs .l.f { color:var(--flash); transform:rotate(2deg); text-shadow:5px 5px 0 #000; }
.qs-vs .x { font-family:'Bangers'; font-size:clamp(40px,9vw,80px); color:var(--flash-gold); -webkit-text-stroke:3px #000; transform:rotate(-6deg); margin:-10px 0; filter:drop-shadow(0 0 16px rgba(255,210,0,.5)); animation:vsThrob 1.6s ease-in-out infinite; }
@keyframes vsThrob { 0%,100%{transform:rotate(-6deg) scale(1)} 50%{transform:rotate(-6deg) scale(1.08)} }

/* ---------- character cards ---------- */
.qs-cards { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:24px; }
@media (max-width:680px){ .qs-cards{ grid-template-columns:1fr; } }
.qs-card { background:linear-gradient(160deg,var(--panel),#0b0b14); border:3px solid #000; border-radius:18px; padding:0 0 18px;
  position:relative; overflow:hidden; box-shadow:9px 9px 0 rgba(0,0,0,.55); cursor:pointer; outline:none;
  transition:box-shadow .16s ease, filter .16s ease; opacity:0; transform:translateY(28px) rotate(var(--rot)); animation:cardIn .6s cubic-bezier(.2,.85,.25,1) forwards; }
.qs-card.flash { --rot:-1.5deg; border-top:7px solid var(--flash); animation-delay:.05s; }
.qs-card.plastic { --rot:1.5deg; border-top:7px solid var(--plastic); animation-delay:.16s; }
@keyframes cardIn { to { opacity:1; transform:translateY(0) rotate(var(--rot)); } }
.qs-card:hover, .qs-card:focus-visible { filter:brightness(1.07); }
.qs-card.flash:hover { box-shadow:9px 9px 0 rgba(0,0,0,.55), 0 0 34px rgba(238,28,37,.42); }
.qs-card.plastic:hover { box-shadow:9px 9px 0 rgba(0,0,0,.55), 0 0 34px rgba(255,45,149,.42); }
.qs-photo { width:100%; height:clamp(230px,22vw,320px); object-fit:cover; display:block; border-bottom:3px solid #000;
  filter:saturate(1.05) contrast(1.03); }
.qs-photowrap { position:relative; }
.qs-photowrap .badge { position:absolute; top:10px; left:10px; font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.12em;
  background:rgba(0,0,0,.6); border:1px solid rgba(255,255,255,.2); border-radius:6px; padding:3px 8px; }
.qs-photo-fallback { width:100%; height:clamp(230px,22vw,320px); display:grid; place-items:center; border-bottom:3px solid #000;
  background:radial-gradient(circle at 50% 40%, rgba(255,255,255,.05), transparent); }
.qs-cardbody { padding:16px 18px 0; }
.qs-name { font-family:'Bangers'; letter-spacing:.03em; font-size:30px; margin:0; }
.qs-name.flash { color:var(--flash); } .qs-name.plastic { color:var(--plastic); }
.qs-alias { font-family:'Space Mono',monospace; font-size:12px; color:var(--mute); margin:2px 0 14px; }
.qs-stat { margin:9px 0; }
.qs-stat .lab { display:flex; justify-content:space-between; font-size:12px; font-family:'Space Mono',monospace; color:var(--mute); margin-bottom:3px; }
.qs-bar { height:9px; background:#000; border-radius:6px; overflow:hidden; }
.qs-bar > span { display:block; height:100%; border-radius:6px; width:0; animation:grow 1.1s ease forwards; }
.qs-card.flash .qs-bar > span { background:linear-gradient(90deg,var(--flash),var(--flash-gold)); }
.qs-card.plastic .qs-bar > span { background:linear-gradient(90deg,var(--plastic),var(--plastic-gold)); }
@keyframes grow { to { width: var(--w); } }
.qs-powers { margin-top:14px; display:flex; flex-wrap:wrap; gap:6px; }
.qs-chip { font-size:11px; font-family:'Space Mono',monospace; padding:4px 9px; border-radius:6px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); }
.qs-dossier-hint { margin-top:16px; padding-top:12px; border-top:1px dashed rgba(255,255,255,.14);
  font-family:'Space Mono',monospace; font-size:11px; letter-spacing:.14em; color:var(--accent); display:flex; align-items:center; gap:6px; }
.qs-card:hover .qs-dossier-hint { color:var(--paper); }
.qs-emblem { width:74px; height:74px; border-radius:50%; display:grid; place-items:center; border:3px solid #000; }
.qs-emblem.flash { background:radial-gradient(circle,var(--flash-gold),#c9a000); box-shadow:0 0 26px rgba(255,210,0,.5); }
.qs-emblem.plastic { background:radial-gradient(circle,var(--plastic),#b8005f); box-shadow:0 0 26px rgba(255,45,149,.5); }
.qs-emblem .bolt { animation:flick 2.4s infinite; }
@keyframes flick { 0%,100%{opacity:1} 92%{opacity:1} 94%{opacity:.3} 96%{opacity:1} }
.qs-emblem .blob { width:36px; height:36px; background:#0a0a12; border-radius:50% 50% 55% 45%; animation:morph 3.6s ease-in-out infinite; }
@keyframes morph { 0%,100%{border-radius:50%; transform:scale(1) rotate(0)} 50%{border-radius:60% 40% 55% 45%; transform:scale(1.1) rotate(10deg)} }

/* ---------- spotlight: card one side, photos sweep in opposite ---------- */
.spot-top { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
.spot-title { font-family:'Space Mono',monospace; letter-spacing:.2em; font-size:12px; color:var(--mute); }
.spot-title .flash { color:var(--flash); font-weight:700; } .spot-title .plastic { color:var(--plastic); font-weight:700; }
.spot { display:grid; gap:18px; align-items:stretch; }
.spot.flash { grid-template-columns: minmax(300px, 0.95fr) 1.15fr; }    /* card | photos */
.spot.plastic { grid-template-columns: 1.15fr minmax(300px, 0.95fr); } /* photos | card */
@media (max-width:860px){ .spot.flash, .spot.plastic { grid-template-columns:1fr; } }
@keyframes sweepRight { from{opacity:0; transform:translateX(72px) scale(.97)} to{opacity:1; transform:translateX(0) scale(1)} }
@keyframes sweepLeft { from{opacity:0; transform:translateX(-72px) scale(.97)} to{opacity:1; transform:translateX(0) scale(1)} }

/* photo panel — one full-size image at a time (click to expand) */
.spot-images { position:relative; border:4px solid #000; border-radius:18px; overflow:hidden; background:#0b0b14;
  box-shadow:12px 12px 0 rgba(0,0,0,.5); min-height:clamp(440px,76vh,920px); cursor:zoom-in; }
.spot.flash .spot-images { border-top:7px solid var(--plastic); animation:sweepRight .6s cubic-bezier(.2,1.1,.3,1) both; }
.spot.plastic .spot-images { border-top:7px solid var(--flash); animation:sweepLeft .6s cubic-bezier(.2,1.1,.3,1) both; }
.spot-images .si-rays { position:absolute; inset:0; z-index:0; opacity:.4;
  background:repeating-conic-gradient(from 0deg at 50% 50%, transparent 0 6deg, rgba(255,255,255,.06) 6deg 7deg); animation:spin 14s linear infinite; }
.si-photo { position:absolute; inset:0; z-index:1; width:100%; height:100%; object-fit:cover; display:block; animation:kenburns 8s ease-out both; }
@keyframes kenburns { from{transform:scale(1.1)} to{transform:scale(1)} }
.si-badge { position:absolute; top:12px; left:12px; z-index:3; font-family:'Space Mono',monospace; font-size:11px; letter-spacing:.12em;
  background:rgba(0,0,0,.6); border:1px solid rgba(255,255,255,.2); border-radius:6px; padding:3px 9px; }
.si-nav { position:absolute; top:50%; transform:translateY(-50%); z-index:3; width:44px; height:44px; border-radius:50%; border:2px solid #000;
  background:rgba(0,0,0,.55); color:var(--paper); cursor:pointer; display:grid; place-items:center; transition:background .15s; }
.si-nav:hover { background:rgba(0,0,0,.82); } .si-nav.prev { left:12px; } .si-nav.next { right:12px; }
.si-expand { position:absolute; bottom:12px; right:12px; z-index:3; display:inline-flex; align-items:center; gap:6px; cursor:zoom-in;
  font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.12em; color:var(--paper);
  background:rgba(0,0,0,.62); border:1px solid rgba(255,255,255,.25); border-radius:6px; padding:4px 9px; }
.si-expand:hover { background:rgba(0,0,0,.85); }
.si-dots { position:absolute; bottom:14px; left:0; right:0; z-index:3; display:flex; gap:8px; justify-content:center; }
.si-dots b { width:11px; height:11px; border-radius:50%; background:rgba(255,255,255,.45); cursor:pointer; border:1px solid #000; }
.spot.flash .si-dots b.on { background:var(--flash); } .spot.plastic .si-dots b.on { background:var(--plastic); }

/* lightbox / fullscreen image */
.lightbox { position:fixed; inset:0; z-index:90; display:grid; place-items:center; padding:24px;
  background:rgba(4,4,9,.93); backdrop-filter:blur(4px); animation:fadeIn .2s ease; cursor:zoom-out; }
.lb-stage { display:grid; place-items:center; cursor:default; }
.lb-img { max-width:94vw; max-height:88vh; object-fit:contain; border:4px solid #000; border-radius:12px;
  box-shadow:0 24px 70px rgba(0,0,0,.7); animation:slamIn .35s cubic-bezier(.2,1.2,.4,1) both; }
.lb-close { position:fixed; top:18px; right:20px; z-index:92; width:42px; height:42px; border-radius:50%; border:2px solid #000;
  background:rgba(0,0,0,.6); color:var(--paper); cursor:pointer; display:grid; place-items:center; }
.lb-close:hover { background:rgba(0,0,0,.85); }
.lb-nav { position:fixed; top:50%; transform:translateY(-50%); z-index:92; width:54px; height:54px; border-radius:50%; border:2px solid #000;
  background:rgba(0,0,0,.6); color:var(--paper); cursor:pointer; display:grid; place-items:center; }
.lb-nav:hover { background:rgba(0,0,0,.85); } .lb-nav.prev { left:18px; } .lb-nav.next { right:18px; }
.lb-cap { position:fixed; bottom:20px; left:0; right:0; z-index:92; text-align:center; font-family:'Space Mono',monospace;
  font-size:12px; letter-spacing:.16em; color:var(--mute); }

/* card panel — stats + dossier */
.spot-card { border:4px solid #000; border-radius:18px; padding:22px; background:linear-gradient(160deg,#1b1526,#0b0b14); box-shadow:12px 12px 0 rgba(0,0,0,.5); }
.spot.flash .spot-card { border-top:7px solid var(--flash); animation:sweepLeft .55s cubic-bezier(.2,1.05,.3,1) both; }
.spot.plastic .spot-card { border-top:7px solid var(--plastic); animation:sweepRight .55s cubic-bezier(.2,1.05,.3,1) both; }
.sc-head { display:flex; align-items:center; gap:14px; margin-bottom:14px; }
.dossier-origin { color:var(--paper); opacity:.92; line-height:1.6; margin:16px 0 0; font-size:15px; }
.dossier-sec { margin-top:18px; }
.dossier-sec .seclab { font-family:'Space Mono',monospace; letter-spacing:.18em; font-size:11px; text-transform:uppercase; color:var(--accent); margin-bottom:10px; }
.dossier-sec ul { margin:0; padding-left:18px; } .dossier-sec li { margin:7px 0; line-height:1.55; font-size:14.5px; }
.clash-row { display:grid; grid-template-columns:128px 1fr; gap:12px; padding:10px 0; font-size:14px; line-height:1.5; border-top:1px solid rgba(255,255,255,.09); }
.clash-row:first-of-type { border-top:none; padding-top:2px; }
.clash-who { font-family:'Bangers'; letter-spacing:.03em; font-size:18px; }
.spot-card.flash .clash-who { color:var(--flash); } .spot-card.plastic .clash-who { color:var(--plastic); }
@media (max-width:520px){ .clash-row{ grid-template-columns:1fr; gap:2px; } }

/* ---------- show layout: stage + console ---------- */
.show-grid { display:grid; grid-template-columns:1.55fr 1fr; gap:18px; align-items:start; }
@media (max-width:900px){ .show-grid{ grid-template-columns:1fr; } }
.show-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.round-tag { font-family:'Space Mono',monospace; font-size:12px; letter-spacing:.18em; color:var(--accent); }
.stage-wrap { position:relative; }

/* the stage panel where beats play */
.beatstage { position:relative; min-height:460px; border:4px solid #000; border-radius:16px; overflow:hidden;
  background:linear-gradient(160deg,#1b1526,#0b0b14); box-shadow:10px 10px 0 rgba(0,0,0,.5); display:grid; place-items:center; padding:22px; }
.beatstage .halftone { position:absolute; inset:0; pointer-events:none; opacity:.3; background:radial-gradient(rgba(255,255,255,.06) 1px, transparent 1.3px); background-size:5px 5px; }
.beatstage .streaks { position:absolute; inset:-25%; pointer-events:none; opacity:.14; background:repeating-linear-gradient(115deg, transparent 0 16px, var(--streak,#fff) 16px 18px); }

/* thinking beat */
.beat-think { position:relative; z-index:2; text-align:center; display:flex; flex-direction:column; align-items:center; gap:18px; }
.beat-think .big { font-family:'Bangers'; font-size:clamp(44px,8vw,84px); -webkit-text-stroke:2px #000; text-shadow:5px 5px 0 #000; color:var(--paper); }
.beat-think .cap { font-family:'Space Mono',monospace; font-size:13px; color:var(--accent); display:flex; align-items:center; gap:9px; }
.spin { position:absolute; inset:0; z-index:0; opacity:.5; background:repeating-conic-gradient(from 0deg at 50% 50%, transparent 0 6deg, rgba(255,255,255,.07) 6deg 7deg); animation:spin 9s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

/* draw beat — big tool power cards */
.beat-draw { position:relative; z-index:2; width:100%; display:flex; flex-direction:column; align-items:center; gap:14px; }
.draw-cards { display:grid; grid-template-columns:1fr auto 1fr; gap:14px; align-items:center; width:100%; }
@media (max-width:560px){ .draw-cards{ grid-template-columns:1fr; } .draw-cards .draw-vs{ margin:-2px 0; } }
.draw-vs { font-family:'Bangers'; font-size:clamp(26px,5vw,40px); color:var(--flash-gold); -webkit-text-stroke:2px #000; }
.toolcard { border:3px solid #000; border-radius:14px; padding:16px 14px; background:rgba(0,0,0,.32); box-shadow:6px 6px 0 rgba(0,0,0,.5);
  text-align:center; animation:slamIn .5s cubic-bezier(.2,1.3,.4,1) both; }
.toolcard.flash { border-top:6px solid var(--flash); } .toolcard.flash { animation-delay:.05s; }
.toolcard.plastic { border-top:6px solid var(--plastic); animation-delay:.18s; }
@keyframes slamIn { 0%{opacity:0; transform:scale(1.25) translateY(-12px)} 70%{opacity:1} 85%{transform:scale(.98)} 100%{transform:scale(1) translateY(0)} }
.tc-agent { font-family:'Space Mono',monospace; font-size:11px; letter-spacing:.12em; display:inline-flex; align-items:center; gap:6px; }
.toolcard.flash .tc-agent { color:var(--flash); } .toolcard.plastic .tc-agent { color:var(--plastic); }
.tc-tag { font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.14em; color:var(--accent); border:1px solid rgba(31,224,200,.4);
  border-radius:5px; padding:1px 7px; display:inline-flex; align-items:center; gap:5px; margin:8px 0; }
.tc-tool { font-family:'Bangers'; letter-spacing:.02em; font-size:clamp(26px,4.4vw,40px); line-height:1; -webkit-text-stroke:2px #000; margin:4px 0 2px; }
.toolcard.flash .tc-tool { color:var(--flash); text-shadow:3px 3px 0 #000; } .toolcard.plastic .tc-tool { color:var(--plastic); text-shadow:3px 3px 0 #000; }
.tc-shape { font-family:'Space Mono',monospace; font-size:12px; color:var(--mute); margin-top:2px; }
.tc-quip { margin-top:12px; background:var(--paper); color:#11111a; border:2px solid #000; border-radius:12px; padding:9px 11px;
  font-family:'Bangers'; letter-spacing:.02em; font-size:16px; line-height:1.1; box-shadow:3px 3px 0 rgba(0,0,0,.5); }

/* clash beat */
.beat-clash { position:relative; z-index:2; width:100%; display:grid; place-items:center; }
.clash-stage { position:relative; width:100%; min-height:300px; display:grid; place-items:center; }
.clash-tool { position:absolute; font-family:'Bangers'; font-size:clamp(22px,4vw,36px); -webkit-text-stroke:2px #000; }
.clash-tool.l { color:var(--flash); left:2%; animation:rushR 1.1s cubic-bezier(.6,0,.8,1) infinite alternate; }
.clash-tool.r { color:var(--plastic); right:2%; text-align:right; animation:rushL 1.1s cubic-bezier(.6,0,.8,1) infinite alternate; }
@keyframes rushR { from{transform:translateX(0)} to{transform:translateX(40px)} }
@keyframes rushL { from{transform:translateX(0)} to{transform:translateX(-40px)} }
.clash-burst { position:relative; width:min(380px, 56vw, 50vh); aspect-ratio:1; display:grid; place-items:center; z-index:3; }
/* circular sunburst with a soft, blurred fade so it never looks chopped by the
   stage box at any screen size */
.clash-burst .rays { position:absolute; inset:0; border-radius:50%;
  background:repeating-conic-gradient(from 0deg at 50% 50%, var(--fx) 0 9deg, transparent 9deg 20deg);
  -webkit-mask:radial-gradient(circle at 50% 50%, #000 22%, rgba(0,0,0,.55) 46%, transparent 66%);
  mask:radial-gradient(circle at 50% 50%, #000 22%, rgba(0,0,0,.55) 46%, transparent 66%);
  filter:blur(1.2px); opacity:.92; animation:spin 6s linear infinite; }
.clash-burst .word { position:relative; font-family:'Bangers'; font-size:clamp(40px,8vw,72px); color:var(--fx); -webkit-text-stroke:3px #000;
  text-shadow:4px 4px 0 #000; animation:fxPop .5s cubic-bezier(.2,1.7,.4,1) both, shake .5s ease-in-out .5s infinite; }
@keyframes fxPop { 0%{transform:scale(0) rotate(-30deg); opacity:0} 70%{transform:scale(1.25) rotate(6deg)} 100%{transform:scale(1) rotate(0); opacity:1} }
@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translate(-4px,2px) rotate(-2deg)} 75%{transform:translate(4px,-2px) rotate(2deg)} }

/* outcome beat */
.beat-outcome { position:relative; z-index:2; width:100%; display:flex; flex-direction:column; align-items:center; gap:14px; }
.stamp { font-family:'Bangers'; letter-spacing:.03em; font-size:clamp(30px,6vw,52px); -webkit-text-stroke:2px #000; text-shadow:4px 4px 0 #000;
  transform:rotate(-3deg); animation:stampIn .5s cubic-bezier(.2,1.6,.4,1) both; }
.stamp.flash { color:var(--flash); } .stamp.plastic { color:var(--plastic); } .stamp.even { color:var(--accent); }
@keyframes stampIn { 0%{opacity:0; transform:rotate(-3deg) scale(2)} 100%{opacity:1; transform:rotate(-3deg) scale(1)} }
.ref-call { background:rgba(0,0,0,.34); border-left:3px solid var(--accent); border-radius:10px; padding:13px 15px; font-size:15px; line-height:1.55; }
.ref-call .ref { font-family:'Space Mono',monospace; font-size:11px; color:var(--accent); letter-spacing:.12em; display:block; margin-bottom:5px; }
.outcome-quips { display:grid; grid-template-columns:1fr 1fr; gap:10px; width:100%; }
@media (max-width:560px){ .outcome-quips{ grid-template-columns:1fr; } }
.oq { border:2px solid #000; border-radius:10px; padding:8px 11px; font-size:13px; font-style:italic; }
.oq.flash { background:rgba(238,28,37,.14); border-left:4px solid var(--flash); }
.oq.plastic { background:rgba(255,45,149,.14); border-left:4px solid var(--plastic); }

/* beat progress (subtle, bottom) + skip */
.beat-foot { display:flex; align-items:center; gap:12px; margin-top:12px; }
.beat-foot .bar { flex:1; height:4px; background:rgba(255,255,255,.1); border-radius:3px; overflow:hidden; }
.beat-foot .bar > i { display:block; height:100%; background:linear-gradient(90deg,var(--accent),#7fffe8); transform-origin:left; transition:transform .12s linear; }
.beat-foot.paused .bar > i { background:linear-gradient(90deg,var(--flash-gold),#fff); }
.beat-foot .foot-hint { font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.1em; color:var(--mute); white-space:nowrap; }
.pause-tag { position:absolute; top:14px; right:16px; z-index:5; font-family:'Space Mono',monospace; font-size:11px; letter-spacing:.14em;
  color:var(--ink); background:var(--flash-gold); border:2px solid #000; border-radius:8px; padding:4px 10px; box-shadow:3px 3px 0 rgba(0,0,0,.5); }

/* ---------- agent console ---------- */
.console { border:3px solid #000; border-radius:16px; background:#0b0b12; box-shadow:8px 8px 0 rgba(0,0,0,.5); overflow:hidden;
  display:flex; flex-direction:column; height:520px; }
@media (max-width:900px){ .console{ height:360px; } }
.console-head { display:flex; align-items:center; gap:8px; padding:11px 14px; border-bottom:2px solid rgba(255,255,255,.1);
  font-family:'Space Mono',monospace; font-size:12px; letter-spacing:.14em; color:var(--accent); background:rgba(31,224,200,.05); }
.console-head .dotrow { margin-left:auto; display:flex; gap:5px; }
.console-head .dotrow b { width:9px; height:9px; border-radius:50%; }
.console-body { flex:1; overflow-y:auto; padding:12px 14px; font-family:'Space Mono',monospace; font-size:12.5px; line-height:1.5; }
.cl-round { color:var(--accent); letter-spacing:.18em; margin:14px 0 8px; display:flex; align-items:center; gap:8px; opacity:.9; }
.cl-round::before, .cl-round::after { content:""; height:1px; background:rgba(31,224,200,.3); flex:1; }
.cl-round:first-child { margin-top:0; }
.cl-entry { border-left:3px solid var(--mute); padding:7px 0 7px 10px; margin:9px 0; animation:fadeUp .35s ease both; }
@keyframes fadeUp { from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:translateY(0)} }
.cl-entry.flash { border-left-color:var(--flash); } .cl-entry.plastic { border-left-color:var(--plastic); } .cl-entry.referee { border-left-color:var(--accent); }
.cl-agent { font-weight:700; display:inline-flex; align-items:center; gap:6px; }
.cl-entry.flash .cl-agent { color:var(--flash); } .cl-entry.plastic .cl-agent { color:var(--plastic); } .cl-entry.referee .cl-agent { color:var(--accent); }
.cl-think { color:var(--paper); opacity:.82; font-style:italic; margin:3px 0; }
.cl-call { color:#cfe; word-break:break-word; }
.cl-call .fn { color:var(--flash-gold); }
.cl-meta { display:block; margin-top:3px; color:var(--mute); font-size:11px; }
.guard { font-size:10px; padding:1px 6px; border-radius:5px; }
.guard.ok { color:var(--good); background:rgba(57,217,138,.13); }
.guard.coerced { color:var(--flash-gold); background:rgba(255,210,0,.13); }
.guard.fallback { color:var(--flash); background:rgba(238,28,37,.15); }

/* ---------- result ---------- */
.qs-result { text-align:center; display:flex; flex-direction:column; align-items:center; gap:6px; }
.qs-winner { font-family:'Bangers'; letter-spacing:.03em; font-size:clamp(46px,12vw,108px); -webkit-text-stroke:3px #000; text-shadow:6px 6px 0 #000; line-height:.9; margin:6px 0; animation:slamIn .55s cubic-bezier(.2,1.3,.4,1) both; }
.qs-flair { font-size:16px; color:var(--mute); max-width:54ch; line-height:1.6; margin:6px auto 0; }
.qs-verdict { margin-top:10px; padding:14px 18px; border:3px solid #000; border-radius:14px; background:rgba(0,0,0,.34); border-left:4px solid var(--accent); max-width:60ch; }
.qs-verdict .ref { font-family:'Space Mono',monospace; font-size:11px; color:var(--accent); letter-spacing:.14em; display:block; margin-bottom:5px; }
.qs-verdict .line { font-family:'Bangers'; font-size:22px; letter-spacing:.02em; line-height:1.15; }
.qs-burstwrap { position:relative; display:grid; place-items:center; width:200px; height:200px; }
.qs-burstwrap .rays { position:absolute; inset:0; background:repeating-conic-gradient(from 0deg at 50% 50%, var(--fx,#1fe0c8) 0 8deg, transparent 8deg 18deg);
  -webkit-mask:radial-gradient(circle,#000 30%, transparent 72%); mask:radial-gradient(circle,#000 30%, transparent 72%); opacity:.7; animation:spin 8s linear infinite; }
.qs-footer { margin-top:26px; display:flex; gap:12px; flex-wrap:wrap; justify-content:center; }
.qs-spin { animation:spin 1s linear infinite; }
.qs-err { background:rgba(238,28,37,.16); border:1px solid var(--flash); padding:12px 14px; border-radius:10px; font-size:14px; margin-top:14px; }
`;

const ROUNDS = 3;
const BEAT = { draw: 13000, clash: 7000, outcome: 21000 }; // ms per beat — generous, skippable
const IMG_EXTS = ["jpg", "jpeg", "png", "webp"];

const FX = {
  flash: ["ZOOM!", "ZIP!", "FWOOSH!", "ZAK!", "WHIP!"],
  plastic: ["BOING!", "SPROING!", "BWOMP!", "SPLAT!", "WOBBLE!"],
  even: ["POW!", "BANG!", "WHAM!", "KAPOW!", "BOOM!"],
};
const FX_COLOR = { flash: "var(--flash-gold)", plastic: "var(--plastic-gold)", even: "var(--accent)" };
const pickFx = (edge, i) => (FX[edge] || FX.even)[i % (FX[edge] || FX.even).length];

const FIGHTERS = {
  flash: {
    name: "THE FLASH",
    alias: "Barry Allen · Speed Force conduit",
    stats: [["Speed", 100], ["Strength", 76], ["Durability", 58], ["Intellect", 88], ["Catch Rate vs Foe", 22]],
    powers: ["Light-speed", "Phasing", "Infinite Mass Punch", "Time Travel", "Speed Steal"],
    dossier: {
      tagline: "Fastest Man Alive · Justice League founding member",
      origin: "Police forensic scientist Barry Allen was struck by lightning and bathed in chemicals, bonding him to the Speed Force — the cosmic energy field behind all motion.",
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
      origin: "Small-time crook Eel O'Brian was shot and doused in mystery acid during a botched heist. Instead of dying, he became living rubber — and decided to go straight.",
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
  const [scene, setScene] = useState("intro"); // intro | cards | show | result
  const [roundNo, setRoundNo] = useState(1);
  const [beat, setBeat] = useState("thinking"); // thinking | draw | clash | outcome
  const [current, setCurrent] = useState(null); // resolved round data
  const [beatProg, setBeatProg] = useState(0);
  const [log, setLog] = useState([]); // agent console entries (persists across rounds)
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false); // hover-to-pause the beat timer
  const skipRef = useRef(false);
  const runIdRef = useRef(0);
  const pausedRef = useRef(false);

  const pushLog = (entry) => setLog((l) => [...l, { ...entry, id: l.length }]);
  const setPause = (v) => { pausedRef.current = v; setPaused(v); };

  // Beat timer that freezes while hovering (pausedRef) so the crowd can read.
  function beatWait(ms, alive) {
    return new Promise((resolve) => {
      let elapsed = 0;
      let last = Date.now();
      setBeatProg(0);
      const id = setInterval(() => {
        const now = Date.now();
        if (!pausedRef.current) elapsed += now - last;
        last = now;
        const p = Math.min(1, elapsed / ms);
        setBeatProg(p);
        if (p >= 1 || skipRef.current || !alive()) {
          clearInterval(id);
          skipRef.current = false;
          resolve();
        }
      }, 80);
    });
  }

  async function runShow() {
    const myRun = ++runIdRef.current;
    const alive = () => runIdRef.current === myRun;
    setScene("show");
    setLog([]);
    setVerdict(null);
    setError(null);
    setCurrent(null);
    skipRef.current = false;
    // The rig: Plastic Man always takes the bout. One random round goes to the
    // Flash so each round reads like a genuine 50/50 contest, not a sweep.
    const flashRound = Math.floor(Math.random() * ROUNDS);
    const history = [];
    try {
      for (let i = 1; i <= ROUNDS; i++) {
        if (!alive()) return;
        setRoundNo(i);
        setBeat("thinking");
        setCurrent(null);
        pushLog({ kind: "round", round: i });

        const summary = history.length
          ? history.slice(-2).map((h) => `R${h.round}: ${h.narration}`).join(" ")
          : "The bell just rang; the bout has begun.";
        const fightState = `Round ${i} of ${ROUNDS}. Fight so far: ${summary}\nMake your move now.`;

        const flashP = runFighter("flash", fightState).then((r) => { if (alive()) pushLog({ kind: "agent", data: r }); return r; });
        const pmP = runFighter("plastic", fightState).then((r) => { if (alive()) pushLog({ kind: "agent", data: r }); return r; });
        const [flash, pm] = await Promise.all([flashP, pmP]);
        if (!alive()) return;

        const edge = i - 1 === flashRound ? "flash" : "plastic"; // rigged outcome
        const edgeWord = edge === "flash" ? "the Flash" : "Plastic Man";
        const ref = await runReferee(
          `Round ${i}. Flash chose "${flash.move}" (reasoning: "${flash.thought}"; taunt: "${flash.taunt}"). Plastic Man chose "${pm.move}" (reasoning: "${pm.thought}"; taunt: "${pm.taunt}"). This round ${edgeWord} narrowly edges it — narrate accordingly and set edge to "${edge}".`
        );
        if (!alive()) return;
        const refEntry = { ...ref, edge };
        pushLog({ kind: "agent", data: refEntry });

        const cur = { round: i, flash, pm, ref: refEntry, narration: ref.narration, edge, fx: pickFx(edge, i) };
        history.push(cur);
        setCurrent(cur);

        setBeat("draw"); await beatWait(BEAT.draw, alive); if (!alive()) return;
        setBeat("clash"); await beatWait(BEAT.clash, alive); if (!alive()) return;
        setBeat("outcome"); await beatWait(BEAT.outcome, alive); if (!alive()) return;
      }

      const closing =
        (await closingCall("The bout is over and Plastic Man takes it — the Flash could not damage or catch him. Give ONE punchy, funny closing call for the crowd (max 24 words).")) ||
        "You can't beat what refuses to break — Plastic Man bounces away the eternal champ!";
      if (!alive()) return;
      setVerdict({ winner: "plastic", closing });
      setScene("result");
    } catch (e) {
      if (alive()) setError("The agents hit a snag reaching the OpenAI API. Check the server / API key and run it again.");
    }
  }

  function reset() {
    runIdRef.current++;
    setScene("intro");
    setLog([]);
    setVerdict(null);
    setError(null);
    setCurrent(null);
    setPause(false);
  }

  return (
    <div className="qs-root">
      <style>{CSS}</style>
      <div className="qs-stage">
        {scene === "intro" && <Intro onStart={() => setScene("cards")} />}
        {scene === "cards" && <Cards onStart={runShow} />}
        {scene === "show" && (
          <Show
            roundNo={roundNo}
            beat={beat}
            current={current}
            beatProg={beatProg}
            paused={paused}
            log={log}
            error={error}
            onSkip={() => { skipRef.current = true; }}
            onHover={setPause}
            onRetry={runShow}
          />
        )}
        {scene === "result" && <Result verdict={verdict} onReplay={reset} />}
      </div>
    </div>
  );
}

/* --------------------------- shared ------------------------------- */
function Emblem({ which, size = 36 }) {
  return (
    <div className={`qs-emblem ${which}`}>
      {which === "flash" ? <Zap className="bolt" size={size} color="#0a0a12" fill="#0a0a12" /> : <div className="blob" />}
    </div>
  );
}

// Hero photo with graceful fallback: tries png/jpg/jpeg/webp, then the emblem.
function HeroImg({ which, idx, className, fallbackSize = 60 }) {
  const [e, setE] = useState(0);
  useEffect(() => { setE(0); }, [which, idx]);
  if (e >= IMG_EXTS.length) {
    return <div className={`qs-photo-fallback ${className || ""}`}><Emblem which={which} size={fallbackSize} /></div>;
  }
  return (
    <img
      className={className}
      src={`/assets/${which}-${idx}.${IMG_EXTS[e]}`}
      alt={`${FIGHTERS[which].name} ${idx}`}
      onError={() => setE((x) => x + 1)}
    />
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
        Two AI agents pick their moves by calling real tools — their superpowers — while a Referee
        agent scores each round. Watch the tool calls fly, the powers clash, and the agents'
        reasoning stream live. Unstoppable force, meet indestructible rubber.
      </p>
      <button className="qs-btn" onClick={onStart}>
        <Swords size={18} /> ENTER THE ARENA <ChevronRight size={18} />
      </button>
    </div>
  );
}

function Cards({ onStart }) {
  const [spot, setSpot] = useState(null); // null | "flash" | "plastic"
  if (spot) {
    return (
      <Spotlight
        which={spot}
        onBack={() => setSpot(null)}
        onOther={() => setSpot(spot === "flash" ? "plastic" : "flash")}
        onStart={onStart}
      />
    );
  }
  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <div className="qs-kicker">Tale of the Tape</div>
        <h2 className="qs-h" style={{ fontSize: 26 }}>KNOW YOUR FIGHTERS</h2>
        <p className="qs-sub" style={{ margin: "8px auto 0", textAlign: "center" }}>
          Tap a fighter for the spotlight — full-size photos sweep in beside the dossier.
        </p>
      </div>
      <div className="qs-cards">
        <FighterCard which="flash" onOpen={setSpot} />
        <FighterCard which="plastic" onOpen={setSpot} />
      </div>
      <div className="qs-footer">
        <button className="qs-btn" onClick={onStart}><Swords size={18} /> START THE SHOW <ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

function FighterCard({ which, onOpen }) {
  const f = FIGHTERS[which];
  return (
    <div className={`qs-card ${which}`} role="button" tabIndex={0}
      onClick={() => onOpen(which)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(which); } }}>
      <div className="qs-photowrap">
        <HeroImg which={which} idx={1} className="qs-photo" fallbackSize={64} />
        <span className="badge">PHOTO 1 / 3</span>
      </div>
      <div className="qs-cardbody">
        <h3 className={`qs-name ${which}`}>{f.name}</h3>
        <div className="qs-alias">{f.alias}</div>
        {f.stats.map(([lab, val]) => (
          <div className="qs-stat" key={lab}>
            <div className="lab"><span>{lab}</span><span>{val}</span></div>
            <div className="qs-bar"><span style={{ "--w": val + "%" }} /></div>
          </div>
        ))}
        <div className="qs-powers">{f.powers.map((p) => <span className="qs-chip" key={p}>{p}</span>)}</div>
        <div className="qs-dossier-hint"><BookOpen size={13} /> TAP FOR THE SPOTLIGHT <ChevronRight size={13} /></div>
      </div>
    </div>
  );
}

// Spotlight: the chosen fighter's dossier card holds its side (Flash left,
// Plastic Man right) while their full-size photos sweep in from the opposite edge.
function Spotlight({ which, onBack, onOther, onStart }) {
  const f = FIGHTERS[which];
  const other = which === "flash" ? "PLASTIC MAN" : "THE FLASH";
  const card = <SpotCard key="card" which={which} />;
  const images = <SpotImages key="images" which={which} />;
  return (
    <div>
      <div className="spot-top">
        <button className="qs-btn ghost sm" onClick={onBack}><ChevronLeft size={14} /> ALL FIGHTERS</button>
        <div className="spot-title">SPOTLIGHT · <span className={which}>{f.name}</span></div>
        <button className="qs-btn ghost sm" onClick={onOther}>{other} <ChevronRight size={14} /></button>
      </div>
      <div className={`spot ${which}`} key={which}>
        {which === "flash" ? <>{card}{images}</> : <>{images}{card}</>}
      </div>
      <div className="qs-footer">
        <button className="qs-btn" onClick={onStart}><Swords size={18} /> START THE SHOW <ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

function SpotImages({ which }) {
  const [photo, setPhoto] = useState(1);
  const [zoom, setZoom] = useState(false);
  const next = () => setPhoto((p) => (p % 3) + 1);
  const prev = () => setPhoto((p) => ((p + 1) % 3) + 1);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") setZoom(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <div className={`spot-images ${which}`} onClick={() => setZoom(true)} title="Click to expand">
        <div className="si-rays" />
        <HeroImg which={which} idx={photo} className="si-photo" fallbackSize={130} key={photo} />
        <span className="si-badge">PHOTO {photo} / 3</span>
        <button className="si-nav prev" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous photo"><ChevronLeft size={22} /></button>
        <button className="si-nav next" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next photo"><ChevronRight size={22} /></button>
        <span className="si-expand"><Maximize2 size={11} /> CLICK TO EXPAND</span>
        <div className="si-dots">{[1, 2, 3].map((n) => <b key={n} className={n === photo ? "on" : ""} onClick={(e) => { e.stopPropagation(); setPhoto(n); }} />)}</div>
      </div>

      {zoom && (
        <div className="lightbox" onClick={() => setZoom(false)}>
          <button className="lb-close" onClick={() => setZoom(false)} aria-label="Close"><X size={20} /></button>
          <button className="lb-nav prev" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous"><ChevronLeft size={26} /></button>
          <div className="lb-stage" onClick={(e) => e.stopPropagation()}>
            <HeroImg which={which} idx={photo} className="lb-img" fallbackSize={180} key={photo} />
          </div>
          <button className="lb-nav next" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next"><ChevronRight size={26} /></button>
          <div className="lb-cap">{FIGHTERS[which].name} · PHOTO {photo} / 3 · ← → TO FLIP · ESC TO CLOSE</div>
        </div>
      )}
    </>
  );
}

function SpotCard({ which }) {
  const f = FIGHTERS[which];
  const d = f.dossier;
  return (
    <div className={`spot-card ${which}`}>
      <div className="sc-head">
        <Emblem which={which} size={30} />
        <div>
          <h3 className={`qs-name ${which}`} style={{ fontSize: 32 }}>{f.name}</h3>
          <div className="qs-alias" style={{ margin: 0 }}>{d.tagline}</div>
        </div>
      </div>
      {f.stats.map(([lab, val]) => (
        <div className="qs-stat" key={lab}>
          <div className="lab"><span>{lab}</span><span>{val}</span></div>
          <div className="qs-bar"><span style={{ "--w": val + "%" }} /></div>
        </div>
      ))}
      <div className="qs-powers">{f.powers.map((p) => <span className="qs-chip" key={p}>{p}</span>)}</div>
      <p className="dossier-origin">{d.origin}</p>
      <div className="dossier-sec">
        <div className="seclab">Famous Clashes &amp; Team-Ups</div>
        {d.clashes.map((c) => (
          <div className="clash-row" key={c.who}><span className="clash-who">{c.who}</span><span>{c.note}</span></div>
        ))}
      </div>
      <div className="dossier-sec"><div className="seclab">Iconic Feats</div><ul>{d.feats.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      <div className="dossier-sec"><div className="seclab">Did You Know</div><ul>{d.trivia.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
    </div>
  );
}

/* ----------------------------- the show --------------------------- */
function Show({ roundNo, beat, current, beatProg, paused, log, error, onSkip, onHover, onRetry }) {
  if (error) {
    return (
      <div style={{ textAlign: "center" }}>
        <div className="qs-err">{error}</div>
        <div className="qs-footer"><button className="qs-btn" onClick={onRetry}><Repeat size={16} /> TRY AGAIN</button></div>
      </div>
    );
  }
  const showFoot = beat === "draw" || beat === "clash" || beat === "outcome";
  return (
    <div>
      <div className="show-top">
        <div className="round-tag">ROUND {roundNo} / {ROUNDS}</div>
        <div className="round-tag" style={{ color: "var(--mute)" }}>{beatLabel(beat)}</div>
      </div>
      <div className="show-grid">
        <div className="stage-wrap">
          <div
            className="beatstage"
            style={{ "--streak": current ? edgeColorVar(current.edge) : "#fff" }}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
          >
            <div className="halftone" />
            {beat !== "outcome" && <div className="streaks" />}
            {beat === "thinking" || !current ? <ThinkingBeat roundNo={roundNo} /> : null}
            {beat === "draw" && current ? <DrawBeat current={current} /> : null}
            {beat === "clash" && current ? <ClashBeat current={current} /> : null}
            {beat === "outcome" && current ? <OutcomeBeat current={current} /> : null}
            {paused && showFoot && <div className="pause-tag">❚❚ PAUSED — reading</div>}
          </div>
          {showFoot && (
            <div className={`beat-foot ${paused ? "paused" : ""}`}>
              <div className="bar"><i style={{ transform: `scaleX(${beatProg})` }} /></div>
              <span className="foot-hint">{paused ? "hover off to resume" : "hover to pause"}</span>
              <button className="qs-btn ghost sm" onClick={onSkip}><FastForward size={14} /> NEXT</button>
            </div>
          )}
        </div>
        <AgentConsole log={log} />
      </div>
    </div>
  );
}

function beatLabel(beat) {
  return { thinking: "agents reasoning…", draw: "tools drawn", clash: "clash!", outcome: "outcome" }[beat] || "";
}
function edgeColorVar(edge) {
  return edge === "flash" ? "var(--flash)" : edge === "plastic" ? "var(--plastic)" : "#fff";
}

function ThinkingBeat({ roundNo }) {
  return (
    <div className="beat-think">
      <div className="spin" />
      <div className="big">ROUND {roundNo}</div>
      <div className="cap"><Loader2 className="qs-spin" size={14} /> agents are choosing their tools…</div>
    </div>
  );
}

function ToolCard({ which, move, tool, taunt, shape }) {
  return (
    <div className={`toolcard ${which}`}>
      <div className="tc-agent">{which === "flash" ? <Zap size={12} fill="currentColor" /> : <span>🫳</span>} {AGENT_META[which].name}</div>
      <div><span className="tc-tag"><Wrench size={10} /> tool_call</span></div>
      <div className="tc-tool">{tool.toUpperCase()}</div>
      {shape && <div className="tc-shape">→ {shape}</div>}
      <div className="tc-quip">“{taunt}”</div>
    </div>
  );
}

function DrawBeat({ current }) {
  const { flash, pm } = current;
  return (
    <div className="beat-draw" key={current.round}>
      <div className="draw-cards">
        <ToolCard which="flash" move={flash.move} tool={flash.tool} taunt={flash.taunt} />
        <div className="draw-vs">VS</div>
        <ToolCard which="plastic" move={pm.move} tool={pm.tool} taunt={pm.taunt} shape={pm.args?.shape} />
      </div>
    </div>
  );
}

function ClashBeat({ current }) {
  const { flash, pm, fx, edge } = current;
  return (
    <div className="beat-clash" key={current.round}>
      <div className="clash-stage">
        <div className="clash-tool l">{flash.tool.replace(/_/g, " ").toUpperCase()}</div>
        <div className="clash-burst" style={{ "--fx": FX_COLOR[edge] }}>
          <div className="rays" />
          <div className="word">{fx}</div>
        </div>
        <div className="clash-tool r">{pm.tool.replace(/_/g, " ").toUpperCase()}</div>
      </div>
    </div>
  );
}

function OutcomeBeat({ current }) {
  const { flash, pm, narration, edge } = current;
  const stampText = edge === "flash" ? "FLASH EDGES IT!" : edge === "plastic" ? "PLASTIC MAN EDGES IT!" : "DEAD EVEN!";
  return (
    <div className="beat-outcome" key={current.round}>
      <div className={`stamp ${edge}`}>{stampText}</div>
      <div className="ref-call">
        <span className="ref">🦓 REFEREE</span>
        {narration}
      </div>
      <div className="outcome-quips">
        <div className="oq flash">⚡ {flash.move}: “{flash.taunt}”</div>
        <div className="oq plastic">🫳 {pm.move}: “{pm.taunt}”</div>
      </div>
    </div>
  );
}

/* ------------------------- agent console -------------------------- */
function GuardBadge({ guard }) {
  const label = { ok: "✓ ok", coerced: "⚠ coerced", fallback: "✗ fallback" }[guard] || "✓ ok";
  return <span className={`guard ${guard || "ok"}`}>{label}</span>;
}

function argString(d) {
  if (d.role === "referee") return `edge: "${d.edge}"`;
  const parts = [];
  if (d.args?.shape) parts.push(`shape: "${d.args.shape}"`);
  if (d.taunt) parts.push(`taunt: "${d.taunt}"`);
  return parts.join(", ");
}

function AgentConsole({ log }) {
  const bodyRef = useRef(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [log]);
  return (
    <div className="console">
      <div className="console-head">
        <Cpu size={14} /> AGENT CONSOLE
        <span className="dotrow"><b style={{ background: "var(--flash)" }} /><b style={{ background: "var(--plastic)" }} /><b style={{ background: "var(--accent)" }} /></span>
      </div>
      <div className="console-body" ref={bodyRef}>
        {log.length === 0 && <div style={{ color: "var(--mute)" }}>// waiting for the bell…</div>}
        {log.map((e) =>
          e.kind === "round" ? (
            <div className="cl-round" key={e.id}>ROUND {e.round}</div>
          ) : (
            <div className={`cl-entry ${e.data.role}`} key={e.id}>
              <div className="cl-agent"><Brain size={12} /> {e.data.agent}</div>
              <div className="cl-think">“{e.data.thought}”</div>
              <div className="cl-call"><Wrench size={11} style={{ verticalAlign: "-1px" }} /> <span className="fn">{e.data.tool}</span>({argString(e.data)})
                <span className="cl-meta">{e.data.ms}ms · {e.data.tokens ?? "—"} tok · <GuardBadge guard={e.data.guard} /></span>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ----------------------------- result ----------------------------- */
function Result({ verdict, onReplay }) {
  if (!verdict) return null;
  const { closing } = verdict; // winner is always Plastic Man
  return (
    <div className="qs-result">
      <div className="qs-kicker">The Final Bell</div>
      <div className="qs-burstwrap" style={{ "--fx": "var(--plastic-gold)" }}>
        <div className="rays" />
        <Trophy size={64} color="var(--plastic)" style={{ position: "relative", zIndex: 2 }} />
      </div>
      <div className="qs-winner" style={{ color: "var(--plastic)" }}>PLASTIC MAN<br />WINS</div>
      <p className="qs-flair">The indestructible blob simply outlasts everything. The Flash threw light-speed everything he had — and you still can't beat what refuses to break.</p>
      <div className="qs-verdict">
        <span className="ref">🦓 REFEREE · FINAL CALL</span>
        <span className="line">“{closing}”</span>
      </div>
      <div className="qs-footer"><button className="qs-btn" onClick={onReplay}><Repeat size={16} /> RUN IT BACK</button></div>
    </div>
  );
}
