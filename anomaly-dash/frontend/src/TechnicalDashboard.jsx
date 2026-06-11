import { useEffect, useMemo, useState } from 'react'
import { FLAG_TYPES, THREAT_META, PERF } from './data.js'
import ReasoningPanel from './ReasoningPanel.jsx'

const LEVELS = ['all', 'critical', 'high', 'medium', 'low']

function ScoreBar({ score, level }) {
  return (
    <div className="scorebar">
      <div className="scorebar-track">
        <div className={`scorebar-fill lv-${level}`} style={{ width: `${score * 100}%` }} />
      </div>
      <span className="scorebar-num">{score.toFixed(2)}</span>
    </div>
  )
}

function ThreatBadge({ level }) {
  return (
    <span className={`badge lv-badge-${level}`}>
      <span className="badge-dot" />
      {THREAT_META[level].label}
    </span>
  )
}

function StatCard({ label, value, sub, tone }) {
  return (
    <div className={`stat-card ${tone ? `stat-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-sub">{sub}</span>
    </div>
  )
}

function Pipeline({ total, flagged }) {
  const stages = [
    { kicker: 'Input', title: 'Conversations', detail: `${total} sessions ingested` },
    { kicker: 'Agent 01', title: 'Detection Agent', detail: 'Scores 0–1 · flags data points' },
    { kicker: 'Agent 02', title: 'Reasoning Agent', detail: 'Explains · threat level · remediation' },
    { kicker: 'Output', title: 'Triage Queue', detail: `${flagged} anomalies pending` },
  ]
  return (
    <div className="pipeline">
      {stages.map((s, i) => (
        <div className="pipe-wrap" key={s.title}>
          <div className="pipe-stage">
            <span className="pipe-kicker">{s.kicker}</span>
            <span className="pipe-title">{s.title}</span>
            <span className="pipe-detail">{s.detail}</span>
          </div>
          {i < stages.length - 1 && <span className="pipe-arrow">→</span>}
        </div>
      ))}
    </div>
  )
}

function PerfStrip() {
  const items = [
    { label: 'Latency p50 / p95', value: `${PERF.p50LatencyMs} / ${PERF.p95LatencyMs} ms`, sub: 'end-to-end pipeline' },
    { label: 'Throughput', value: `${PERF.throughputPerMin}/min`, sub: `uptime ${PERF.uptimePct}%` },
    { label: 'Tokens per session', value: `${(PERF.detectionTokensAvg / 1000).toFixed(1)}k + ${(PERF.reasoningTokensAvg / 1000).toFixed(1)}k`, sub: 'detection + reasoning avg' },
    { label: 'Tokens today', value: `${(PERF.tokensToday / 1000).toFixed(0)}k`, sub: `est. spend $${PERF.costTodayUsd.toFixed(2)}` },
  ]
  return (
    <section className="card perf-strip">
      <span className="perf-kicker">System performance</span>
      <div className="perf-items">
        {items.map((it) => (
          <div className="perf-item" key={it.label}>
            <span className="perf-label">{it.label}</span>
            <span className="perf-value mono">{it.value}</span>
            <span className="perf-sub">{it.sub}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function TechnicalDashboard({ sessions }) {
  const [selected, setSelected] = useState(sessions[0])
  const [filter, setFilter] = useState('all')

  // When the live batch replaces the sample one, point the panel at its top session.
  useEffect(() => {
    setSelected(sessions[0])
  }, [sessions])

  const visible = useMemo(
    () => sessions.filter((s) => filter === 'all' || s.level === filter),
    [sessions, filter],
  )

  const anomalies = sessions.filter((s) => s.score >= 0.45)
  const critical = sessions.filter((s) => s.level === 'critical')
  const avg = sessions.reduce((a, s) => a + s.score, 0) / sessions.length

  return (
    <>
      <section className="stats">
        <StatCard label="Sessions scanned" value={sessions.length} sub="last 18 hours" />
        <StatCard
          label="Anomalies flagged"
          value={anomalies.length}
          sub={`${Math.round((anomalies.length / sessions.length) * 100)}% of traffic`}
          tone="blue"
        />
        <StatCard label="Critical threats" value={critical.length} sub="immediate escalation" tone="red" />
        <StatCard label="Mean confidence" value={avg.toFixed(2)} sub="across all sessions" />
      </section>

      <PerfStrip />

      <Pipeline total={sessions.length} flagged={anomalies.length} />

      <section className="card table-card">
        <div className="table-head">
          <h2>Session register</h2>
          <div className="filters">
            {LEVELS.map((lv) => (
              <button
                key={lv}
                className={`filter-btn ${filter === lv ? 'active' : ''}`}
                onClick={() => setFilter(lv)}
              >
                {lv === 'all' ? 'All' : THREAT_META[lv].label}
              </button>
            ))}
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Confidence</th>
                <th>Threat</th>
                <th>Top signals · confidence</th>
                <th>Channel</th>
                <th>Latency</th>
                <th>Tokens</th>
                <th>Turns</th>
                <th>Age</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr
                  key={s.id}
                  className={selected?.id === s.id ? 'selected' : ''}
                  onClick={() => setSelected(selected?.id === s.id ? null : s)}
                >
                  <td className="mono cell-id" title={s.id}>
                    {s.id}
                    {s.analyzed && <span className="live-tag">live</span>}
                  </td>
                  <td>
                    <ScoreBar score={s.score} level={s.level} />
                  </td>
                  <td>
                    <ThreatBadge level={s.level} />
                  </td>
                  <td className="cell-flags">
                    {s.reasons?.length ? (
                      s.reasons.map((r) => (
                        <span
                          key={r.key}
                          className={`reason-chip ${r.confidence >= 0.65 ? 'rc-red' : r.confidence >= 0.45 ? 'rc-amber' : 'rc-low'} ${r.detected ? '' : 'rc-soft'}`}
                          title={`${r.label} — confidence ${r.confidence.toFixed(2)}${r.detected ? '' : ' (below detection threshold)'}`}
                        >
                          {r.label} <b>{r.confidence.toFixed(2)}</b>
                        </span>
                      ))
                    ) : s.flags.length === 0 ? (
                      <span className="flag-none">—</span>
                    ) : (
                      s.flags.map((f) => (
                        <span key={f} className="flag-chip" title={FLAG_TYPES[f].detail}>
                          {FLAG_TYPES[f].short}
                        </span>
                      ))
                    )}
                  </td>
                  <td className="cell-dim">{s.channel}</td>
                  <td className="cell-dim mono">{s.latencyMs ? `${s.latencyMs} ms` : '—'}</td>
                  <td className="cell-dim mono">{(s.tokens / 1000).toFixed(1)}k</td>
                  <td className="cell-dim mono">{s.turns}</td>
                  <td className="cell-dim mono">{s.age}</td>
                  <td>
                    <span className={`status ${s.reviewed ? 'status-done' : 'status-open'}`}>
                      {s.reviewed ? 'Reviewed' : 'Open'}
                    </span>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty">
                    No sessions match the current filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          {visible.length} of {sessions.length} sessions · sorted by confidence · "live" = scored by the S3 analysis feed · select a row for agent analysis
        </div>
      </section>

      <ReasoningPanel session={selected} />
    </>
  )
}
