# LendLoop Client

The user-facing web app for LendLoop, a neighborhood tool-lending board.
Neighbors list tools they will lend, request to borrow, approve or decline
requests, and mark loans as returned. Admins moderate listings and loans.

## Tools and technology

| Tool | Purpose |
|---|---|
| **Next.js 16 (App Router)** | Routing, layouts, server and client components |
| **React 19** | UI |
| **TypeScript** | Type safety across the app, including Convex generated types |
| **Tailwind CSS** | Styling |
| **Clerk** (`@clerk/nextjs`) | Authentication: sign-in, sessions, route protection (`proxy.ts`) |
| **Convex** (`convex/react`) | Live data: queries and mutations with real-time updates |
| **Vitest + React Testing Library** | Unit and component tests |
| **Playwright** | End-to-end smoke tests |

The client never talks to n8n. It only calls Convex functions. All permission
checks are enforced in Convex; the UI only hides things for convenience.

## Folder structure

```
client/
├── src/
│   ├── app/                         # Routing only (thin pages)
│   │   ├── layout.tsx               # ClerkProvider + ConvexClientProvider
│   │   ├── globals.css
│   │   ├── (public)/page.tsx        # Landing page + public tool list
│   │   ├── (auth)/sign-in/[[...sign-in]]/page.tsx
│   │   └── (app)/                   # Signed-in area (AppShell layout)
│   │       ├── layout.tsx
│   │       ├── tools/page.tsx               # Browse + category filter
│   │       ├── tools/new/page.tsx           # List a tool
│   │       ├── tools/[toolId]/edit/page.tsx # Edit own listing
│   │       ├── my-listings/page.tsx
│   │       ├── my-requests/page.tsx
│   │       ├── incoming-requests/page.tsx
│   │       └── admin/                       # Admin only (layout guard)
│   │           ├── layout.tsx
│   │           ├── page.tsx                 # Overview + failed automation events
│   │           ├── listings/page.tsx
│   │           ├── loans/page.tsx
│   │           └── users/page.tsx
│   │
│   ├── features/                    # Feature modules
│   │   ├── auth/        (AuthButtons, useCurrentUser, useStoreUser)
│   │   ├── landing/     (Hero, PublicToolList)
│   │   ├── layout/      (Navbar, AppShell)
│   │   ├── tools/       (ToolCard, ToolGrid, ToolForm, EditTool, MyListings,
│   │   │                 CategoryFilter, AvailabilityBadge, TrustedLenderBadge,
│   │   │                 BrowseTools, constants)
│   │   ├── requests/    (RequestToolButton, MyRequests, IncomingRequests,
│   │   │                 RequestStatusBadge)
│   │   ├── loans/       (LoanCard, MarkReturnedButton)
│   │   └── admin/       (AdminGate, AdminNav, AdminOverview,
│   │                     AdminListingsTable, AdminLoansTable, UsersTable,
│   │                     FailedEventsPanel)
│   │
│   ├── providers/ConvexClientProvider.tsx
│   ├── hooks/useRun.ts              # Runs a mutation with busy/error state
│   ├── lib/                         # dates.ts, errors.ts
│   ├── config/site.ts               # Name and tagline
│   └── proxy.ts                     # Clerk route protection (Next.js 16)
│
├── tests/
│   ├── e2e/public-page.spec.ts      # Playwright
│   └── setup/vitest.setup.ts
│
├── .env.example
├── next.config.ts
├── vitest.config.mts
├── playwright.config.ts
├── tsconfig.json                    # "@/*" and "@server/*" path aliases
└── package.json
```

`@server/*` points to `../server/convex/*`, so the client imports the generated
Convex API and gets fully typed queries and mutations
(`import { api } from "@server/_generated/api"`).

## Environment variables

Create `client/.env.local` (never commit it). Copy from `.env.example`.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL (ends in `.convex.cloud`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_test_...`) |
| `CLERK_SECRET_KEY` | Clerk secret key (`sk_test_...`), server-side only |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/tools` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/tools` |

Rules: one variable per line, no spaces around `=`, no quotes. Restart the dev
server after changing this file.

## Local setup

Prerequisites: Node 20+, a Clerk account, and the server side already running
(see `server/README.md`).

1. From the repo root, install dependencies:
   ```bash
   npm install
   ```
2. In Clerk, create an application and enable email sign-in. Activate
   **Integrations, Convex**. The JWT template named `convex` must exist with
   `"aud": "convex"`.
3. Copy `client/.env.example` to `client/.env.local` and fill in the values above.
4. Start the Convex backend in another terminal (`cd server && npx convex dev`).
5. Start the client:
   ```bash
   npm run dev -w client
   ```
6. Open http://localhost:3000 and sign in. A user record is created in Convex
   on first sign-in with the role `user`.

## Scripts

| Command (from repo root) | Description |
|---|---|
| `npm run dev -w client` | Start the dev server |
| `npm run build -w client` | Production build |
| `npm run lint -w client` | ESLint |
| `npm run test -w client` | Vitest unit and component tests |
| `npm run test:e2e -w client` | Playwright E2E (needs valid `.env.local`) |

## Security and UX notes

- `proxy.ts` blocks signed-out visitors from private routes. This is only a
  first gate; real authorization is in Convex.
- The Admin link and `AdminGate` are UI conveniences. Admin data is protected
  by `requireAdmin` in Convex.
- `AppShell` waits for the Convex user record before rendering private pages,
  so authenticated queries never run too early.
- Forms validate for UX, and the server validates again.
- The public page shows tool name and category only.
- Loading skeletons, empty states, and clear error messages (from `ConvexError`)
  on every list and action.
- Admin Overview shows failed automation events so failures are never silent.