# Anomaly Watch — FCU Conversational Threat Dashboard

Hackathon dashboard for financial crimes units. Two views over one batch of
scored conversations: a **Technical** view (scores, flags, latency, tokens,
agent reasoning) and a **Business** view (KPI scorecard + plain-English
conversation risk overview).

## Architecture

```
conversations (sample data)
        │
        ▼
Detection agent (Bedrock LLM)  →  score 0–1 + flagged data points
        │
        ▼
Reasoning agent (Bedrock LLM)  →  threat level, category, explanation
        │
        ▼
   DynamoDB (one JSON item per session)
        │
        ▼
backend/  GET /api/sessions  ── one file, one endpoint, read-only Scan
        │
        ▼
frontend/ React dashboard (Technical + Business views)
```

The backend is intentionally tiny (~40 lines, no web framework): the Bedrock
agents write to DynamoDB, the backend only reads. The schema is not finalized —
the backend returns items as-is and the frontend normalizes whatever fields
exist (`normalizeSession` in `frontend/src/data.js`), so schema changes don't
break the dashboard. If the backend is down or the table is empty, the frontend
falls back to a bundled 20-session sample batch (header shows "Sample data"
vs "Live · DynamoDB").

## Run it

```bash
# frontend (http://localhost:5180)
npm run dev

# backend (http://localhost:3001 — needs AWS credentials in env)
npm run backend

# one-time: create the table + load the sample batch
aws dynamodb create-table --table-name fcu-anomaly-sessions \
  --attribute-definitions AttributeName=sessionId,AttributeType=S \
  --key-schema AttributeName=sessionId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
npm run seed
```

Config: `TABLE_NAME` (default `fcu-anomaly-sessions`), `PORT` (default 3001),
plus standard AWS env (`AWS_REGION`, credentials).

## Item shape (proposed, not final)

See `backend/sample-sessions.json`. Only `sessionId` and `score` are required —
everything else (threat level, business rating, reasoning text) is derived or
defaulted in the frontend. Optional fields: `flags[]`, `channel`, `region`,
`turns`, `age`, `reviewed`, `latencyMs`, `tokens`, and a `reasoning` object if
the reasoning agent writes its full report.
