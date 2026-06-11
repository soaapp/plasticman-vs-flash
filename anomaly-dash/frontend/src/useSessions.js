import { useEffect, useState } from 'react'
import { SESSIONS, normalizeSession } from './data.js'

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  WIRE YOUR S3 HERE — paste the object URL for the JSON the agents write. ║
// ║  (or set VITE_SESSIONS_URL in frontend/.env.local instead)               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
const SESSIONS_URL =
  import.meta.env.VITE_SESSIONS_URL ??
  'https://YOUR-BUCKET.s3.YOUR-REGION.amazonaws.com/sessions.json'

export function useSessions() {
  const [state, setState] = useState({ sessions: SESSIONS, source: 'sample' })

  useEffect(() => {
    if (SESSIONS_URL.includes('YOUR-BUCKET')) return // not wired yet → sample data
    fetch(SESSIONS_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((items) => {
        if (!Array.isArray(items) || items.length === 0) return
        const sessions = items.map(normalizeSession).sort((a, b) => b.score - a.score)
        setState({ sessions, source: 'live' })
      })
      .catch(() => {}) // S3 unreachable → stay on sample data
  }, [])

  return state
}
