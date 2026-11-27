# LendLoop Server

The backend for LendLoop: Convex (database, backend logic, HTTP endpoints, AI
assistant) and n8n (automation workflows). Convex is a cloud service, so
`server/` is the source you push to it with `convex dev` or `convex deploy`.
It is not a separate Node server.

## Tools and technology

| Tool | Purpose |
|---|---|
| **Convex** | Database, queries, mutations, actions, crons, HTTP endpoints |
| **TypeScript** | All backend code |
| **Clerk (JWT)** | Convex verifies Clerk tokens (`auth.config.ts`) |
| **n8n** (Docker) | Notifications and daily overdue reminders |
| **HMAC-SHA256** | Signs webhook payloads and write-backs |
| **LangChain + LangGraph** | AI assistant: a tool-calling agent graph |
| **OpenRouter** (via `@langchain/openai`) | LLM provider gateway (OpenAI-compatible API) |
| **Zod** | Tool input schemas for the agent |
| **Docker Compose** | Runs n8n locally |
| **Vitest + convex-test** | Backend tests |
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
│   ├── requests/    queries, mutations, rules (dates, overlap, transitions)
│   ├── loans/       queries (listMine, listAll, internal listOverdue),
│   │                mutations (markReturned), rules (overdue logic)
│   ├── automation/
│   │   ├── outbox.ts                # Saves events in the same transaction
│   │   ├── dispatch.ts              # Signed webhook, retries, failure tracking
│   │   ├── hmac.ts                  # Sign and verify
│   │   ├── reminders.ts             # Idempotent recordReminder
│   │   └── activity.ts              # Loan activity, failed events, retry/dismiss
│   ├── ai/
│   │   ├── data.ts                  # Read-only internal queries for the assistant
│   │   └── agent.ts                 # "use node": LangGraph agent + chat action
│   ├── chatbot/                     # (optional) older rule-based assistant
│   └── lib/
│       ├── auth.ts                  # requireUser, requireAdmin, requireOwner
│       ├── permissions.ts           # Central RBAC policy (pure functions)
│       └── errors.ts                # Typed errors (ConvexError)
│
├── n8n/
│   ├── docker/                      # docker-compose.yml, .env.example
│   ├── workflows/                   # request-notification.json,
│   │                                # overdue-reminders.json, error-handler.json
│   ├── credentials.template.md
│   └── scripts/check-no-secrets.mjs
│
├── tests/
│   ├── helpers.ts
│   ├── setup/modules.ts
│   ├── security/rbac.test.ts
│   ├── security/ai-data.test.ts     # Data scope of the assistant
│   ├── security/chatbot.test.ts     # (optional) rule-based assistant
│   └── integration/idempotency.test.ts
│
├── scripts/
│   ├── generate-secret.mjs          # Random 64-char hex secret
│   └── test-webhook.mjs             # Sends a signed test event to n8n
│
├── convex.json                      # externalPackages for LangChain
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
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk issuer URL, e.g. `https://your-app.clerk.accounts.dev` (no trailing slash) |
| `N8N_WEBHOOK_URL` | `<public-n8n-url>/webhook/lendloop-events` |
| `N8N_HMAC_SECRET` | Shared signing secret. Same value as `LENDLOOP_HMAC_SECRET` in n8n |
| `N8N_API_KEY` | Bearer key n8n uses to call Convex HTTP endpoints |
| `OPENROUTER_API_KEY` | OpenRouter key for the AI assistant |
| `CHAT_MODEL` | OpenRouter model id with tool calling, e.g. `anthropic/claude-haiku-4.5` |

Generate secrets with `node scripts/generate-secret.mjs`. Use a different value
for `N8N_HMAC_SECRET` and `N8N_API_KEY`.

### n8n (`server/n8n/docker/.env`, never commit)

| Variable | Description |
|---|---|
| `GENERIC_TIMEZONE` | Schedule timezone, e.g. `Asia/Karachi` |
| `N8N_ENCRYPTION_KEY` | Encrypts credentials stored in n8n. Back it up |
| `WEBHOOK_URL` | Public n8n URL with trailing slash (tunnel URL in development) |
| `LENDLOOP_HMAC_SECRET` | Must equal `N8N_HMAC_SECRET` in Convex |
| `CONVEX_SITE_URL` | Convex HTTP Actions URL (ends in `.convex.site`) |

Write each line as `NAME=value` with no space after `=`.

### n8n credential (created in the n8n UI)

| Name | Type | Header | Value |
|---|---|---|---|
| `LendLoop Convex API` | Header Auth | `Authorization` | `Bearer <N8N_API_KEY>` |

## Local setup

Prerequisites: Node 20+, Docker, Convex and Clerk accounts, an OpenRouter key.

1. **Install** (repo root): `npm install`
   If LangChain packages conflict, install them together:
   `npm install @langchain/core@latest @langchain/langgraph@latest @langchain/openai@latest zod -w server`
2. **Convex**: `cd server && npx convex dev` (log in, create a project, leave running).
3. **Convex env vars** (new terminal, from `server/`):
   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
   npx convex env set N8N_HMAC_SECRET $(node scripts/generate-secret.mjs)
   npx convex env set N8N_API_KEY $(node scripts/generate-secret.mjs)
   npx convex env set OPENROUTER_API_KEY <your-openrouter-key>
   npx convex env set CHAT_MODEL anthropic/claude-haiku-4.5
   ```
4. **n8n**:
   ```bash
   cd server/n8n/docker
   cp .env.example .env     # fill in values
   docker compose up -d
   ```
   Open http://localhost:5678 and create the owner account.
5. **n8n credential**: create `LendLoop Convex API` (see above).
6. **Import workflows**: Workflows, Import from file, all three files in
   `server/n8n/workflows/`. In Overdue Reminders, select the credential in both
   HTTP nodes. Set Error workflow to **LendLoop - Error Handler** in the other
   two. Publish all three.
7. **Tunnel** (so Convex can reach local n8n):
   ```bash
   cloudflared tunnel --protocol http2 --url http://localhost:5678
   ```
   Set `WEBHOOK_URL=<url>/` in the n8n `.env`, run
   `docker compose up -d --force-recreate`, then
   `npx convex env set N8N_WEBHOOK_URL <url>/webhook/lendloop-events`.
   Free tunnel URLs change on every restart.
8. **First admin**: sign in once through the client, then
   `npx convex run users/internal:makeAdmin '{"email":"you@example.com"}'`.

## Automation design

**Request notification (Convex to n8n)**
1. A mutation changes a request or loan and saves an event in
   `automationEvents` in the same transaction (outbox pattern).
2. `dispatch.sendEvent` sends a signed webhook. Failures retry after 30s, 2m,
   10m, 1h, then stay `failed` and visible in the Admin panel (Retry/Dismiss).
3. n8n verifies the HMAC and the 5-minute window, replies 200, skips duplicates
   by `eventId`, and builds the notification (mock; replace with Email/Slack/Discord).

**Overdue reminders (n8n to Convex)**
1. Daily at 9:00, n8n calls `GET /n8n/overdue-loans` (Bearer key).
2. It sends a reminder per loan (mock channel).
3. It writes the result to `POST /n8n/reminders` (Bearer key and HMAC).
   `reminderKey = loanId:date` makes retries idempotent.

**Errors**: a central Error Handler workflow catches failed runs. Nodes that
call external systems retry 3 times.

## AI assistant design

An action (`ai/agent:chat`) runs a **LangGraph** agent: model node, tool node,
and a loop until the model answers. The model is called through OpenRouter.

```
Browser --Clerk JWT--> action ai.agent.chat
   1. identity from the verified token (never from arguments)
   2. LangGraph loop: LLM <-> read-only tools
   3. tools --> internalQuery (user + role re-checked) --> database
```

| Tool | Who | Returns |
|---|---|---|
| `my_borrowed_loans` | everyone | Tools I borrowed, due dates, returned dates, overdue |
| `my_lent_loans` | everyone | Tools I lent, borrower name, due dates |
| `tool_stats` | everyone | Total, available, on loan, per category |
| `my_listings` | everyone | My tools and availability |
| `all_loans` | admin only | Every loan |
| `admin_summary` | admin only | Users, loans, overdue, failed events |

Security rules:
- The user id is captured in a closure; the model can never pass one.
- Admin tools are registered only for admins, and the internal queries re-check
  the role in the database.
- All tools are read-only. The model cannot write or delete anything.
- Tool output contains names, tool names and dates only (no emails, ids,
  descriptions).
- The system prompt treats tool results as data, not instructions (prompt
  injection defense). Worst case is a wrong answer, not another user's data.
- Limits: question length 300, history 8 messages, `recursionLimit: 8`,
  `maxTokens`.
- The API key exists only in Convex env. Provider errors are logged on the
  server; the user sees a generic message.

Common provider errors (see Convex logs, `assistant failed`): `402` no
credits, `429` rate limit (use a paid model or retry later), `401` wrong key,
"no endpoints support tool use" (pick a model with tool calling).

## Security decisions

- **RBAC in Convex**: role stored in `users`; every function calls
  `requireUser`/`requireAdmin` and the central `permissions.ts`. Admins can
  remove listings, view all loans, and set Trusted Lender, but cannot edit
  others' listings or act on their loans.
- **No self-promotion**: new users are always `user`; admins are created only
  with the internal function `makeAdmin`.
- **Server-side validation**: ownership ids come from the identity; strict
  validators reject extra fields.
- **Signed requests both ways**: HMAC-SHA256 over `timestamp.body`,
  constant-time comparison, 5-minute replay window. n8n endpoints also need the
  API key. Missing env vars make endpoints fail closed.
- **Secrets** live only in Convex env, gitignored `.env`, and n8n credentials.
  `npm run check:n8n` scans exported workflow JSON.
- **Idempotency**: outbox `eventKey`, `reminderKey`, n8n dedupe by `eventId`.

## Data minimization

- The public query returns tool name and category only.
- n8n receives only recipient name and email, the other party's name, tool
  name, dates, and status. No ids, roles, or descriptions.
- Write-backs to Convex contain no personal data.
- Lenders see the borrower's name, never the email.
- The AI assistant receives names, tool names and dates only, never emails.
  The LLM provider is a third party and must be disclosed in a privacy policy.
- n8n execution history is pruned after 7 days.

## Commands (from `server/`)

| Command | Description |
|---|---|
| `npx convex dev` | Run and sync functions |
| `npx vitest run` | Backend tests |
| `node scripts/test-webhook.mjs` | Send a signed test event |
| `node n8n/scripts/check-no-secrets.mjs` | Scan workflow JSON for secrets |

## Known limitations

- Notifications are mock nodes.
- "On loan" shows for any active loan (no date-based booking).
- The write-back reuses the HMAC secret.
- No per-user rate limit on the assistant yet (set a credit limit on the
  OpenRouter key).
- Lists use `take(200/500)`, not pagination.