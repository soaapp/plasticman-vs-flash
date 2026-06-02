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

// Run the real Qiskit Hadamard-and-measure circuit on the Aer simulator.
// Returns { outcome, bit, counts, shots, backend } — see server/quantum/collapse.py.
export async function collapseWavefunction({ momentum = 0 } = {}) {
  const res = await fetch("/api/quantum/collapse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ momentum }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Quantum collapse ${res.status}: ${detail}`);
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
