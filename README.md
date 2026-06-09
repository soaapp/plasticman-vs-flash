# Plastic Man vs The Flash — a comic-book agent showdown

Settle the eternal debate as a *show* for a room of AI engineers. A Flash agent
and a Plastic Man agent pick their moves by **calling real OpenAI tools** (their
superpowers), a Referee agent scores each round with its own tool — and a
**live AGENT CONSOLE** streams every agent's reasoning and tool call as it
happens. Each round plays out as a comic-strip cinematic: the chosen tools **draw**
as giant power-cards, the powers **clash**, and an **outcome** lands with comic FX.

The running gag is the honest one — the Flash can't damage the indestructible,
rubbery Plastic Man, and can never catch him either.

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

### Hero photos

Drop six images into `public/assets/` (`flash-1..3`, `plastic-1..3`) and the
character cards + spotlight pick them up. See
[`public/assets/README.md`](public/assets/README.md). Missing images fall back to
the comic emblem, so the app runs fine without them.

## How the show runs

**Intro → Cards → The Show → Verdict.** Paced for a ~10-minute presented slot.

On the **Cards** screen, tap either fighter for the **spotlight**: their dossier
card holds its side while their **full-size photos sweep in** from the opposite
edge (Flash card left / photos right; Plastic Man mirrored). Flip through the 3
photos and read the origin, famous clashes and team-ups (Superman, Batman, Wonder
Woman, Reverse-Flash…), iconic feats, and trivia.

Then **three rounds**, each a 4-beat cinematic with the **AGENT CONSOLE** alongside:

1. **Reasoning** — both fighter agents call a power tool in parallel, then the
   referee scores; the console streams each agent's `thought` + the raw `tool_call`
   with latency, tokens, and guardrail check.
2. **Draw** — the two chosen tools slam in as giant `tool_call` power-cards with a
   one-line quip each.
3. **Clash** — the powers collide mid-screen with speed-lines and an onomatopoeia
   burst.
4. **Outcome** — the round result stamps in with the referee's play-by-play and
   more quips.

Beats auto-advance (subtle progress bar, no countdown) and each is skippable with
**NEXT**, so the host controls the pace. The bout belongs to the one who simply
can't be beaten — you can't damage what refuses to break.

## Multi-agent design

Three agents, each backed by the OpenAI API and forced to act through tools
(`tool_choice: "required"`) — defined in [`src/agents.js`](src/agents.js):

| agent | tools (functions) |
| --- | --- |
| **Flash** | `infinite_mass_punch`, `phase_through`, `steal_speed` |
| **Plastic Man** | `reshape`, `absorb_impact`, `regenerate` |
| **Referee** | `score_round` |

The fighters' *powers* are the tools; the model invokes one to choose its move,
passing its `thought` (reasoning), a `taunt`, and — for `reshape` — a `shape`. The
referee records the round with `score_round`. Every argument is surfaced in the
AGENT CONSOLE so the orchestration is fully visible.

**Guardrails** wrap every call: tool use is forced, the returned tool must be one
the agent actually owns, arguments are JSON-validated, the `edge` is enum-checked,
taunts are length-clamped, and a bad/missing call triggers one retry then a canned
fallback. Each call's guardrail result (`✓ ok` / `⚠ coerced` / `✗ fallback`) shows
in the console.

## Architecture

```
Browser (Vite + React, :5173)
   └─ /api/* ──proxy──▶ Express (:3001) ──▶ POST /api/chat → OpenAI API
```

Deliberately lightweight. The server's only job is to attach the API key and
forward chat requests (passing through `tools`/`tool_choice` and returning
`tool_calls` + token usage), so the key never reaches the browser.

```
public/assets/   hero photos (flash-1..3, plastic-1..3)
src/
  App.jsx        the whole show (scenes, beats, comic styling, agent console)
  agents.js      tool schemas + guardrailed runFighter/runReferee/closingCall
  api.js         chat() → /api/chat
  main.jsx       React entry
server/
  index.js       Express proxy: POST /api/chat, GET /api/health
```

## Tuning

Knobs at the top of `src/App.jsx`:

- `ROUNDS` — number of rounds (default `3`)
- `BEAT` — ms per beat: `{ draw, clash, outcome }` (default `13000 / 7000 / 21000`)
- `FX` — onomatopoeia word pools per edge

Agent tools, prompts, and guardrails live in `src/agents.js`; fighter dossier
content lives in the `FIGHTERS` object in `src/App.jsx`.

Each round makes 3 OpenAI calls (two fighters + the referee), plus one closing
call per show — so it costs a little API credit per run.

## Roadmap ideas

- Stream tokens for the referee's play-by-play so the console fills in live.
- A "control room" view: full agent topology + a trace log across all rounds.
- Tournament bracket / audience-submitted matchups.
