// FCU Anomaly Watch — backend.
// One job: read agent-output JSON from DynamoDB and hand it to the frontend.
// No framework, no routes beyond /api/sessions, no write path — the Bedrock
// agents write to the table; this only reads.

import { createServer } from 'node:http'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

const PORT = process.env.PORT ?? 3001
const TABLE = process.env.TABLE_NAME ?? 'fcu-anomaly-sessions'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*') // hackathon mode
  res.setHeader('Content-Type', 'application/json')

  if (req.url !== '/api/sessions') {
    res.statusCode = 404
    return res.end('{"error":"not found"}')
  }

  try {
    // Full scan is fine here: the table only holds one test batch.
    // Schema is not finalized — items are returned as-is; the frontend
    // normalizes whatever fields exist.
    const { Items = [] } = await db.send(new ScanCommand({ TableName: TABLE }))
    res.end(JSON.stringify(Items))
  } catch (err) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: err.message }))
  }
}).listen(PORT, () => console.log(`anomaly-watch backend on :${PORT} → DynamoDB table "${TABLE}"`))
