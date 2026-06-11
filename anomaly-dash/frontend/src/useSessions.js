import { useEffect, useState } from 'react'
import { SESSIONS, normalizeSession, fromRawBatch, fromAnalysisResults } from './data.js'

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  WIRE YOUR S3 HERE — paste the object URL for the JSON the agents write. ║
// ║  (or set VITE_SESSIONS_URL in frontend/.env.local instead)               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const SESSIONS_URL =
  import.meta.env.VITE_SESSIONS_URL ??
  'https://YOUR-BUCKET.s3.YOUR-REGION.amazonaws.com/sessions.json'

// June 10 red-team batch (top 25, real session IDs) — the same file the
// Speedforce telemetry page loads, so both pages track the same sessions.
const LOCAL_BATCH_URL = '/sample-batch.json'

function adapt(payload) {
  const items = Array.isArray(payload) ? payload : payload?.results ?? payload?.sessions ?? []
  if (!Array.isArray(items) || items.length === 0) return []
  if (items[0]?.overall_risk_level !== undefined) return fromAnalysisResults(items)
  if (items[0]?.turns) return fromRawBatch(items)
  return items.map(normalizeSession)
}

export function useSessions() {
  const [state, setState] = useState({ sessions: SESSIONS, source: 'sample' })

  useEffect(() => {
    const wired = !SESSIONS_URL.includes('YOUR-BUCKET')
    const grab = (url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))

    Promise.allSettled([grab(LOCAL_BATCH_URL), wired ? grab(SESSIONS_URL) : Promise.reject(new Error('not wired'))])
      .then(([batchRes, liveRes]) => {
        const batch = batchRes.status === 'fulfilled' ? adapt(batchRes.value) : []
        const analyzed = liveRes.status === 'fulfilled' ? adapt(liveRes.value) : []
        if (!batch.length && !analyzed.length) return

        // Union by session ID: live S3 analysis wins on collisions, S3-only
        // sessions are appended — both pages always show the same ID set.
        const byId = new Map(batch.map((s) => [s.id, s]))
        analyzed.forEach((s) => byId.set(s.id, { ...s, analyzed: true }))
        const sessions = [...byId.values()].sort((a, b) => b.score - a.score)

        const source = analyzed.length ? (batch.length ? 'merged' : 'live') : 'batch'
        setState({ sessions, source })
      })
      .catch(() => {}) // keep built-in sample data
  }, [])

  return state
}
