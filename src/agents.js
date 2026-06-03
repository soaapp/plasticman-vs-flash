import { chat } from "./api.js";

/* ------------------------------------------------------------------ *
 *  The multi-agent layer. Each fighter's POWERS are real OpenAI
 *  function tools; the model must invoke exactly one to choose a move
 *  (tool_choice: "required"). The Referee invokes a score_round tool.
 *  runFighter/runReferee wrap each call with guardrails and return rich
 *  telemetry (tool, args, latency, tokens, guardrail status) for the UI.
 * ------------------------------------------------------------------ */

function tool(name, description, properties, required) {
  return {
    type: "function",
    function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } },
  };
}

const taunt = { type: "string", description: "A short, funny, in-character taunt (max ~16 words)." };

export const FIGHTER_TOOLS = {
  flash: [
    tool("infinite_mass_punch", "Throw a light-speed, infinite-mass punch.", { taunt }, ["taunt"]),
    tool("phase_through", "Vibrate your molecules to phase through Plastic Man's attack.", { taunt }, ["taunt"]),
    tool("steal_speed", "Siphon kinetic energy and speed away from the foe.", { taunt }, ["taunt"]),
  ],
  plastic: [
    tool("reshape", "Morph into an absurd object to counter the attack.",
      { shape: { type: "string", description: "The absurd object or shape to become." }, taunt }, ["shape", "taunt"]),
    tool("absorb_impact", "Absorb the hit and bounce it right back.", { taunt }, ["taunt"]),
    tool("regenerate", "Reassemble after being shattered, frozen, or squished.", { taunt }, ["taunt"]),
  ],
};

const SCORE_TOOL = tool(
  "score_round",
  "Record the round's play-by-play and verdict.",
  {
    narration: { type: "string", description: "Vivid, funny play-by-play, 2-3 sentences (~50 words)." },
    edge: { type: "string", enum: ["flash", "plastic", "even"], description: "Who edged the round." },
  },
  ["narration", "edge"]
);

export const MOVE_LABEL = {
  infinite_mass_punch: "Infinite Mass Punch",
  phase_through: "Phase Through",
  steal_speed: "Steal Speed",
  reshape: "Reshape",
  absorb_impact: "Absorb Impact",
  regenerate: "Regenerate",
};

export const AGENT_META = {
  flash: { name: "FLASH agent", tools: FIGHTER_TOOLS.flash.map((t) => t.function.name) },
  plastic: { name: "PLASTIC MAN agent", tools: FIGHTER_TOOLS.plastic.map((t) => t.function.name) },
  referee: { name: "QUANTUM REFEREE", tools: ["score_round"] },
};

const FLASH_SYS = `You are Barry Allen, THE FLASH, in a comedic comic-book battle simulation against Plastic Man — fastest man alive, cocky, heroic, very funny. You MUST act by calling exactly ONE of your power tools, passing a cocky, joke-filled taunt (max 16 words). Do not reply with prose.`;
const PM_SYS = `You are Eel O'Brian, PLASTIC MAN, in a comedic comic-book battle against the Flash — infinitely malleable, basically indestructible, a total goofball. You MUST act by calling exactly ONE of your power tools, passing a goofy, pun-filled taunt (max 16 words). Do not reply with prose.`;
const JUDGE_SYS = `You are the QUANTUM REFEREE calling a Flash vs Plastic Man bout for a hyped lunchtime crowd. Call the score_round tool with hilarious 2-3 sentence play-by-play (~50 words) and the edge. Core running gag: the Flash cannot damage or catch the rubbery, indestructible Plastic Man — so lean into glorious stalemate energy and absurd comedy.`;
const CLOSING_SYS = `You are the QUANTUM REFEREE wrapping up the bout for the crowd. Reply with ONE punchy, funny closing call (max 24 words) — plain text, no quotes, no JSON.`;

const MAX_TAUNT_WORDS = 18;

const FALLBACK = {
  flash: { tool: "infinite_mass_punch", taunt: "Too slow, stretch — I lapped you twice already!" },
  plastic: { tool: "absorb_impact", taunt: "Boing! Hit me again, it tickles, speedy!" },
};

function clampWords(s, n) {
  const words = String(s || "").trim().split(/\s+/).filter(Boolean);
  return words.length > n ? words.slice(0, n).join(" ") + "…" : words.join(" ");
}

function addUsage(a, b) {
  if (!a) return b;
  if (!b) return a;
  return { total_tokens: (a.total_tokens || 0) + (b.total_tokens || 0) };
}

// Pull the first tool call, or flag why it's unusable.
function readToolCall(resp, allowed) {
  const tc = resp.tool_calls && resp.tool_calls[0];
  if (!tc || !tc.function) return { bad: "no_tool_call" };
  const name = tc.function.name;
  if (!allowed.includes(name)) return { name, bad: "unknown_tool" };
  try {
    return { name, args: JSON.parse(tc.function.arguments || "{}") };
  } catch {
    return { name, bad: "bad_args" };
  }
}

export async function runFighter(which, user) {
  const tools = FIGHTER_TOOLS[which];
  const allowed = AGENT_META[which].tools;
  const system = which === "flash" ? FLASH_SYS : PM_SYS;
  const t0 = Date.now();
  const guards = [];

  let resp = await chat({ system, user, tools, tool_choice: "required" });
  let usage = resp.usage;
  let call = readToolCall(resp, allowed);

  // Guardrail: tool_choice already forces a call; if it's still missing/invalid,
  // retry once, then fall back to a canned move.
  if (call.bad) {
    guards.push(`retry:${call.bad}`);
    resp = await chat({ system, user, tools, tool_choice: "required" });
    usage = addUsage(usage, resp.usage);
    call = readToolCall(resp, allowed);
  }

  let guard = "ok";
  let toolName, move, taunt, args;

  if (call.bad) {
    guard = "fallback";
    guards.push(call.bad);
    const fb = FALLBACK[which];
    toolName = fb.tool;
    move = MOVE_LABEL[fb.tool];
    taunt = fb.taunt;
    args = { taunt };
  } else {
    toolName = call.name;
    args = call.args || {};
    move = MOVE_LABEL[toolName] || toolName;
    if (which === "plastic" && toolName === "reshape" && args.shape) move = `Reshape → ${args.shape}`;
    taunt = args.taunt;
    if (!taunt) {
      taunt = FALLBACK[which].taunt;
      guard = "coerced";
      guards.push("missing_taunt");
    } else {
      const clamped = clampWords(taunt, MAX_TAUNT_WORDS);
      if (clamped !== String(taunt).trim()) {
        taunt = clamped;
        guard = "coerced";
        guards.push("clamped_taunt");
      }
    }
  }

  return {
    role: which,
    agent: AGENT_META[which].name,
    tool: toolName,
    move,
    taunt,
    args,
    ms: Date.now() - t0,
    tokens: usage?.total_tokens ?? null,
    guard,
    guards,
  };
}

export async function runReferee(user) {
  const tools = [SCORE_TOOL];
  const allowed = ["score_round"];
  const t0 = Date.now();
  const guards = [];

  let resp = await chat({ system: JUDGE_SYS, user, tools, tool_choice: "required" });
  let usage = resp.usage;
  let call = readToolCall(resp, allowed);

  if (call.bad) {
    guards.push(`retry:${call.bad}`);
    resp = await chat({ system: JUDGE_SYS, user, tools, tool_choice: "required" });
    usage = addUsage(usage, resp.usage);
    call = readToolCall(resp, allowed);
  }

  let guard = "ok";
  let narration, edge;

  if (call.bad) {
    guard = "fallback";
    guards.push(call.bad);
    narration = "The Flash blitzes in at light-speed; Plastic Man simply jiggles, absorbs it, snaps back, and grins. Nobody's any closer to winning.";
    edge = "even";
  } else {
    narration = call.args.narration || "The crowd roars as the two trade blows to no decisive effect.";
    edge = call.args.edge;
    if (!["flash", "plastic", "even"].includes(edge)) {
      edge = "even";
      guard = "coerced";
      guards.push("edge_coerced");
    }
  }

  return {
    role: "referee",
    agent: AGENT_META.referee.name,
    tool: "score_round",
    narration,
    edge,
    args: { edge },
    ms: Date.now() - t0,
    tokens: usage?.total_tokens ?? null,
    guard,
    guards,
  };
}

export async function closingCall(user) {
  try {
    const r = await chat({ system: CLOSING_SYS, user });
    const line = (r.text || "").trim().replace(/^["']|["']$/g, "");
    return line || null;
  } catch {
    return null;
  }
}
