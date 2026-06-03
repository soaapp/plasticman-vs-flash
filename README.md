# Plastic Man vs The Flash — a comic-book agent showdown

Settle the eternal debate as a *show*. A Flash agent and a Plastic Man agent
pick their moves by **calling real OpenAI tools** (their powers), a Quantum
Referee agent scores each round with its own tool — and a **live agent-flow
trace** shows the orchestration happening. It's played out as animated
comic-book panels: giant **POW / BOOM / SPROING** onomatopoeia, speech-bubble
taunts, **in-browser narration**, and a full minute per round so the crowd can
savor the jokes. Paced for a ~10-minute presented slot.

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

On the **Cards** screen, tap either fighter to open a comic-styled **dossier** —
origin, famous clashes and team-ups (Superman, Batman, Wonder Woman,
Reverse-Flash…), iconic feats, and trivia. Good fodder for the warm-up patter.

Then **three paced rounds**, one comic panel at a time. Each round:

1. A **live agent-flow** lights up: the two fighter agents fire in parallel,
   then the referee — each node shows the tool it invoked, latency, token usage,
   and its guardrail check.
2. The panel **slams in** with an animated onomatopoeia — speed-words when the
   Flash edges it, bouncy-words when Plastic Man does — both taunts in comic
   speech bubbles, the referee's play-by-play, and an expandable **agent trace**
   of the raw tool calls. Narration reads it all aloud (toggle, top-right).
3. A **one-minute read window** holds (skippable) so the jokes land and the host
   can riff.

The verdict is the referee's running scorecard, not a coin toss: a fighter must
edge the bout by 2+ rounds to win outright, otherwise it's an **eternal
stalemate**.

## Multi-agent design

Three agents, each backed by the OpenAI API and forced to act through tools
(`tool_choice: "required"`) — defined in [`src/agents.js`](src/agents.js):

| agent | tools (functions) |
| --- | --- |
| **Flash** | `infinite_mass_punch`, `phase_through`, `steal_speed` |
| **Plastic Man** | `reshape`, `absorb_impact`, `regenerate` |
| **Quantum Referee** | `score_round` (`narration`, `edge`) |

The fighters' *powers* are the tools; the model invokes one to choose its move,
passing a taunt (and, for `reshape`, a `shape`) as structured arguments. The
referee records the round with `score_round`.

**Guardrails** wrap every call: tool use is forced, the returned tool must be one
the agent actually owns, arguments are JSON-validated, the `edge` is enum-checked,
taunts are length-clamped, and a bad/missing call triggers one retry then a
canned fallback. Each call's guardrail result (`✓ ok` / `⚠ coerced` / `✗ fallback`)
shows in the flow nodes and the trace.

**Narration** uses the browser's Web Speech API (`speechSynthesis`,
[`src/narrator.js`](src/narrator.js)) — distinct voice profiles per agent, no
backend and no API cost. Toggle it with the speaker button during the show.

## Architecture

```
Browser (Vite + React, :5173)
   └─ /api/* ──proxy──▶ Express (:3001) ──▶ POST /api/chat → OpenAI API
```

Deliberately lightweight. The server's only job is to attach the API key and
forward chat requests (passing through `tools`/`tool_choice` and returning
`tool_calls` + token usage), so the key never reaches the browser.

```
src/
  App.jsx       the whole show (scenes, comic styling, animations, telemetry UI)
  agents.js     tool schemas + guardrailed runFighter/runReferee/closingCall
  narrator.js   Web Speech narration (per-agent voices)
  api.js        chat() → /api/chat
  main.jsx      React entry
server/
  index.js      Express proxy: POST /api/chat, GET /api/health
```

## Tuning

Knobs at the top of `src/App.jsx`:

- `ROUNDS` — number of rounds (default `3`)
- `READ_MS` — read window per round, ms (default `60000` — one minute)
- `MIN_CLASH_MS` — minimum time the live agent-flow stays on screen (default `4200`)
- `FX` — onomatopoeia word pools per edge

Agent tools, prompts, and guardrails live in `src/agents.js`; fighter dossier
content (origin, clashes, feats, trivia) lives in the `FIGHTERS` object in
`src/App.jsx`.

Each round makes 3 OpenAI calls (two fighters + the referee), plus one closing
call per show — so it costs a little API credit per run.

## Roadmap ideas

- Stream tokens for the referee's play-by-play so narration starts sooner.
- A "control room" view: full topology + a scrolling trace log across all rounds.
- Tournament bracket / audience-submitted matchups.
