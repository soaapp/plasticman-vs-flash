import { useEffect, useState } from 'react'
import TechnicalDashboard from './TechnicalDashboard.jsx'
import BusinessDashboard from './BusinessDashboard.jsx'
import { useSessions } from './useSessions.js'
import Assistant from './Assistant.jsx'

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
          <img
            className="topbar-logo"
            src={theme === 'dark' ? '/long_logo_darkmode.png' : '/long_logo_lightmode.png'}
            alt="BMO NextGen Cyber"
          />
          <div className="topbar-divider" />
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
            {source === 'merged'
              ? 'Live · S3 + batch'
              : source === 'live'
                ? 'Live · S3'
                : source === 'batch'
                  ? 'June 10 batch'
                  : 'Sample data'}
          </span>
          <a className="theme-toggle scenarios-link" href="/scenarios.html">
            ⚡ Raw scenarios
          </a>
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
        <img
          className="foot-logo"
          src={theme === 'dark' ? '/stack_logo_darkmode.png' : '/stack_logo_lightmode.png'}
          alt="BMO NextGen Cyber"
        />
        <span className="foot-credit">Built with ♥ by Hackathon Team 2 · BMO NextGen Cyber</span>
        <span className="foot-meta">
          Anomaly Watch v0.1 · detection model fcu-sentinel-7b · reasoning model fcu-adjudicator-70b · all outputs require human adjudication
        </span>
      </footer>

      <Assistant sessions={sessions} />
    </div>
  )
}
