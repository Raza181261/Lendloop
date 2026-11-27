# Production notes: what I would change

LendLoop works end to end in development. This note lists what I would change
before running it for real users, grouped by area and ordered by priority.

## Priority summary

| Priority | Change | Risk if skipped |
|---|---|---|
| P0 | Fixed HTTPS URL for n8n (no tunnel) | Webhooks silently fail whenever the tunnel changes |
| P0 | Rotate and separate secrets, use a secret manager | A leaked secret allows forged webhooks or API calls |
| P0 | Production Clerk and Convex deployments | Dev keys and dev data in production |
| P0 | Real notification channel (email) | Users never actually receive messages |
| P1 | n8n on PostgreSQL, pinned version, backups | Lost workflows or credentials |
| P1 | Alerting on failures | Failures are visible only if an admin looks |
| P1 | Rate limiting and abuse protection | Spam listings and requests |
| P2 | Availability by date, audit log, privacy tooling | Product and compliance gaps |

## 1. Hosting and environments

- **Convex**: create a separate production deployment (`npx convex deploy`).
  Keep dev and prod data and env vars fully separate.
- **Client**: deploy Next.js to Vercel (or similar). Set the production
  `NEXT_PUBLIC_CONVEX_URL` and Clerk keys as platform environment variables.
- **Clerk**: use a production instance (`pk_live_` and `sk_live_` keys), with its
  own JWT issuer. Update `CLERK_JWT_ISSUER_DOMAIN` in Convex, and recreate the
  `convex` JWT template with `"aud": "convex"`. Restrict allowed origins and
  redirect URLs to the real domain.
- **Environments**: dev, staging, prod, each with its own Convex deployment,
  Clerk instance, and n8n. Never share secrets between them.

## 2. n8n

| Now (development) | Production |
|---|---|
| Docker on a laptop, SQLite | Dedicated server or managed n8n Cloud, **PostgreSQL** |
| Cloudflare quick tunnel (URL changes on every restart) | **Fixed HTTPS domain** behind a reverse proxy (Caddy, Nginx, or a cloud load balancer) with TLS |
| Image `n8n:latest` | **Pinned version**, upgraded deliberately after testing |
| Single process | Queue mode with workers if volume grows |
| Port exposed on `127.0.0.1` | Editor behind SSO or VPN; only `/webhook/*` public |
| 7-day execution pruning | Keep pruning, and set retention to match the privacy policy |

Also:
- Back up the database and `N8N_ENCRYPTION_KEY` (without the key, saved
  credentials are unreadable).
- Version-control the exported workflow JSON (already in the repo) and deploy
  them from CI instead of importing by hand.
- Restrict the webhook path at the proxy: only `POST /webhook/lendloop-events`
  from the internet, plus rate limits.
- Replace `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` with n8n external secrets or
  credentials, so workflow expressions don't need raw environment access.

## 3. Secrets

- Use a **secret manager** (Vercel env, Doppler, AWS/GCP Secret Manager) instead of
  `.env` files.
- Use **separate secrets per direction**: one HMAC key for Convex to n8n, another
  for n8n write-backs to Convex, and a separate API key. Today the write-back
  reuses `N8N_HMAC_SECRET` for simplicity.
- **Rotation**: scheduled rotation (for example every 90 days), and immediately
  after any suspected leak. Support two active secrets during rotation so
  nothing breaks mid-change.
- Keep the `check-no-secrets.mjs` scan in CI, and add a general secret scanner
  such as gitleaks.
- Rotate every secret that was ever pasted into chats, tickets, or screenshots
  during development.

## 4. Notifications

- Replace the mock nodes with a real provider (Resend, SendGrid, or SMTP for
  email; optionally Slack or Discord).
- Use a verified sending domain (SPF, DKIM, DMARC).
- Add **notification preferences** and an unsubscribe link, and respect them in
  the workflow.
- Handle provider errors explicitly: the reminder workflow already records
  `failed` with a reason, so bounces and invalid addresses show up in Convex.
- Limit reminder frequency (for example daily, up to a maximum count) so a
  borrower isn't reminded forever.

## 5. Reliability and error handling

What exists today: outbox pattern, retries with backoff (30s, 2m, 10m, 1h), a
cron safety net, idempotency keys, n8n dedupe, an error workflow, and a failed
events panel with Retry and Dismiss.

What I would add:
- **Alerting**: the Error Handler workflow should notify Slack or email (it
  currently logs a mock alert). Also alert when failed events exceed a threshold
  or when no events have been delivered for a period (n8n down).
- **Heartbeat**: a scheduled check that n8n is reachable, reported to an uptime
  monitor.
- **Dead-letter policy**: failed events older than a retention period are
  archived and then deleted, with a count shown to admins.
- **Dedupe store**: n8n's "remove duplicates" memory is local to the instance.
  For multi-instance setups, move dedupe to Convex (check `eventKey` before
  processing) or a shared store.
- **Backpressure**: cap the number of overdue loans processed per run and page
  through the rest, instead of a fixed `take(200)`.
- **Timezone**: store a clear timezone policy. Today dates are UTC day-starts and
  the schedule uses `Asia/Karachi`, so document the effect for borrowers in other
  zones.

## 6. Security hardening

- **Rate limiting** on mutations (per user and per IP) for creating listings and
  requests, using a Convex rate limiter component. Current caps (50 listings,
  10 pending requests) are only a basic guard.
- **Sign-up protection**: CAPTCHA or email verification requirements, and
  bot protection in Clerk.
- **Content safety**: moderation for listing names and descriptions, and a report
  button.
- **HTTP endpoints**: IP allow-list for the n8n endpoints if n8n has a static
  address; strict request size limits; and consistent audit logging of rejected
  requests.
- **Headers**: add a Content-Security-Policy and standard security headers in
  `next.config.ts`.
- **Dependencies**: Dependabot, `npm audit` in CI, and CodeQL.
- **Admin safety**: require a recent sign-in or MFA for admin accounts, and an
  **audit log** of admin actions (who removed which listing and when).
- **Roles**: keep admin creation only through an internal function, and review
  the admin list regularly.

## 7. Data, privacy, and compliance

- **Retention**: define how long to keep returned loans, reminders, and
  automation events (for example 12 months), and delete them with a scheduled
  job.
- **Account deletion and export**: a flow that removes the user's listings,
  requests, and personal fields, and handles their open loans safely. Sync
  deletion with Clerk using webhooks.
- **Minimization**: continue sending n8n only name, email, tool name, dates,
  and status. Consider sending only an opaque recipient id and letting n8n
  resolve the email from a Convex endpoint at send time, so execution history
  holds no emails.
- **Logs**: avoid logging emails or message text; keep n8n execution data
  pruning enabled.
- **Policy pages**: privacy policy and terms of use; a clear statement that
  lending is between neighbors (liability, damaged tools).

## 8. Product and data model improvements

- **Availability by date**: today a tool shows "On loan" if it has any active
  loan, even one starting next month. Show a booking calendar and mark a tool
  unavailable only for its booked dates.
- **Pagination**: replace `take(100/200)` with cursor pagination and search in
  Browse and Admin.
- **Overlap rule**: the server already rejects overlapping approved loans; add a
  clearer UI (booked ranges on the date picker).
- **Reminders for upcoming due dates** (not only overdue), and a final
  escalation to the lender.
- **Trust signals**: ratings or return history behind the Trusted Lender badge.
- **Photos** for tools, stored in Convex file storage with size and type limits.
- **Indexes**: review query patterns at scale, and replace the `filter` used in
  `makeAdmin` and "my pending requests" with indexed queries.

## 9. Observability

- Structured logs from Convex and n8n shipped to one place (Datadog, Grafana
  Loki, or similar).
- Error tracking in the client (Sentry), tagged by release.
- Dashboards: events sent vs failed, retry counts, reminders sent per day,
  overdue loans, and webhook latency.
- Uptime checks on the public page and the n8n webhook.

## 10. CI/CD and quality

Run on every pull request:

```
lint, typecheck, npm run test:server, npm run test -w client,
npm run check:n8n, Playwright E2E, build
```

- Deploy previews per pull request, with a staging Convex deployment.
- Add Playwright tests for the signed-in flows (list, request, approve, return)
  using Clerk test users, plus an accessibility check with axe.
- Add contract tests for the webhook payload and the n8n HTTP endpoints, so a
  change on one side can't silently break the other.
- Branch protection and required reviews, conventional commits, and automated
  releases.
- Backups: Convex snapshot exports on a schedule, and a tested restore
  procedure.

## 11. Rollout checklist

1. Create production Clerk and Convex projects; set all environment variables.
2. Deploy n8n on a fixed HTTPS URL with PostgreSQL; create credentials; import
   workflows; link the error workflow; publish.
3. Generate fresh secrets (never reuse development values) and configure both
   sides.
4. Set up email sending and verify the domain.
5. Create the first admin with `makeAdmin`.
6. Run a smoke test: sign up, list a tool, request, approve, return, and force
   an overdue loan to confirm the reminder and the write-back.
7. Confirm alerts fire by deliberately breaking the webhook in staging.
8. Enable monitoring, backups, and the CI gates above.

## 12. AI assistant

- **Rate limiting per user** (for example 10 questions per minute and a daily
  cap). This is the most important gap: today one user could spend the whole
  provider budget. Also set a hard credit limit on the OpenRouter key.
- **Cost and quality**: pin the model id, monitor token use per request, and
  alert on spikes. Choose a model with reliable tool calling.
- **Privacy**: the provider receives names, tool names and dates. Disclose it in
  the privacy policy, and restrict OpenRouter routing to providers that do not
  train on data.
- **Streaming and persistence**: stream replies, and store chat history on the
  server with a retention policy instead of keeping it in the browser.
- **Evaluation**: a small set of fixed questions with expected tool calls, run
  in CI against a cheap model, to catch regressions and prompt-injection cases.
- **Fallback**: if the provider is down (402/429/5xx), fall back to the
  rule-based answers or show a clear "busy" message.
- **Audit**: log which tools were called per question (not the full text) for
  admin review.