# Anomaly Watch — FCU Conversational Threat Dashboard

Hackathon dashboard for financial crimes units. Two views over one batch of
scored conversations: a **Technical** view (scores, flags, latency, tokens,
agent reasoning) and a **Business** view (KPI scorecard + plain-English
conversation risk overview).

## Architecture — no backend

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
   S3 bucket — sessions.json (one array of session objects)
        │
        ▼  plain browser fetch() — no SDK, no credentials, no server
frontend/ React dashboard (Technical + Business views)
```

The whole stack is: agents write JSON to S3, the browser reads it. The schema
is not finalized — `normalizeSession()` in `frontend/src/data.js` accepts
whatever fields exist and derives the rest. Only `sessionId` and `score` are
required. If the URL is unset or unreachable, the dashboard falls back to a
bundled 20-session sample batch (header shows "Sample data" vs "Live · S3").

## Run it

```bash
npm run dev        # http://localhost:5180 — works immediately on sample data
```

To go live, paste your S3 object URL into the marked block at the top of
`frontend/src/useSessions.js` (or set `VITE_SESSIONS_URL` in
`frontend/.env.local`). Until that placeholder is replaced, the app runs on
sample data.

## One-time S3 setup

Upload the data (agents overwrite this same key as new batches finish):

```bash
aws s3 cp sample-sessions.json s3://YOUR-BUCKET/sessions.json
```

Let the browser read it — CORS on the bucket:

```json
[{ "AllowedMethods": ["GET"], "AllowedOrigins": ["*"], "AllowedHeaders": ["*"] }]
```

…and read access for the demo, either make the object public:

```bash
aws s3api put-bucket-policy --bucket YOUR-BUCKET --policy '{
  "Version": "2012-10-17",
  "Statement": [{ "Effect": "Allow", "Principal": "*",
    "Action": "s3:GetObject", "Resource": "arn:aws:s3:::YOUR-BUCKET/sessions.json" }]
}'
```

…or keep the bucket private and use a presigned URL as `VITE_SESSIONS_URL`
(valid up to 7 days — plenty for a hackathon):

```bash
aws s3 presign s3://YOUR-BUCKET/sessions.json --expires-in 604800
```

## Item shape (proposed, not final)

See `sample-sessions.json`. Only `sessionId` and `score` are required —
everything else (threat level, business rating, reasoning text) is derived or
defaulted in the frontend. Optional fields: `flags[]`, `channel`, `region`,
`turns`, `age`, `reviewed`, `latencyMs`, `tokens`, and a `reasoning` object if
the reasoning agent writes its full report.
