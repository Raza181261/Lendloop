# n8n workflows

| File                        | Trigger               | Purpose                                                                 |
| --------------------------- | --------------------- | ----------------------------------------------------------------------- |
| `request-notification.json` | Webhook (from Convex) | Verifies HMAC + timestamp, dedupes by `eventId`, builds a notification  |
| `overdue-reminders.json`    | Daily 9:00            | Fetches overdue loans, sends reminders, writes status back (idempotent) |
| `error-handler.json`        | Error Trigger         | Surfaces failed runs                                                    |

## Import

1. Start n8n (`server/n8n/docker`, `docker compose up -d`).
2. Create the credential listed in `../credentials.template.md`.
3. Workflows -> Import from file, for each JSON.
4. In Overdue Reminders, select the credential in both HTTP Request nodes.
5. Set **Error workflow** to "LendLoop - Error Handler" in the settings of the other two.
6. Publish all three.

## Before committing a re-export

Run `npm run check:n8n` from the repo root. Blank any credential `id` it reports.
