# LendLoop Server

The backend for LendLoop: Convex (database, backend logic, HTTP endpoints) and
n8n (automation workflows). Convex is a cloud service, so `server/` is the
source you push to it with `convex dev` or `convex deploy`. It is not a
separate Node server.

## Tools and technology

| Tool | Purpose |
|---|---|
| **Convex** | Database, queries, mutations, actions, scheduled jobs (crons), HTTP endpoints |
| **TypeScript** | Language for all backend code |
| **Clerk (JWT)** | Convex verifies Clerk tokens (`auth.config.ts`) |
| **n8n** (Docker) | Workflow automation: notifications and overdue reminders |
| **HMAC-SHA256** | Signs webhook payloads and write-backs |
| **Docker Compose** | Runs n8n locally |
| **Vitest + convex-test** | Backend tests (RBAC, rules, idempotency, HMAC) |
| **Cloudflare tunnel / ngrok** | Lets cloud Convex reach local n8n in development |

## Folder structure

```
server/
├── convex/
│   ├── _generated/                  # Auto-generated, do not edit
│   ├── schema.ts                    # Tables and indexes
│   ├── auth.config.ts               # Clerk JWT configuration
│   ├── http.ts                      # HTTP endpoints used by n8n
│   ├── crons.ts                     # Safety net: re-send unsent events
│   │
│   ├── users/       queries, mutations (store, setRole, setTrustedLender),
│   │                internal (makeAdmin, makeUser)
│   ├── tools/       queries, mutations, validators
│   ├── requests/    queries, mutations (create, approve, decline, cancel),
│   │                rules (dates, overlap, status transitions)
│   ├── loans/       queries (listMine, listAll, internal listOverdue),
│   │                mutations (markReturned), rules (overdue logic)
│   ├── automation/
│   │   ├── outbox.ts                # Saves events in the same transaction
│   │   ├── dispatch.ts              # Sends signed webhook, retries, failure tracking
│   │   ├── hmac.ts                  # Sign and verify
│   │   ├── reminders.ts             # Idempotent recordReminder
│   │   └── activity.ts              # Loan activity, failed events, retry/dismiss
│   └── lib/
│       ├── auth.ts                  # requireUser, requireAdmin, requireOwner
│       ├── permissions.ts           # Central RBAC policy (pure functions)
│       └── errors.ts                # Typed errors (ConvexError)
│
├── n8n/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   └── .env.example
│   ├── workflows/
│   │   ├── request-notification.json
│   │   ├── overdue-reminders.json
│   │   ├── error-handler.json
│   │   └── README.md
│   ├── credentials.template.md      # Credentials to create (no secrets)
│   └── scripts/check-no-secrets.mjs # Fails if a secret is in workflow JSON
│
├── tests/
│   ├── helpers.ts                   # convex-test helpers
│   ├── setup/modules.ts
│   ├── security/rbac.test.ts
│   └── integration/idempotency.test.ts
│
├── scripts/
│   ├── generate-secret.mjs          # Creates a random 64-char hex secret
│   └── test-webhook.mjs             # Sends a signed test event to n8n
│
├── vitest.config.ts
├── package.json
└── README.md
```

Unit tests sit next to their code (`permissions.test.ts`, `hmac.test.ts`,
`rules.test.ts`).

## Data model

`users`, `tools`, `requests`, `loans`, `automationEvents` (outbox),
`reminders`. Tool availability is derived from active loans, never stored.

## Environment variables

### Convex (set with `npx convex env set NAME value`)

| Variable | Description |
|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk issuer URL, for example `https://your-app.clerk.accounts.dev` (no trailing slash) |
| `N8N_WEBHOOK_URL` | n8n production webhook URL: `<public-n8n-url>/webhook/lendloop-events` |
| `N8N_HMAC_SECRET` | Shared secret for signing. Same value as `LENDLOOP_HMAC_SECRET` in n8n |
| `N8N_API_KEY` | Bearer key n8n uses to call Convex HTTP endpoints |

Generate secrets with `node scripts/generate-secret.mjs`. Use a different
value for `N8N_HMAC_SECRET` and `N8N_API_KEY`.

### n8n (`server/n8n/docker/.env`, never commit)

| Variable | Description |
|---|---|
| `GENERIC_TIMEZONE` | Schedule timezone, for example `Asia/Karachi` |
| `N8N_ENCRYPTION_KEY` | Encrypts credentials stored in n8n. Back it up |
| `WEBHOOK_URL` | Public n8n URL with a trailing slash (tunnel URL in development) |
| `LENDLOOP_HMAC_SECRET` | Must equal `N8N_HMAC_SECRET` in Convex |
| `CONVEX_SITE_URL` | Convex HTTP Actions URL (ends in `.convex.site`) |

Write each line as `NAME=value` with no space after `=`.

### n8n credential (created in the n8n UI, not in a file)

| Name | Type | Header | Value |
|---|---|---|---|
| `LendLoop Convex API` | Header Auth | `Authorization` | `Bearer <N8N_API_KEY>` |

## Local setup

Prerequisites: Node 20+, Docker, a Convex account, a Clerk app.

1. **Install** (from repo root): `npm install`
2. **Convex**:
   ```bash
   cd server
   npx convex dev
   ```
   Log in and create a project. Leave it running.
3. **Set Convex env vars** (new terminal, from `server/`):
   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
   npx convex env set N8N_HMAC_SECRET $(node scripts/generate-secret.mjs)
   npx convex env set N8N_API_KEY $(node scripts/generate-secret.mjs)
   ```
4. **n8n**:
   ```bash
   cd server/n8n/docker
   cp .env.example .env
   ```
   Fill in `N8N_ENCRYPTION_KEY` (generate one), `LENDLOOP_HMAC_SECRET`
   (copy from `npx convex env get N8N_HMAC_SECRET`), and `CONVEX_SITE_URL`.
   Then:
   ```bash
   docker compose up -d
   ```
   Open http://localhost:5678 and create the owner account.
5. **n8n credential**: create the `LendLoop Convex API` credential (see above).
6. **Import workflows**: in n8n, Workflows, Import from file, for all three files in
   `server/n8n/workflows/`. In **Overdue Reminders**, select the credential in
   both HTTP nodes. In the other two workflows, set Settings, Error workflow to
   **LendLoop - Error Handler**. Publish all three.
7. **Tunnel** (so Convex can reach local n8n):
   ```bash
   cloudflared tunnel --protocol http2 --url http://localhost:5678
   ```
   Put the printed URL in `server/n8n/docker/.env` as `WEBHOOK_URL=<url>/`,
   run `docker compose up -d --force-recreate`, then:
   ```bash
   npx convex env set N8N_WEBHOOK_URL <url>/webhook/lendloop-events
   ```
   Free tunnel URLs change on every restart, so repeat this step when that happens.
8. **First admin**: sign in once through the client, then:
   ```bash
   npx convex run users/internal:makeAdmin '{"email":"you@example.com"}'
   ```

## Automation design

**Request notification (Convex to n8n)**
1. A mutation changes a request or loan and saves an event in `automationEvents`
   in the same transaction (outbox pattern).
2. `dispatch.sendEvent` sends a signed webhook (`X-LendLoop-Signature`,
   `X-LendLoop-Timestamp`). Failures retry after 30s, 2m, 10m, 1h, then stay
   `failed` and visible in the Admin panel (with Retry and Dismiss).
3. n8n verifies the HMAC and 5-minute timestamp window, answers 200, skips
   duplicates by `eventId`, and builds the notification (mock; replace with
   Email, Slack, or Discord).

**Overdue reminders (n8n to Convex)**
1. Daily at 9:00, n8n calls `GET /n8n/overdue-loans` (Bearer key).
2. For each loan it sends a reminder (mock channel).
3. It writes the result to `POST /n8n/reminders` (Bearer key and HMAC).
   `reminderKey = loanId:date` makes retries idempotent.

**Errors**: a central **Error Handler** workflow catches failed runs. Nodes
that call external systems retry 3 times.

## Security decisions

- **RBAC in Convex**: role stored in the `users` table. Every function calls
  `requireUser` or `requireAdmin` and the central `permissions.ts`. Admins can
  remove listings, view all loans, and set Trusted Lender, but cannot edit
  others' listings or act on their loans.
- **No self-promotion**: new users are always `user`. Admins are created only
  with the internal function `makeAdmin`.
- **Server-side validation**: ownership ids come from the identity, never from
  client arguments, and strict validators reject extra fields.
- **Signed requests both ways**: HMAC-SHA256 over `timestamp.body`, constant-time
  comparison, 5-minute replay window. n8n endpoints also need the API key.
  Missing env vars make the endpoints fail closed.
- **Secrets** live only in Convex env, `.env` (gitignored), and n8n credentials.
  `npm run check:n8n` scans exported workflow JSON.
- **Idempotency**: outbox `eventKey`, `reminderKey`, n8n dedupe by `eventId`.

## Data minimization

- The public query returns tool name and category only.
- n8n receives only recipient name and email, the other party's name, tool
  name, dates, and status. No ids, roles, or descriptions.
- Write-backs to Convex contain no personal data.
- Lenders see the borrower's name, never the email.
- n8n execution history is pruned after 7 days.

## Commands (from `server/`)

| Command | Description |
|---|---|
| `npx convex dev` | Run and sync functions |
| `npx vitest run` | Backend tests |
| `node scripts/test-webhook.mjs` | Send a signed test event (needs `WEBHOOK_URL` and `N8N_HMAC_SECRET`) |
| `node n8n/scripts/check-no-secrets.mjs` | Scan workflow JSON for secrets |