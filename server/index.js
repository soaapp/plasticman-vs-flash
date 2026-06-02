import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

import "dotenv/config";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const QISKIT_PYTHON = process.env.QISKIT_PYTHON
  ? path.resolve(process.cwd(), process.env.QISKIT_PYTHON)
  : path.join(__dirname, "quantum", ".venv", "bin", "python");

// Chance the bout lands on the canonical comic-book answer regardless of the
// qubit: the Flash can't damage him and can't catch him. Set to 0 to disable.
const STALEMATE_PROBABILITY = 0.22;

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

/* ----------------------- 1. OpenAI API proxy ---------------------- *
 * Keeps the API key server-side. The browser POSTs {system, user}; we add
 * the key + model and forward to OpenAI Chat Completions, returning the text. */
app.post("/api/chat", async (req, res) => {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes("REPLACE_ME")) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not set in .env" });
  }
  const { system, user, model, max_tokens } = req.body || {};
  if (typeof user !== "string" || !user.trim()) {
    return res.status(400).json({ error: "Missing 'user' message" });
  }
  try {
    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: user });

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || OPENAI_MODEL,
        max_tokens: max_tokens || 1000,
        messages,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("OpenAI error", upstream.status, data);
      return res.status(upstream.status).json({ error: data?.error?.message || "OpenAI API error" });
    }
    const text = data.choices?.[0]?.message?.content || "";
    res.json({ text });
  } catch (err) {
    console.error("OpenAI proxy failed:", err);
    res.status(502).json({ error: "Failed to reach the OpenAI API" });
  }
});

/* ------------------ 2. Quantum collapse (Qiskit/Aer) -------------- *
 * Spawns the Python script that runs a Hadamard-and-measure circuit on the
 * Aer simulator, maps the measured bit to a winner, and (for the running
 * comic-book gag) occasionally overrides with an eternal stalemate.         */
function runQuantumCircuit(shots = 1024) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, "quantum", "collapse.py");
    const proc = spawn(QISKIT_PYTHON, [script, String(shots)]);
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", (e) => reject(new Error(`Cannot launch Qiskit (${QISKIT_PYTHON}): ${e.message}`)));
    proc.on("close", (code) => {
      let parsed;
      try {
        parsed = JSON.parse(out.trim().split("\n").pop());
      } catch {
        return reject(new Error(`Bad output from circuit (exit ${code}): ${err || out}`));
      }
      if (code !== 0 || parsed.error) return reject(new Error(parsed.error || err || "circuit failed"));
      resolve(parsed);
    });
  });
}

app.post("/api/quantum/collapse", async (req, res) => {
  try {
    const result = await runQuantumCircuit(1024);
    // bit 0 -> flash, bit 1 -> plastic
    let outcome = result.bit === 0 ? "flash" : "plastic";
    if (STALEMATE_PROBABILITY > 0 && Math.random() < STALEMATE_PROBABILITY) {
      outcome = "stalemate";
    }
    res.json({ outcome, ...result });
  } catch (err) {
    console.error("Quantum collapse failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, model: OPENAI_MODEL }));

/* ------------------ 3. Live room poll over WebSockets ------------- *
 * Single shared tally for the room. Each client may switch its vote; the
 * server tracks one vote per connection and broadcasts the tally on change. */
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

const tally = { flash: 0, plastic: 0 };

function pollState() {
  return JSON.stringify({ type: "poll", tally, voters: wss.clients.size });
}

function broadcast() {
  const msg = pollState();
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */) client.send(msg);
  }
}

wss.on("connection", (ws) => {
  ws.vote = null; // this connection's current choice
  ws.send(pollState()); // send the current standings immediately
  broadcast(); // update everyone's voter count

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === "vote" && (msg.choice === "flash" || msg.choice === "plastic")) {
      if (ws.vote === msg.choice) return; // no change
      if (ws.vote) tally[ws.vote] -= 1; // moving their vote
      ws.vote = msg.choice;
      tally[ws.vote] += 1;
      broadcast();
    }
  });

  ws.on("close", () => {
    if (ws.vote) tally[ws.vote] = Math.max(0, tally[ws.vote] - 1);
    broadcast();
  });
});

httpServer.listen(PORT, () => {
  console.log(`⚡🫳  Showdown backend on http://localhost:${PORT}`);
  console.log(`     OpenAI proxy:     POST /api/chat  (model ${OPENAI_MODEL})`);
  console.log(`     Quantum collapse: POST /api/quantum/collapse`);
  console.log(`     Live poll:        ws://localhost:${PORT}/ws`);
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes("REPLACE_ME")) {
    console.warn("     ⚠  OPENAI_API_KEY not set — the OpenAI proxy will return 500 until you add it to .env");
  }
});
