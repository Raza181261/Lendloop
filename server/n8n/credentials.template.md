# n8n credentials and environment (no secrets here)

## Credential to create in the n8n UI

| Name                | Type        | Header name     | Value                  |
| ------------------- | ----------- | --------------- | ---------------------- |
| LendLoop Convex API | Header Auth | `Authorization` | `Bearer <N8N_API_KEY>` |

Used by: Overdue Reminders (both HTTP nodes).

## Environment variables (server/n8n/docker/.env)

| Variable               | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `N8N_ENCRYPTION_KEY`   | Encrypts credentials stored by n8n. Back it up. |
| `LENDLOOP_HMAC_SECRET` | Must equal `N8N_HMAC_SECRET` in Convex.         |
| `CONVEX_SITE_URL`      | Convex HTTP Actions URL (`.convex.site`).       |
| `WEBHOOK_URL`          | Public URL of n8n (tunnel URL in development).  |
| `GENERIC_TIMEZONE`     | Schedule timezone.                              |

## Convex environment variables (set with `npx convex env set`)

`CLERK_JWT_ISSUER_DOMAIN`, `N8N_WEBHOOK_URL`, `N8N_HMAC_SECRET`, `N8N_API_KEY`
