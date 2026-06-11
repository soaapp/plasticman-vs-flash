import { useEffect, useState } from 'react'
import { SESSIONS, normalizeSession } from './data.js'

// Fetch the batch from the backend (DynamoDB). If the backend is down or the
// table is empty, the bundled sample batch keeps the demo alive.
export function useSessions() {
  const [state, setState] = useState({ sessions: SESSIONS, source: 'sample' })

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((items) => {
        if (!Array.isArray(items) || items.length === 0) return
        const sessions = items.map(normalizeSession).sort((a, b) => b.score - a.score)
        setState({ sessions, source: 'live' })
      })
      .catch(() => {}) // keep sample data
  }, [])

  return state
}
