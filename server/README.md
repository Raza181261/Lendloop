# LendLoop server

Convex backend: schema, RBAC, request/loan logic, signed webhooks to n8n and
authenticated HTTP endpoints for n8n.

## Commands (from `server/`)

- `npx convex dev` - run and sync functions
- `npx vitest run` - tests
- `node n8n/scripts/check-no-secrets.mjs` - secret scan

## Structure

`convex/` feature folders (users, tools, requests, loans, automation, lib),
`n8n/` (docker, workflows), `tests/`, `scripts/`.
