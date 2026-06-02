# Plastic Man vs The Flash — a comic-book agent showdown

Settle the eternal debate as a *show*. A Flash agent and a Plastic Man agent
trash-talk and trade moves while a Quantum Referee agent calls each round — live
on the OpenAI API, played out as animated comic-book panels: giant
**POW / BOOM / SPROING** onomatopoeia, speech-bubble taunts, and a 10-second beat
per round so the crowd can actually read the jokes.

The running gag is the honest one — the Flash can't damage the indestructible,
rubbery Plastic Man, and can never catch him either — so the bout leans toward a
glorious stalemate.

## Quick start

```bash
npm install
cp .env.example .env          # then add your OpenAI key
npm run dev                   # Vite (:5173) + Express proxy (:3001)
```

Open **http://localhost:5173**.

`.env` (gitignored):

| var | purpose | default |
| --- | --- | --- |
| `OPENAI_API_KEY` | key for the server-side proxy | _(required)_ |
| `OPENAI_MODEL` | model the agents use (`gpt-5-nano` is lighter) | `gpt-5-mini` |
| `PORT` | back-end port | `3001` |

## How the show runs

**Intro → Cards → The Show → Verdict.**

Five paced rounds, one comic panel at a time. Each round:

1. A "clash" interstitial covers the generation latency.
2. The panel **slams in** with an animated onomatopoeia — speed-words when the
   Flash edges it, bouncy-words when Plastic Man does — both taunts in comic
   speech bubbles, and the referee's play-by-play.
3. A **10-second read window** holds (skippable) so the jokes land.

The verdict is the referee's running scorecard, not a coin toss: a fighter must
edge the bout by 2+ rounds to win outright, otherwise it's an **eternal
stalemate**.

## Architecture

```
Browser (Vite + React, :5173)
   └─ /api/* ──proxy──▶ Express (:3001) ──▶ POST /api/chat → OpenAI API
```

Deliberately lightweight. The server's only job is to attach the API key and
model and forward chat requests, so the key never reaches the browser.

```
src/
  App.jsx     the whole show (scenes, comic styling, animations)
  api.js      callAgent() → /api/chat
  main.jsx    React entry
server/
  index.js    Express proxy: POST /api/chat, GET /api/health
```

## Tuning

Knobs at the top of `src/App.jsx`:

- `ROUNDS` — number of rounds (default `5`)
- `READ_MS` — dwell time per round, ms (default `10000`)
- `FX` — onomatopoeia word pools per edge

Each round makes 3 OpenAI calls (two fighters + the referee), plus one closing
call per show — so it costs a little API credit per run.
