// Thin client for the Express backend. The browser never sees the API key —
// every model call is proxied through /api/chat (OpenAI) on the server.

// Low-level chat call. Pass `tools` + `tool_choice` to force tool-calling.
// Returns { text, tool_calls, usage, model }.
export async function chat({ system, user, tools, tool_choice }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user, tools, tool_choice }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Chat proxy ${res.status}: ${detail}`);
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
