# LendLoop

Borrow what you need. Lend what you don't.

A neighborhood tool-lending board. Neighbors list tools, request to borrow,
and get automated notifications and overdue reminders through n8n.

Stack: Next.js 16, TypeScript, Clerk, Convex, n8n (Docker).

- Client details: [client/README.md](client/README.md)
- Server details: [server/README.md](server/README.md)
- Production notes: [docs/production-notes.md](docs/production-notes.md)

## Architecture

```
Browser (Next.js) --Clerk JWT--> Convex (functions, RBAC, database)
Convex --signed webhook (HMAC)--> n8n: Request Notification
n8n (daily 9:00) --API key--> Convex GET /n8n/overdue-loans
n8n --API key + HMAC--> Convex POST /n8n/reminders (idempotent)
Failed n8n runs --> n8n Error Handler workflow
```

## Quick start

Prerequisites: Node 20+, Docker, and free Convex and Clerk accounts.

```bash
# 1. Install
npm install

# 2. Backend (terminal 1)
cd server && npx convex dev
```

```bash
# 3. Set Convex env vars (terminal 2, from server/)
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
npx convex env set N8N_HMAC_SECRET $(node scripts/generate-secret.mjs)
npx convex env set N8N_API_KEY $(node scripts/generate-secret.mjs)
```

```bash
# 4. n8n
cd server/n8n/docker
cp .env.example .env        # fill in values, see server/README.md
docker compose up -d        # http://localhost:5678
```

```bash
# 5. Client (from repo root)
cp client/.env.example client/.env.local   # fill in Clerk and Convex values
npm run dev -w client                       # http://localhost:3000
```

Then in n8n: create the `LendLoop Convex API` credential, import the three
workflows from `server/n8n/workflows/`, link the error workflow, and publish
them. To let Convex reach local n8n, start a tunnel and set `WEBHOOK_URL` and
`N8N_WEBHOOK_URL` (full steps in `server/README.md`).

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
| `npm run test:server` | Backend: RBAC, request rules, HMAC, idempotency, data minimization |
| `npm run test -w client` | Client unit and component tests (Vitest) |
| `npm run test:e2e -w client` | Playwright E2E: public page and route protection (needs valid `client/.env.local`) |
| `npm run check:n8n` | Scans exported n8n workflows for secrets |
| `npm run lint -w client` | ESLint |

Run everything:

```bash
npm run test:server && npm run test -w client && npm run test:e2e -w client && npm run check:n8n
```

Manual n8n test (from `server/`, with the tunnel and workflow running):

```bash
export WEBHOOK_URL=https://<tunnel>.trycloudflare.com/webhook/lendloop-events
export N8N_HMAC_SECRET=$(npx convex env get N8N_HMAC_SECRET)
node scripts/test-webhook.mjs          # expect 200
node scripts/test-webhook.mjs --bad    # expect 401
```

## Security and data minimization (summary)

- Authorization is enforced in Convex functions, not only in the UI.
- Webhooks and write-backs are HMAC-signed with a replay window.
- Secrets live only in environment variables and n8n credentials.
- Writes from n8n are idempotent; failures are retried and visible.
- The public page and n8n receive only the fields they need.

Details: [server/README.md](server/README.md).

## Repository layout

```
lendloop/
├── client/   Next.js app (UI)
├── server/   Convex backend and n8n workflows
├── docs/     Production notes
└── package.json   npm workspaces
```