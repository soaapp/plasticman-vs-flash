import "dotenv/config";
import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

/* ------------------------- OpenAI API proxy ----------------------- *
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

    const chosenModel = model || OPENAI_MODEL;
    const payload = {
      model: chosenModel,
      messages,
      // GPT-5 / o-series require max_completion_tokens; it also works on 4o.
      max_completion_tokens: max_tokens || 2000,
    };
    // GPT-5 supports a reasoning_effort knob; "minimal" keeps the show snappy.
    if (/^gpt-5/.test(chosenModel)) {
      payload.reasoning_effort = "minimal";
    }

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
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

app.get("/api/health", (_req, res) => res.json({ ok: true, model: OPENAI_MODEL }));

app.listen(PORT, () => {
  console.log(`⚡🫳  Showdown backend on http://localhost:${PORT}`);
  console.log(`     OpenAI proxy: POST /api/chat  (model ${OPENAI_MODEL})`);
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes("REPLACE_ME")) {
    console.warn("     ⚠  OPENAI_API_KEY not set — the OpenAI proxy will return 500 until you add it to .env");
  }
});
