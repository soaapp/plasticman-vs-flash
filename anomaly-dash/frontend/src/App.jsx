import { useEffect, useState } from 'react'
import TechnicalDashboard from './TechnicalDashboard.jsx'
import BusinessDashboard from './BusinessDashboard.jsx'
import { useSessions } from './useSessions.js'

const VIEWS = [
  { id: 'technical', label: 'Technical' },
  { id: 'business', label: 'Business' },
]

export default function App() {
  const [theme, setTheme] = useState('light')
  const [view, setView] = useState('technical')
  const { sessions, source } = useSessions()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-id">
          <span className="topbar-mark">◈</span>
          <div>
            <h1>Anomaly Watch</h1>
            <span className="topbar-sub">Financial Crimes Unit · Conversational Threat Desk</span>
          </div>
        </div>

        <nav className="view-tabs" aria-label="Dashboard view">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className={`view-tab ${view === v.id ? 'active' : ''}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>

        <div className="topbar-right">
          <span className="live">
            <span className={`live-dot ${source === 'sample' ? 'dot-sample' : ''}`} />
            {source === 'live' ? 'Live · S3' : 'Sample data'}
          </span>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle dark mode"
          >
            {theme === 'light' ? '☾ Dark' : '☀ Light'}
          </button>
        </div>
      </header>

      {view === 'technical' ? <TechnicalDashboard sessions={sessions} /> : <BusinessDashboard sessions={sessions} />}

      <footer className="foot">
        Anomaly Watch v0.1 · detection model fcu-sentinel-7b · reasoning model fcu-adjudicator-70b · all outputs require human adjudication
      </footer>
    </div>
  )
}
