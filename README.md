# Plastic Man vs The Flash — Schrödinger's Showdown

A hackathon toy: two AI agents (the Flash and Plastic Man) fight under a Quantum
Referee, the room votes live, and the winner is decided by collapsing a real
qubit. Vite + React front end, Express back end.

## Architecture

```
Browser (Vite/React, :5173)
   │  /api/*  ──proxy──▶  Express server (:3001)
   │                        ├─ POST /api/chat              → OpenAI API (key stays server-side)
   │  /ws     ──proxy──▶    ├─ POST /api/quantum/collapse  → Qiskit Hadamard+measure on Aer (Python)
   │                        └─ WS   /ws                    → live room poll (shared tally)
```

The back end does three things:

1. **OpenAI proxy** (`POST /api/chat`) — the browser sends `{system, user}`;
   the server attaches the API key + model and forwards to OpenAI Chat
   Completions. The key never reaches the client.
2. **Quantum collapse** (`POST /api/quantum/collapse`) — spawns
   [`server/quantum/collapse.py`](server/quantum/collapse.py), which builds a
   single-qubit `H → measure` circuit and runs it on the Qiskit **Aer**
   simulator. The first shot decides the bout; full shot counts are returned for
   display. (A small configurable chance overrides with the canonical comic-book
   *eternal stalemate*.)
3. **Live poll** (`WS /ws`) — every connected screen votes into one shared tally;
   the server broadcasts the standings to the whole room on each change.

## Setup

```bash
npm install
npm run setup:quantum   # creates server/quantum/.venv and installs qiskit + qiskit-aer (needs python3.11)
cp .env.example .env     # then edit .env and add your key
```

### Environment (`.env`, gitignored)

| var | purpose |
| --- | --- |
| `OPENAI_API_KEY` | key for the server-side OpenAI proxy |
| `OPENAI_MODEL` | model the agents use (default `gpt-5-mini`; `gpt-5-nano` is lighter) |
| `PORT` | back-end HTTP/WebSocket port (default `3001`) |
| `QISKIT_PYTHON` | Python interpreter for the circuit (default: the bundled venv) |

## Run

```bash
npm run dev      # starts Vite (:5173) and the Express server (:3001) together
```

Open http://localhost:5173. Open it in a second tab/device to watch the poll
update live.

Run pieces individually with `npm run dev:web` / `npm run dev:api`.

## Production note

Swap the Aer simulator in `collapse.py` for a real hardware backend via
`QiskitRuntimeService` to decide the fight on actual quantum hardware.
