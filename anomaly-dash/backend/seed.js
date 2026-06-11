// Seeds the DynamoDB table with sample agent output so the dashboard has data
// before the Bedrock pipeline is wired up. Usage: npm run seed
// Create the table first (on-demand billing, sessionId as key):
//   aws dynamodb create-table --table-name fcu-anomaly-sessions \
//     --attribute-definitions AttributeName=sessionId,AttributeType=S \
//     --key-schema AttributeName=sessionId,KeyType=HASH \
//     --billing-mode PAY_PER_REQUEST

import { readFileSync } from 'node:fs'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'

const TABLE = process.env.TABLE_NAME ?? 'fcu-anomaly-sessions'
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))

const sessions = JSON.parse(readFileSync(new URL('./sample-sessions.json', import.meta.url)))

// BatchWrite takes max 25 items per call — one call covers our test batch.
await db.send(new BatchWriteCommand({
  RequestItems: { [TABLE]: sessions.map((Item) => ({ PutRequest: { Item } })) },
}))

console.log(`seeded ${sessions.length} sessions into "${TABLE}"`)
