// Thin client for the Express backend. The browser never sees the API key —
// every model call is proxied through /api/chat (OpenAI) on the server.

export async function callAgent(system, user) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Chat proxy ${res.status}: ${detail}`);
  }
  const data = await res.json();
  return data.text || "";
}

// Run the real Qiskit Hadamard-and-measure circuit on the Aer simulator — the
// final, honest 50/50 coin-flip that decides the bout (the fight never tilts it).
// Returns { outcome, bit, counts, shots, backend } — see server/quantum/worker.py.
export async function collapseWavefunction() {
  const res = await fetch("/api/quantum/collapse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Quantum collapse ${res.status}: ${detail}`);
  }
  return res.json();
}

// Live superposition readout: samples the honest Hadamard on Aer and returns
// the measured distribution (~50/50). Polled on an interval while the qubit
// is still unobserved — it never leans toward whoever's winning the fight.
export async function sampleSuperposition() {
  const res = await fetch("/api/quantum/sample", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Quantum sample ${res.status}: ${detail}`);
  }
  return res.json();
}

export function parseJSON(text, fallback) {
  try {
    const t = text.replace(/```json|```/g, "").trim();
    const m = t.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch (e) {
    /* fall through */
  }
  return fallback;
}
