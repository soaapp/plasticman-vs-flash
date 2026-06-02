# Plastic Man vs The Flash — a comic-book agent showdown

Settle the eternal debate as a *show*. A Flash agent and a Plastic Man agent
trash-talk and trade moves while a Quantum Referee agent calls each round — live
on the OpenAI API, played out as animated comic-book panels with giant
POW/BOOM/SPROING onomatopoeia, speech-bubble taunts, and a 10-second beat per
round so the crowd can actually read the jokes.

The running gag is the honest one: the Flash can't damage the indestructible,
rubbery Plastic Man, and can never catch him either — so the bout tends toward a
glorious stalemate.

## Architecture

```
Browser (Vite/React, :5173)
   │  /api/*  ──proxy──▶  Express server (:3001)
   │                        └─ POST /api/chat  → OpenAI API (key stays server-side)
```

Deliberately lightweight: a Vite + React front end and a thin Express proxy.
The only thing the server does is attach the API key + model and forward chat
requests to OpenAI, so the key never reaches the browser.

### The show
- **Intro → Cards → The Show → Verdict.**
- 5 paced rounds. Each round: a "clash" interstitial covers the generation
  latency, then the panel **slams in** with an animated onomatopoeia (speed-words
  when the Flash edges it, bouncy-words when Plastic Man does), the two taunts in
  comic speech bubbles, and the referee's play-by-play — then a **10-second read
  window** with a skip control.
- The verdict comes from the referee's running scorecard (no randomness): a
  fighter needs to edge the bout by 2+ rounds to win outright, otherwise it's an
  **eternal stalemate**.

## Setup

```bash
npm install
cp .env.example .env   # then edit .env and add your OpenAI key
```

### Environment (`.env`, gitignored)

| var | purpose |
| --- | --- |
| `OPENAI_API_KEY` | key for the server-side OpenAI proxy |
| `OPENAI_MODEL` | model the agents use (default `gpt-5-mini`; `gpt-5-nano` is lighter) |
| `PORT` | back-end port (default `3001`) |

## Run

```bash
npm run dev   # starts Vite (:5173) and the Express proxy (:3001) together
```

Open **http://localhost:5173**.

Run pieces individually with `npm run dev:web` / `npm run dev:api`.

## Tuning the show

All in `src/App.jsx`:

- `ROUNDS` — number of rounds (default 5).
- `READ_MS` — dwell time per round in ms (default 10000).
- `FX` — the onomatopoeia word pools per edge.

A full show is `ROUNDS × 3` OpenAI calls (two fighters + a referee per round)
plus one closing call, so it costs a little API credit each run.
