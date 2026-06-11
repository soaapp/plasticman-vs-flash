import { useEffect, useRef, useState } from 'react'
import { THREAT_META } from './data.js'

// Top of the analyst's review queue — most critical first.
function actionItems(sessions) {
  return sessions.filter((s) => s.level === 'critical' || s.level === 'high').slice(0, 3)
}

function buildActionItemsText(sessions) {
  const items = actionItems(sessions)
  if (!items.length) return 'Nothing needs review right now — every session in this batch sits inside the benign envelope.'
  return `Top of the review queue right now:\n\n${items
    .map((s, i) => `${i + 1}. ${s.id} — ${THREAT_META[s.level].label.toUpperCase()} (${s.score.toFixed(2)}) · ${s.business.headline}. ${s.business.action}.`)
    .join('\n\n')}\n\nAsk me about any session ID for the full reasoning and remediation path.`
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  WIRE BEDROCK HERE — replace askModel() with a call to your endpoint     ║
// ║  (e.g. API Gateway → Lambda → bedrock-runtime InvokeModel).               ║
// ║  It receives the analyst's question plus the current session batch,      ║
// ║  so the model can ground its answer in this batch's data.                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
async function askModel(question, sessions) {
  await new Promise((r) => setTimeout(r, 700)) // simulated round-trip

  // Tiny local responder so the demo works before Bedrock is connected.
  // Match any known session ID mentioned in the question (works for both
  // SES-XXXX sample IDs and real session_<hash> IDs).
  const q = question.toLowerCase()
  const hit = sessions.find((s) => q.includes(s.id.toLowerCase()))
  if (hit && /action|recommend|remediat|next step|do about|handle/.test(q)) {
    const steps = hit.reasoning.remediation.length
      ? hit.reasoning.remediation.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : 'No remediation required.'
    return `Recommended handling for ${hit.id} (${THREAT_META[hit.level].label}, conf ${hit.score.toFixed(2)}):\n\n${steps}\n\nDisposition: ${hit.reasoning.action}. ${hit.reasoning.verdict}`
  }
  if (hit) return `${hit.reasoning.opening}\n\nVerdict: ${hit.reasoning.verdict}`

  if (/action item|triage|priorit|most critical|review queue|start with|first/.test(q)) {
    return buildActionItemsText(sessions)
  }

  if (/critical/i.test(question)) {
    const crit = sessions.filter((s) => s.level === 'critical')
    return `This batch has ${crit.length} critical session${crit.length === 1 ? '' : 's'}: ${crit
      .map((s) => `${s.id} (${s.business.headline.toLowerCase()})`)
      .join('; ')}. All were blocked and escalated to the FCU. Ask about a session ID for the full reasoning.`
  }

  if (/review|open/i.test(question)) {
    const open = sessions.filter((s) => !s.reviewed && s.level !== 'low')
    return `${open.length} flagged session${open.length === 1 ? '' : 's'} still need analyst review: ${open
      .map((s) => s.id)
      .join(', ')}.`
  }

  return `IRIS is a UI preview for now — once connected to Bedrock I'll answer free-form questions about this batch. Try a session ID ("why was ${sessions[0]?.id ?? 'this session'} flagged?"), "show critical threats", or "which sessions need review?".`
}

const suggestionsFor = (sessions) => [
  `Why was ${sessions[0]?.id ?? 'the top session'} flagged?`,
  'Show critical threats',
  'Which sessions need review?',
]

// Dummy chat memory — localStorage for the demo; swap for DynamoDB later.
const MEMORY_KEY = 'iris-chats'

function loadChats() {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY)) ?? []
  } catch {
    return []
  }
}

export default function Assistant({ sessions }) {
  const [open, setOpen] = useState(false)
  const [chats, setChats] = useState(loadChats)
  const [currentId, setCurrentId] = useState(null)
  const [view, setView] = useState('chat') // 'chat' | 'history'
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  const current = chats.find((c) => c.id === currentId)
  const messages = current?.messages ?? []

  useEffect(() => {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(chats))
  }, [chats])

  // Seed a dummy triage conversation into chat memory so History isn't empty
  // on first open — doubles as the demo of what a Bedrock-backed IRIS returns.
  // Regenerates while untouched so it always reflects the loaded batch.
  useEffect(() => {
    if (!sessions.length) return
    const seed = {
      id: 'seed-triage-briefing',
      title: 'Morning triage briefing',
      messages: [
        { role: 'user', text: 'Give me the action items for this batch — what should I review first?' },
        { role: 'bot', text: buildActionItemsText(sessions) },
      ],
    }
    setChats((cs) => {
      if (cs.length === 0) return [seed]
      const i = cs.findIndex((c) => c.id === seed.id)
      if (i >= 0 && cs[i].messages.length === 2) return cs.map((c) => (c.id === seed.id ? seed : c))
      return cs
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions])

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages.length, busy, view])

  function updateChat(id, updater) {
    setChats((cs) => cs.map((c) => (c.id === id ? updater(c) : c)))
  }

  async function send(text) {
    const question = text.trim()
    if (!question || busy) return
    setInput('')
    setView('chat')

    let id = currentId
    if (!current) {
      id = crypto.randomUUID()
      setChats((cs) => [{ id, title: question.slice(0, 48), messages: [{ role: 'user', text: question }] }, ...cs])
      setCurrentId(id)
    } else {
      updateChat(id, (c) => ({ ...c, messages: [...c.messages, { role: 'user', text: question }] }))
    }

    setBusy(true)
    const answer = await askModel(question, sessions)
    updateChat(id, (c) => ({ ...c, messages: [...c.messages, { role: 'bot', text: answer }] }))
    setBusy(false)
  }

  function newChat() {
    setCurrentId(null)
    setView('chat')
  }

  function openChat(id) {
    setCurrentId(id)
    setView('chat')
  }

  function deleteChat(id) {
    setChats((cs) => cs.filter((c) => c.id !== id))
    if (id === currentId) setCurrentId(null)
  }

  return (
    <>
      <button className="assist-fab" onClick={() => setOpen(!open)} aria-label="Ask IRIS">
        {open ? '✕' : '✦ Ask IRIS'}
      </button>

      {open && (
        <div className="assist-panel card">
          <div className="assist-head">
            <div>
              <span className="assist-title">IRIS</span>
              <span className="assist-sub">Intelligent Risk Insight System · ask about this batch</span>
            </div>
            <span className="assist-model-tag">Bedrock · not connected</span>
          </div>

          <div className="assist-toolbar">
            <button className="assist-tool-btn" onClick={newChat} disabled={!current && view === 'chat'}>
              ✚ New chat
            </button>
            <button
              className={`assist-tool-btn ${view === 'history' ? 'active' : ''}`}
              onClick={() => setView(view === 'history' ? 'chat' : 'history')}
            >
              ↺ History ({chats.length})
            </button>
          </div>

          {view === 'history' ? (
            <div className="assist-msgs assist-history" ref={scrollRef}>
              {chats.length === 0 && <p className="assist-empty-note">No saved chats yet — ask IRIS something first.</p>}
              {chats.map((c) => (
                <div key={c.id} className={`history-item ${c.id === currentId ? 'active' : ''}`}>
                  <button className="history-open" onClick={() => openChat(c.id)}>
                    <span className="history-title">{c.title}</span>
                    <span className="history-meta">{c.messages.length} message{c.messages.length === 1 ? '' : 's'}</span>
                  </button>
                  <button className="history-del" onClick={() => deleteChat(c.id)} aria-label="Delete chat">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="assist-msgs" ref={scrollRef}>
              {messages.length === 0 && (
                <div className="assist-empty">
                  <div className="assist-actions">
                    <span className="assist-actions-title">⚑ Needs review first</span>
                    {actionItems(sessions).map((s) => (
                      <button
                        key={s.id}
                        className="action-item"
                        onClick={() => send(`What's the recommended action for ${s.id}?`)}
                      >
                        <span className={`badge lv-badge-${s.level}`}>
                          <span className="badge-dot" />
                          {THREAT_META[s.level].label}
                        </span>
                        <span className="action-item-body">
                          <span className="action-item-id mono" title={s.id}>{s.id}</span>
                          <span className="action-item-sub">{s.business.headline} · {s.business.action}</span>
                        </span>
                        <span className="action-item-go">→</span>
                      </button>
                    ))}
                  </div>
                  <p>Or ask anything about the {sessions.length} conversations in this batch — in plain English.</p>
                  <div className="assist-chips">
                    {suggestionsFor(sessions).map((s) => (
                      <button key={s} className="assist-chip" onClick={() => send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`assist-msg msg-${m.role}`}>
                  {m.text}
                </div>
              ))}
              {busy && (
                <div className="assist-msg msg-bot assist-typing">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>
          )}

          <form
            className="assist-inputrow"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              className="assist-input"
              placeholder="Ask about a session, threat, or trend…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="assist-send" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  )
}
