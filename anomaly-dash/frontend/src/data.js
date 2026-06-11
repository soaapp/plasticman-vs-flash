// ── Dummy data (UI only — replace with live pipeline output later) ──────────
// Flow: conversations → detection agent (score 0–1 + flagged data points)
//                     → reasoning agent (explanation, threat level, remediation)

export const FLAG_TYPES = {
  prompt_injection: {
    label: 'Prompt Injection',
    short: 'PRM-INJ',
    indicator: 'Embedded instruction-override sequences detected in user turns',
    detail:
      'The session contains language patterns attempting to override system-level guardrails — phrases instructing the assistant to ignore prior directives, reveal hidden configuration, or assume an unrestricted persona.',
    fix: 'Sanitize and delimit user input before model ingestion; enable instruction-hierarchy enforcement on the serving layer.',
  },
  code_injection: {
    label: 'Code Injection',
    short: 'CODE-INJ',
    indicator: 'Executable payload fragments interleaved with natural language',
    detail:
      'Message bodies include obfuscated script fragments, encoded shell commands, and SQL meta-characters positioned to exploit downstream interpreters that consume chat output.',
    fix: 'Escape model output before downstream execution; run payload fragments through static analysis and block known obfuscation encodings.',
  },
  stealth_fraud: {
    label: 'Stealth Fraud',
    short: 'STLH-FRD',
    indicator: 'Incremental trust-building consistent with long-con fraud playbooks',
    detail:
      'Conversation telemetry shows a slow-burn pattern: benign rapport-building turns followed by gradually escalating requests for account actions, mirroring known stealth-fraud sequences in the FCU corpus.',
    fix: 'Route to a human fraud analyst; cross-reference counterparty accounts and freeze pending transfers initiated within the session window.',
  },
  social_engineering: {
    label: 'Social Engineering',
    short: 'SOC-ENG',
    indicator: 'Urgency framing and authority impersonation cues',
    detail:
      'The user leverages urgency ("immediately", "account will be closed") combined with impersonation of bank staff to coerce disclosure of credentials or transfer approval.',
    fix: 'Trigger step-up verification for any account action requested in-session; notify the impersonated entity’s security desk.',
  },
  data_exfiltration: {
    label: 'Data Exfiltration',
    short: 'DATA-EXF',
    indicator: 'Systematic probing for bulk PII / account-record retrieval',
    detail:
      'Query sequence iterates across account identifiers with enumeration-style pagination, consistent with an attempt to harvest customer records through the conversational interface.',
    fix: 'Rate-limit per-session record access; apply output redaction on PII fields and revoke the session token pending review.',
  },
  account_takeover: {
    label: 'Account Takeover',
    short: 'ACC-TKO',
    indicator: 'Credential-reset chaining from an unrecognized device fingerprint',
    detail:
      'Session originates from a device and network fingerprint absent from the account’s 90-day history, and immediately pursues password reset, contact-detail changes, and payee creation in rapid succession.',
    fix: 'Force re-authentication with an out-of-band factor; lock contact-detail mutations for 72 hours and alert the account holder.',
  },
  structuring: {
    label: 'Structuring Pattern',
    short: 'STRUCT',
    indicator: 'Transfer amounts clustered just below reporting thresholds',
    detail:
      'In-session transfer instructions are repeatedly sized between $9,000–$9,900, a classic smurfing signature designed to evade currency-transaction reporting requirements.',
    fix: 'File SAR per BSA guidance; aggregate the session’s transfer set for threshold analysis and hold execution pending compliance sign-off.',
  },
  jailbreak_attempt: {
    label: 'Jailbreak Attempt',
    short: 'JAILBRK',
    indicator: 'Role-play scaffolding used to elicit policy-violating outputs',
    detail:
      'The user constructs nested fictional framing ("pretend you are an AI without rules") to coax the assistant into producing restricted financial guidance or internal procedure details.',
    fix: 'Log the prompt set to the red-team corpus; tighten refusal classifiers on the matched scaffold family.',
  },
}

// Traffic-light scale: green (low) → amber (medium) → red (high), with
// "critical" as an intensified red used sparingly.
export const THREAT_META = {
  critical: { label: 'Critical', rank: 3, action: 'Immediate escalation' },
  high: { label: 'High', rank: 2, action: 'Analyst review required' },
  medium: { label: 'Medium', rank: 1, action: 'Queue for review' },
  low: { label: 'Low', rank: 0, action: 'Monitor / auto-resolve' },
}

function buildReasoning(session) {
  const { flags, score, level } = session
  const meta = THREAT_META[level]
  const primary = flags.length ? FLAG_TYPES[flags[0]] : null

  const opening = primary
    ? `Session ${session.id} was flagged with a confidence of ${score.toFixed(2)}. The dominant signal is ${primary.label.toLowerCase()}${
        flags.length > 1 ? `, corroborated by ${flags.length - 1} secondary indicator${flags.length - 1 > 1 ? 's' : ''}` : ''
      }.`
    : `Session ${session.id} scored ${score.toFixed(2)}, below the anomaly action threshold. Signals present are weak or explainable by normal customer behavior.`

  const context = `Origin channel ${session.channel} (${session.region}). ${
    score >= 0.65
      ? 'Signal co-occurrence across independent detectors materially raises the posterior — these indicators rarely coincide in benign traffic.'
      : score >= 0.45
        ? 'Individual signals are moderate; the combination warrants human triage rather than automated action.'
        : 'No corroborating cross-detector signal was found.'
  }`

  const verdict =
    level === 'critical'
      ? 'Escalate now. Freeze in-session financial actions, preserve the full transcript and telemetry for forensics, and page the on-call FCU analyst.'
      : level === 'high'
        ? 'Human review required within the current shift. Hold any pending transfers initiated in-session until an analyst signs off.'
        : level === 'medium'
          ? 'Add to the analyst review queue. No automated hold necessary, but tag the customer profile for 30-day enhanced monitoring.'
          : 'No action required. Retain in the baseline corpus to keep the detector calibrated against benign traffic.'

  return {
    opening,
    context,
    indicators: flags.map((k) => ({
      key: k,
      label: FLAG_TYPES[k].label,
      short: FLAG_TYPES[k].short,
      text: FLAG_TYPES[k].indicator,
      detail: FLAG_TYPES[k].detail,
    })),
    remediation: flags.map((k) => FLAG_TYPES[k].fix),
    verdict,
    action: meta.action,
  }
}

export function threatLevel(score) {
  if (score >= 0.85) return 'critical'
  if (score >= 0.65) return 'high'
  if (score >= 0.45) return 'medium'
  return 'low'
}

// ── Business lens: plain-English framing per anomaly family ─────────────────
const BIZ_HEADLINES = {
  account_takeover: 'Unauthorized account access attempt',
  data_exfiltration: 'Attempt to harvest customer data',
  code_injection: 'Attempt to compromise bank systems',
  prompt_injection: 'Attempt to manipulate the AI assistant',
  jailbreak_attempt: 'Attempt to manipulate the AI assistant',
  stealth_fraud: 'Suspected customer-targeted fraud',
  social_engineering: 'Impersonation and pressure tactics',
  structuring: 'Suspicious money-movement pattern',
}

const BIZ_ACTIONS = {
  critical: 'Blocked · escalated to FCU',
  high: 'On hold · analyst review',
  medium: 'Enhanced monitoring',
  low: 'No action needed',
}

export const BIZ_RATING = {
  critical: 'Severe',
  high: 'High risk',
  medium: 'Elevated',
  low: 'Low risk',
}

function buildBusiness(session) {
  return {
    headline: session.flags.length ? BIZ_HEADLINES[session.flags[0]] : 'Routine customer interaction',
    action: BIZ_ACTIONS[session.level],
    rating: BIZ_RATING[session.level],
  }
}

// 20-session test batch covering every anomaly family plus clean traffic.
const S = (id, score, flags, channel, region, turns, age, reviewed, latencyMs, tokens) => ({
  id, score, level: threatLevel(score), flags, channel, region, turns, age, reviewed, latencyMs, tokens,
})

const RAW_SESSIONS = [
  S('SES-9F2C-A41B', 0.96, ['code_injection', 'data_exfiltration', 'account_takeover'], 'API', 'NA-EAST', 41, '23m', false, 412, 9840),
  S('SES-3D71-0B2C', 0.93, ['account_takeover', 'social_engineering'], 'Web Chat', 'NA-WEST', 33, '38m', false, 388, 8910),
  S('SES-8E45-7A19', 0.88, ['data_exfiltration', 'prompt_injection'], 'API', 'EU-CENTRAL', 64, '52m', false, 431, 11260),
  S('SES-7D18-33E0', 0.81, ['prompt_injection', 'jailbreak_attempt'], 'Web Chat', 'EU-CENTRAL', 18, '1h 12m', false, 286, 6120),
  S('SES-1C2F-9D04', 0.77, ['structuring', 'stealth_fraud'], 'Branch Kiosk', 'NA-EAST', 27, '1h 45m', false, 312, 6890),
  S('SES-5B6E-C902', 0.68, ['stealth_fraud', 'social_engineering'], 'Mobile App', 'NA-WEST', 56, '2h 40m', true, 341, 7480),
  S('SES-B214-66F8', 0.66, ['jailbreak_attempt'], 'Web Chat', 'APAC-SE', 22, '3h 02m', false, 254, 4730),
  S('SES-D0A3-41BE', 0.52, ['social_engineering'], 'IVR Relay', 'LATAM-N', 19, '3h 37m', false, 226, 3940),
  S('SES-2A90-EE57', 0.51, ['structuring'], 'Web Chat', 'APAC-SE', 12, '4h 05m', false, 198, 3260),
  S('SES-44E1-A7C3', 0.47, ['prompt_injection'], 'Mobile App', 'EU-CENTRAL', 15, '4h 22m', true, 211, 3580),
  S('SES-90BF-2E66', 0.45, ['stealth_fraud'], 'Web Chat', 'NA-EAST', 38, '4h 48m', false, 247, 5120),
  S('SES-6A02-D9F1', 0.31, ['jailbreak_attempt'], 'Web Chat', 'NA-WEST', 9, '5h 10m', true, 168, 2140),
  S('SES-3B6C-F04D', 0.27, ['structuring'], 'Branch Kiosk', 'LATAM-N', 11, '5h 24m', true, 175, 2380),
  S('SES-E983-5C20', 0.24, [], 'Mobile App', 'APAC-SE', 14, '5h 39m', true, 142, 1620),
  S('SES-77AD-B3E5', 0.19, [], 'Web Chat', 'EU-CENTRAL', 8, '6h 03m', true, 133, 1180),
  S('SES-A1D8-407E', 0.15, [], 'IVR Relay', 'NA-EAST', 6, '6h 31m', true, 127, 990),
  S('SES-C5F0-88A2', 0.12, [], 'API', 'NA-WEST', 21, '7h 14m', true, 118, 1450),
  S('SES-0C44-19AD', 0.08, [], 'Mobile App', 'NA-EAST', 7, '7h 51m', true, 121, 940),
  S('SES-52E9-CB17', 0.06, [], 'Branch Kiosk', 'LATAM-N', 5, '8h 20m', true, 109, 720),
  S('SES-F7B4-9920', 0.03, [], 'Mobile App', 'APAC-SE', 4, '8h 47m', true, 102, 580),
]

export const SESSIONS = RAW_SESSIONS.map((s) => ({
  ...s,
  reasoning: buildReasoning(s),
  business: buildBusiness(s),
}))

// ── June 10 batch adapter ────────────────────────────────────────────────────
// Maps raw red-team telemetry sessions (sample-batch.json / S3 export schema:
// { session_id, turns[{ eval_labels, duration_ms, token_usage, … }] }) into
// dashboard sessions. Real session IDs are preserved.

const SCENARIO_FLAGS = {
  'persona-hijack': 'jailbreak_attempt',
  'document-exfiltration': 'data_exfiltration',
  'data-pii-leak': 'data_exfiltration',
  'prompt-injection': 'prompt_injection',
  'tool-call': 'code_injection',
  'toxicity': 'social_engineering',
  'unsupervised-contracts': 'stealth_fraud',
}

const TACTIC_FLAGS = [
  [/urgency|social_pressure|authority|mandate|regulatory|credential/, 'social_engineering'],
  [/memory_exploitation|prior_compliance|slow_ramp|normalization|drift/, 'stealth_fraud'],
  [/role_entrapment|simulation|hypothetical|debug_mode|co_author|academic/, 'jailbreak_attempt'],
  [/buried_probe|payload|component_extraction|decomposition|injection/, 'prompt_injection'],
]

const CHANNELS = ['Web Chat', 'Mobile App', 'API', 'IVR Relay', 'Branch Kiosk']
const REGIONS = ['NA-EAST', 'NA-WEST', 'EU-CENTRAL', 'APAC-SE', 'LATAM-N']

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function ageFrom(ts) {
  if (!ts) return '—'
  const mins = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000))
  if (mins < 60) return `${mins}m`
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${Math.floor(mins / (60 * 24))}d ${Math.floor((mins % (60 * 24)) / 60)}h`
}

export function fromRawSession(raw) {
  const turns = raw.turns ?? []
  let worst = -1
  let advCount = 0
  let scenario = null
  const tactics = []
  const judged = [] // adversarial turns with their judge annotations

  for (const t of turns) {
    const el = t.eval_labels ?? {}
    if (!el.is_adversarial) continue
    advCount++
    scenario = scenario ?? el.adv_scenario_type
    const j = el.adv_judge_result ?? {}
    const fs = j.failure_score
    if (typeof fs === 'number') worst = Math.max(worst, fs)
    const st = el.adv_strategy_before_turn ?? {}
    const tactic = st.sub_tactic ?? st.attack_angle
    if (tactic) tactics.push(tactic)
    judged.push({
      fail: typeof fs === 'number' ? fs : 0,
      tactic: tactic ?? 'unknown',
      reason: j.short_reason || j.failure_type || '',
    })
  }

  // Detection-agent stand-in: confidence from worst judge failure score (0–3)
  // weighted by how much of the session was adversarial.
  const advFrac = turns.length ? advCount / turns.length : 0
  let score
  if (worst >= 3) score = 0.9 + advFrac * 0.09
  else if (worst === 2) score = 0.72 + advFrac * 0.15
  else if (worst === 1) score = 0.5 + advFrac * 0.12
  else if (worst === 0) score = 0.16 + advFrac * 0.25
  else score = 0.04
  score = Math.min(0.99, Math.round(score * 100) / 100)

  const flags = []
  if (advCount && SCENARIO_FLAGS[scenario]) flags.push(SCENARIO_FLAGS[scenario])
  for (const [re, flag] of TACTIC_FLAGS) {
    if (flags.length >= 3) break
    if (!flags.includes(flag) && tactics.some((t) => re.test(t))) flags.push(flag)
  }

  const h = hashStr(raw.session_id ?? '')
  const s = {
    id: raw.session_id ?? 'unknown-session',
    score,
    level: threatLevel(score),
    flags,
    scenario: scenario ?? null,
    channel: CHANNELS[h % CHANNELS.length],
    region: REGIONS[(h >> 3) % REGIONS.length],
    turns: raw.turn_count ?? turns.length,
    age: ageFrom(turns[0]?.start_ts),
    reviewed: false,
    latencyMs: Math.round(turns.reduce((a, t) => a + (t.duration_ms ?? 0), 0) / (turns.length || 1)),
    tokens: turns.reduce((a, t) => a + (t.token_usage?.total_tokens ?? 0), 0),
  }

  // Speak the same category vocabulary as the S3 threat-analysis feed
  // (persona-hijack, data-pii-leak, …) and use the judge's real annotations.
  s.reasons = scenario
    ? [{ key: scenario, label: prettyCat(scenario), confidence: score, detected: worst >= 1 }]
    : []

  judged.sort((a, b) => b.fail - a.fail)
  const FAIL_CONF = [0.2, 0.55, 0.8, 0.95]
  const indicators = judged.slice(0, 3).map((t, i) => ({
    key: `turn-${i}`,
    label: scenario ? `${prettyCat(scenario)} · ${t.tactic}` : t.tactic,
    short: t.tactic.toUpperCase().slice(0, 10),
    confidence: FAIL_CONF[t.fail] ?? 0.2,
    detected: t.fail >= 1,
    text: t.reason ? `Judge: ${t.reason}` : 'No judge annotation recorded for this turn.',
    detail: `Red-team tactic “${t.tactic}” · judge failure score ${t.fail}/3.`,
  }))

  s.reasoning = buildReasoning(s)
  if (judged.length) {
    s.reasoning.indicators = indicators
    s.reasoning.opening = `Session ${s.id} was flagged with a confidence of ${score.toFixed(2)}. The dominant signal is ${
      scenario ? prettyCat(scenario).toLowerCase() : 'adversarial probing'
    } across ${advCount} adversarial turn${advCount === 1 ? '' : 's'} (worst judge failure score ${Math.max(worst, 0)}/3).`
  }
  s.business = buildBusiness(s)
  return s
}

export function fromRawBatch(rawArray) {
  return rawArray.map(fromRawSession).sort((a, b) => b.score - a.score)
}

// ── Threat-analysis adapter (llm_threat_analysis_results.json from S3) ──────
// Shape: { results: [{ session_id, message_id, overall_risk_level,
//   recommended_action, usage, <category>: { detected, confidence, rationale,
//   evidence } }] } — one entry per message; we aggregate to sessions and use
// the detection agent's real rationales in the reasoning panel.

const RISK_RANK = { none: 0, low: 1, medium: 2, high: 3, critical: 4 }
const RANK_LEVEL = [null, 'low', 'medium', 'high', 'critical']
const ANALYSIS_CATS = Object.keys(SCENARIO_FLAGS)

const prettyCat = (c) => c.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())

export function fromAnalysisResults(results) {
  const bySession = new Map()
  for (const r of results) {
    if (!r?.session_id) continue
    if (!bySession.has(r.session_id)) bySession.set(r.session_id, [])
    bySession.get(r.session_id).push(r)
  }

  const sessions = [...bySession.entries()].map(([sid, msgs]) => {
    let score = 0
    let lvlRank = 0
    let tokens = 0
    let verdict = null
    let verdictConf = -1
    const catMax = {} // category → strongest occurrence across the session (detected or not)
    const actions = []

    for (const m of msgs) {
      tokens += m.usage?.totalTokens ?? 0
      lvlRank = Math.max(lvlRank, RISK_RANK[m.overall_risk_level] ?? 0)
      let msgMax = 0
      let detected = false
      for (const c of ANALYSIS_CATS) {
        const d = m[c]
        if (!d || typeof d !== 'object') continue
        const conf = d.confidence ?? 0
        score = Math.max(score, conf)
        msgMax = Math.max(msgMax, conf)
        if (d.detected) detected = true
        if (conf > 0 && (!catMax[c] || conf > catMax[c].confidence)) {
          catMax[c] = { ...d, confidence: conf, messageId: m.message_id }
        } else if (d.detected && catMax[c] && !catMax[c].detected) {
          catMax[c].detected = true
        }
      }
      if (detected && m.recommended_action) {
        if (!actions.includes(m.recommended_action)) actions.push(m.recommended_action)
        if (msgMax > verdictConf) {
          verdictConf = msgMax
          verdict = m.recommended_action
        }
      }
    }

    score = Math.min(0.99, Math.round(score * 100) / 100)
    const level = RANK_LEVEL[lvlRank] ?? threatLevel(score)

    // Top 3 reasons by confidence — shown in the session register and the
    // reasoning panel. Detected categories outrank near-misses at equal conf.
    const cats = Object.entries(catMax).sort(
      (a, b) => b[1].confidence - a[1].confidence || (b[1].detected ? 1 : 0) - (a[1].detected ? 1 : 0),
    ).slice(0, 3)

    const reasons = cats.map(([c, d]) => ({
      key: c,
      label: prettyCat(c),
      confidence: Math.round(d.confidence * 100) / 100,
      detected: !!d.detected,
    }))

    const flags = [...new Set(cats.filter(([, d]) => d.detected).map(([c]) => SCENARIO_FLAGS[c]))].slice(0, 3)

    const indicators = cats.map(([c, d]) => ({
      key: c,
      label: prettyCat(c),
      short: FLAG_TYPES[SCENARIO_FLAGS[c]]?.short ?? c.toUpperCase().slice(0, 8),
      confidence: Math.round(d.confidence * 100) / 100,
      detected: !!d.detected,
      text: d.evidence ? `Evidence: “${String(d.evidence).slice(0, 140)}”` : String(d.rationale ?? '').slice(0, 140),
      detail: d.rationale ?? '',
    }))

    const h = hashStr(sid)
    const s = {
      id: sid,
      score,
      level,
      flags,
      reasons,
      scenario: cats[0]?.[0] ?? null,
      channel: CHANNELS[h % CHANNELS.length],
      region: REGIONS[(h >> 3) % REGIONS.length],
      turns: msgs.length,
      age: '—',
      reviewed: false,
      latencyMs: null,
      tokens,
    }
    s.reasoning = {
      opening: cats.length
        ? `Session ${sid} was flagged with a peak confidence of ${score.toFixed(2)}. The dominant signal is ${indicators[0].label.toLowerCase()}${cats.length > 1 ? `, corroborated by ${cats.length - 1} secondary indicator${cats.length > 2 ? 's' : ''}` : ''}.`
        : `Session ${sid} scored ${score.toFixed(2)}, below the anomaly action threshold. Signals present are weak or explainable by normal customer behavior.`,
      context: `${msgs.length} message${msgs.length === 1 ? '' : 's'} analyzed by the detection agent · overall risk level: ${level}. Rationales below are the agent's own explanations, verbatim.`,
      indicators,
      remediation: actions.slice(0, 3),
      verdict: verdict ?? 'No action required. Retain in the baseline corpus to keep the detector calibrated against benign traffic.',
      action: THREAT_META[level].action,
    }
    s.business = buildBusiness(s)
    return s
  })

  return sessions.sort((a, b) => b.score - a.score)
}

// ── Live-data adapter ────────────────────────────────────────────────────────
// The DynamoDB schema isn't finalized, so accept whatever the agents wrote and
// fill in anything missing. Only `sessionId` and `score` really matter — level,
// reasoning, and the business lens are all derived.
export function normalizeSession(raw) {
  const score = Math.max(0, Math.min(1, Number(raw.score ?? raw.confidence ?? 0)))
  const s = {
    id: raw.sessionId ?? raw.session_id ?? raw.id ?? 'SES-UNKNOWN',
    score,
    level: threatLevel(score),
    flags: (raw.flags ?? raw.signals ?? []).filter((f) => FLAG_TYPES[f]),
    channel: raw.channel ?? '—',
    region: raw.region ?? '—',
    turns: raw.turns ?? 0,
    age: raw.age ?? '—',
    reviewed: raw.reviewed ?? false,
    latencyMs: raw.latencyMs ?? raw.latency_ms ?? 0,
    tokens: raw.tokens ?? 0,
  }
  // Prefer the reasoning agent's own report once it writes one; fall back to
  // the local template so the panel never renders empty.
  s.reasoning = raw.reasoning?.opening ? raw.reasoning : buildReasoning(s)
  s.business = buildBusiness(s)
  return s
}

// ── Technical performance telemetry (dummy — wire to metrics backend later) ──
export const PERF = {
  p50LatencyMs: 212,
  p95LatencyMs: 468,
  uptimePct: 99.97,
  detectionTokensAvg: 1380,
  reasoningTokensAvg: 6240,
  tokensToday: 762400,
  costTodayUsd: 4.83,
  throughputPerMin: 6.4,
}

// ── Business KPI scorecard (dummy — wire to reporting pipeline later) ────────
// status: 'on' = on target (green) · 'risk' = at risk (amber) · 'breach' = red
export const KPIS = [
  {
    category: 'Threat detection',
    kpi: 'Accuracy',
    target: '> 85–90%',
    current: '91.2%',
    status: 'on',
    note: 'Validated against analyst-adjudicated ground truth, trailing 30 days.',
    trend: [86.1, 87.4, 88.2, 88.0, 89.5, 90.6, 91.2],
  },
  {
    category: 'System performance',
    kpi: 'Detection latency',
    target: '< 200–500 ms',
    current: '342 ms',
    status: 'on',
    note: 'End-to-end p95 across detection + reasoning agents.',
    trend: [468, 441, 415, 396, 371, 355, 342],
  },
  {
    category: 'Observability',
    kpi: 'Telemetry coverage',
    target: '100% interactions logged',
    current: '100%',
    status: 'on',
    note: 'Every conversation turn captured with full session telemetry.',
    trend: [99.2, 99.6, 99.8, 100, 100, 100, 100],
  },
  {
    category: 'Explainability',
    kpi: 'Decision transparency',
    target: 'Every flag explained',
    current: '100%',
    status: 'on',
    note: 'All fired flags carry a reasoning-agent rationale; zero unexplained.',
    trend: [97.5, 98.2, 99.0, 99.4, 100, 100, 100],
  },
  {
    category: 'Traceability',
    kpi: 'Chronology reconstruction',
    target: '≥ 3 steps tracked',
    current: '3.8 avg',
    status: 'on',
    note: 'Ingest → detect → reason → disposition recorded per anomaly.',
    trend: [3.0, 3.1, 3.3, 3.4, 3.6, 3.7, 3.8],
  },
  {
    category: 'Interception',
    kpi: 'Block rate',
    target: '≥ 90%',
    current: '87.5%',
    status: 'risk',
    note: 'Confirmed-threat sessions blocked before funds movement. Gap driven by IVR relay channel.',
    trend: [84.0, 85.2, 86.0, 86.8, 87.1, 87.3, 87.5],
  },
  {
    category: 'Cost efficiency',
    kpi: 'Resource optimization',
    target: 'Minimize LLM usage',
    current: '7.6k tok/session',
    status: 'on',
    note: 'Down 18% week-over-week via prompt caching and selective reasoning escalation.',
    trend: [11.2, 10.4, 9.8, 9.1, 8.5, 8.0, 7.6],
  },
]
