import { useState } from 'react'
import { KPIS } from './data.js'

const STATUS_META = {
  on: { label: 'On target', cls: 'kpi-on' },
  risk: { label: 'At risk', cls: 'kpi-risk' },
  breach: { label: 'Breach', cls: 'kpi-breach' },
}

// Where a conversation sits on the traffic-light risk scale (0 → 1).
function RiskScale({ score, level }) {
  return (
    <div className="risk-scale">
      <div className="scale-track">
        <span className="scale-zone zone-green" />
        <span className="scale-zone zone-amber" />
        <span className="scale-zone zone-red" />
        <span className={`scale-marker marker-${level}`} style={{ left: `${score * 100}%` }} />
      </div>
      <span className="scale-num mono">{score.toFixed(2)}</span>
    </div>
  )
}

function Sparkline({ data, status }) {
  const w = 110
  const h = 28
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const points = data
    .map((v, i) => `${((i / (data.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`)
    .join(' ')
  return (
    <svg className={`spark spark-${status}`} viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <polyline points={points} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function BusinessDashboard({ sessions }) {
  const [showDetails, setShowDetails] = useState(false)
  const onTarget = KPIS.filter((k) => k.status === 'on').length
  const atRisk = KPIS.filter((k) => k.status === 'risk')
  const flagged = sessions.filter((s) => s.level !== 'low').length

  return (
    <>
      <section className="card biz-summary">
        <div className="biz-summary-main">
          <span className="biz-kicker">Program health · test batch of {sessions.length} sessions</span>
          <h2>
            {onTarget} of {KPIS.length} KPIs on target
          </h2>
          <p className="biz-sub">
            {atRisk.length === 0
              ? 'All key performance indicators are meeting their committed targets.'
              : `${atRisk.map((k) => `${k.category} — ${k.kpi.toLowerCase()}`).join(', ')} ${atRisk.length === 1 ? 'is' : 'are'} tracking below target and under active remediation.`}
          </p>
        </div>
        <div className="biz-summary-gauge">
          <div className="gauge-track">
            <div className="gauge-fill" style={{ width: `${(onTarget / KPIS.length) * 100}%` }} />
          </div>
          <span className="gauge-label mono">{Math.round((onTarget / KPIS.length) * 100)}% healthy</span>
        </div>
      </section>

      <section className="card kpi-table-card">
        <div className="table-head">
          <div className="conv-head-left">
            <h2>Conversation risk overview</h2>
            <span className="conv-summary">
              {sessions.length} conversations in this batch · {flagged} need attention
            </span>
          </div>
          <button className="details-toggle" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide details ▴' : 'View details ▾'}
          </button>
        </div>
        {showDetails && (
          <>
        <div className="table-scroll biz-conv-scroll conv-reveal">
          <table className="biz-conv-table">
            <thead>
              <tr>
                <th>Conversation ID</th>
                <th>Risk scale</th>
                <th>Rating</th>
                <th>What happened</th>
                <th>Action taken</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="row-static">
                  <td className="mono cell-id">{s.id}</td>
                  <td>
                    <RiskScale score={s.score} level={s.level} />
                  </td>
                  <td>
                    <span className={`badge lv-badge-${s.level}`}>
                      <span className="badge-dot" />
                      {s.business.rating}
                    </span>
                  </td>
                  <td className="cell-headline">{s.business.headline}</td>
                  <td className={`cell-action act-${s.level}`}>{s.business.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          Green: routine · Amber: needs attention · Red: serious threat — full technical detail lives in the Technical view
        </div>
          </>
        )}
      </section>

      <section className="card kpi-table-card">
        <div className="table-head">
          <h2>KPI scorecard</h2>
          <span className="batch-tag">Batch run · {sessions.length} sessions</span>
        </div>
        <div className="table-scroll">
          <table className="kpi-table">
            <thead>
              <tr>
                <th className="th-light"></th>
                <th>Category</th>
                <th>KPI</th>
                <th>Target</th>
                <th>Current</th>
                <th>Trend</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {KPIS.map((k) => {
                const meta = STATUS_META[k.status]
                return (
                  <tr key={k.kpi} className={`row-static row-${k.status}`}>
                    <td>
                      <span className={`light-dot ${meta.cls}`} title={meta.label} />
                    </td>
                    <td className="cell-cat">{k.category}</td>
                    <td className="cell-kpi">{k.kpi}</td>
                    <td className="cell-dim">{k.target}</td>
                    <td className={`mono cell-current ${meta.cls}`}>{k.current}</td>
                    <td className="cell-trend">
                      <Sparkline data={k.trend} status={k.status} />
                    </td>
                    <td>
                      <span className={`kpi-status ${meta.cls}`}>
                        <span className="badge-dot" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="cell-note">{k.note}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          {KPIS.length} KPIs · computed over the latest test batch of {sessions.length} sessions · figures are placeholders until wired to the reporting pipeline
        </div>
      </section>
    </>
  )
}
