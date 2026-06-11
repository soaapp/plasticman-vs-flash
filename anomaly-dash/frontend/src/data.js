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
    category: 'Detection',
    kpi: 'Accuracy',
    target: '> 85–90%',
    current: '91.2%',
    status: 'on',
    note: 'Validated against analyst-adjudicated ground truth, trailing 30 days.',
    trend: [86.1, 87.4, 88.2, 88.0, 89.5, 90.6, 91.2],
  },
  {
    category: 'Speed',
    kpi: 'Latency',
    target: '< 200–500 ms',
    current: '342 ms',
    status: 'on',
    note: 'End-to-end p95 across detection + reasoning agents.',
    trend: [468, 441, 415, 396, 371, 355, 342],
  },
  {
    category: 'Telemetry',
    kpi: 'Coverage',
    target: '100% interactions logged',
    current: '100%',
    status: 'on',
    note: 'Every conversation turn captured with full session telemetry.',
    trend: [99.2, 99.6, 99.8, 100, 100, 100, 100],
  },
  {
    category: 'Explainability',
    kpi: 'Reason clarity',
    target: 'Every flag explained',
    current: '100%',
    status: 'on',
    note: 'All fired flags carry a reasoning-agent rationale; zero unexplained.',
    trend: [97.5, 98.2, 99.0, 99.4, 100, 100, 100],
  },
  {
    category: 'Chronology',
    kpi: 'Timeline steps',
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
    category: 'Cost',
    kpi: 'Efficiency',
    target: 'Minimize LLM usage',
    current: '7.6k tok/session',
    status: 'on',
    note: 'Down 18% week-over-week via prompt caching and selective reasoning escalation.',
    trend: [11.2, 10.4, 9.8, 9.1, 8.5, 8.0, 7.6],
  },
]
