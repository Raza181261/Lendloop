# LendLoop

Borrow what you need. Lend what you don't.

A neighborhood tool-lending board. Neighbors list tools, request to borrow, and
get automated notifications and overdue reminders through n8n. An AI assistant
(LangGraph) answers questions about loans and tools.

Stack: Next.js 16, TypeScript, Clerk, Convex, n8n (Docker), LangChain/LangGraph.

- Client details: [client/README.md](client/README.md)
- Server details: [server/README.md](server/README.md)
- Production notes: [docs/production-notes.md](docs/production-notes.md)

## Architecture

```
Browser (Next.js) --Clerk JWT--> Convex (functions, RBAC, database)
Browser chat widget --> Convex action --> LangGraph agent --> read-only tools --> DB
                                                |--> LLM via OpenRouter
Convex --signed webhook (HMAC)--> n8n: Request Notification
n8n (daily 9:00) --API key--> Convex GET /n8n/overdue-loans
n8n --API key + HMAC--> Convex POST /n8n/reminders (idempotent)
Failed n8n runs --> n8n Error Handler workflow
```

## Quick start

Prerequisites: Node 20+, Docker, free Convex and Clerk accounts, and an
OpenRouter key (for the AI assistant).

```bash
# 1. Install
npm install

# 2. Backend (terminal 1)
cd server && npx convex dev
```

```bash
# 3. Convex env vars (terminal 2, from server/)
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
npx convex env set N8N_HMAC_SECRET $(node scripts/generate-secret.mjs)
npx convex env set N8N_API_KEY $(node scripts/generate-secret.mjs)
npx convex env set OPENROUTER_API_KEY <your-openrouter-key>
npx convex env set CHAT_MODEL anthropic/claude-haiku-4.5
```

```bash
# 4. n8n
cd server/n8n/docker
cp .env.example .env        # fill in values, see server/README.md
docker compose up -d        # http://localhost:5678
```

```bash
# 5. Client (from repo root)
cp client/.env.example client/.env.local   # Clerk and Convex values
npm run dev -w client                       # http://localhost:3000
```

Then in n8n: create the `LendLoop Convex API` credential, import the three
workflows from `server/n8n/workflows/`, link the error workflow, and publish
them. To let Convex reach local n8n, start a tunnel and set `WEBHOOK_URL` and
`N8N_WEBHOOK_URL` (see `server/README.md`).

Make yourself admin after your first sign-in:

```bash
cd server
npx convex run users/internal:makeAdmin '{"email":"you@example.com"}'
```

## Running

| Command (from repo root) | Description |
|---|---|
| `npm run dev:server` | Convex dev (watch and sync) |
| `npm run dev -w client` | Next.js dev server |
| `npm run build -w client` | Production build of the client |
| `docker compose up -d` (in `server/n8n/docker`) | Start n8n |

## Testing

| Command | What it runs |
|---|---|
| `npm run test:server` | RBAC, request rules, HMAC, idempotency, data minimization, AI data scope |
| `npm run test -w client` | Client unit and component tests (Vitest) |
| `npm run test:e2e -w client` | Playwright E2E: public page and route protection |
| `npm run check:n8n` | Scans exported n8n workflows for secrets |
| `npm run lint -w client` | ESLint |

Run everything:

```bash
npm run test:server && npm run test -w client && npm run test:e2e -w client && npm run check:n8n
```

The LLM itself is not unit tested (cost and randomness). The tests cover the
data the assistant can reach: users see only their own loans, `all` requires
admin, and no emails appear in tool output.

Manual n8n test (from `server/`, tunnel and workflow running):

```bash
export WEBHOOK_URL=https://<tunnel>.trycloudflare.com/webhook/lendloop-events
export N8N_HMAC_SECRET=$(npx convex env get N8N_HMAC_SECRET)
node scripts/test-webhook.mjs          # expect 200
node scripts/test-webhook.mjs --bad    # expect 401
```

Manual AI test (two accounts): open the chat widget and ask "How many tools am
I borrowing and when are they due?", "How many tools are remaining?", then as
admin "System summary". A normal user asking for all loans must not get other
people's data.

## Security and data minimization (summary)

- Authorization is enforced in Convex functions, not only in the UI.
- Webhooks and write-backs are HMAC-signed with a replay window.
- Secrets live only in environment variables and n8n credentials.
- n8n writes are idempotent; failures are retried and visible.
- The public page and n8n receive only the fields they need.
- The AI assistant uses read-only, role-scoped tools; the user id never comes
  from the model; admin tools exist only for admins; no emails reach the LLM.

Details: [server/README.md](server/README.md).

## Repository layout

```
lendloop/
├── client/   Next.js app (UI, chat widget)
├── server/   Convex backend, AI agent, n8n workflows
├── docs/     Production notes
└── package.json   npm workspaces
```