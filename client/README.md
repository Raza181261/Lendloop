# LendLoop Client

The user-facing web app for LendLoop, a neighborhood tool-lending board.
Neighbors list tools they will lend, request to borrow, approve or decline
requests, and mark loans as returned. Admins moderate listings and loans.
A built-in AI assistant answers questions about loans and tools.

## Tools and technology

| Tool | Purpose |
|---|---|
| **Next.js 16 (App Router)** | Routing, layouts, server and client components |
| **React 19** | UI |
| **TypeScript** | Type safety, including Convex generated types |
| **Tailwind CSS** | Styling |
| **Clerk** (`@clerk/nextjs`) | Authentication, sessions, route protection (`proxy.ts`) |
| **Convex** (`convex/react`) | Live queries and mutations; `useAction` for the AI assistant |
| **Vitest + React Testing Library** | Unit and component tests |
| **Playwright** | End-to-end smoke tests |

The client never talks to n8n or to the LLM provider. It only calls Convex
functions. Permission checks and AI data scoping happen in Convex; the UI only
hides things for convenience.

## Folder structure

```
client/
├── src/
│   ├── app/                         # Routing only (thin pages)
│   │   ├── layout.tsx               # ClerkProvider + ConvexClientProvider
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
│   │           ├── page.tsx                 # Overview + failed automation events
│   │           ├── listings/page.tsx
│   │           ├── loans/page.tsx
│   │           └── users/page.tsx
│   │
│   ├── features/
│   │   ├── auth/        (AuthButtons, useCurrentUser, useStoreUser)
│   │   ├── landing/     (Hero, PublicToolList)
│   │   ├── layout/      (Navbar, AppShell: also mounts the chat widget)
│   │   ├── tools/       (ToolCard, ToolGrid, ToolForm, EditTool, MyListings,
│   │   │                 BrowseTools, CategoryFilter, AvailabilityBadge,
│   │   │                 TrustedLenderBadge, constants)
│   │   ├── requests/    (RequestToolButton, MyRequests, IncomingRequests,
│   │   │                 RequestStatusBadge)
│   │   ├── loans/       (LoanCard, MarkReturnedButton)
│   │   ├── chatbot/     (ChatWidget: floating AI assistant, calls ai.agent.chat)
│   │   └── admin/       (AdminGate, AdminNav, AdminOverview,
│   │                     AdminListingsTable, AdminLoansTable, UsersTable,
│   │                     FailedEventsPanel)
│   │
│   ├── providers/ConvexClientProvider.tsx
│   ├── hooks/useRun.ts              # Runs a mutation with busy/error state
│   ├── lib/                         # dates.ts, errors.ts
│   ├── config/site.ts
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
Convex API with full types (`import { api } from "@server/_generated/api"`).

## AI assistant (client side)

- `ChatWidget` is a floating button (bottom right) shown on every signed-in
  page, for both users and admins (it is mounted in `AppShell`).
- It sends `{ question, history }` to the Convex action `ai.agent.chat` with
  `useAction`. History is the last few messages as plain text.
- The client holds no API key and never decides what data the assistant can
  see. The server derives the user and role from the Clerk token.
- Errors are shown as friendly messages from `ConvexError`.

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

The LLM key (`OPENROUTER_API_KEY`) is **not** a client variable. It lives only
in Convex (see `server/README.md`).

One variable per line, no spaces around `=`, no quotes. Restart the dev server
after changing this file.

## Local setup

Prerequisites: Node 20+, a Clerk account, and the server side running
(see `server/README.md`).

1. From the repo root: `npm install`
2. In Clerk, create an app and enable email sign-in. Activate
   **Integrations, Convex**. The JWT template `convex` must exist with
   `"aud": "convex"`.
3. Copy `client/.env.example` to `client/.env.local` and fill it in.
4. Start Convex in another terminal (`cd server && npx convex dev`).
5. Start the client: `npm run dev -w client`
6. Open http://localhost:3000 and sign in. A Convex user record is created on
   first sign-in with the role `user`.

## Scripts (from repo root)

| Command | Description |
|---|---|
| `npm run dev -w client` | Dev server |
| `npm run build -w client` | Production build |
| `npm run lint -w client` | ESLint |
| `npm run test -w client` | Vitest unit and component tests |
| `npm run test:e2e -w client` | Playwright E2E (needs a valid `.env.local`) |

## Security and UX notes

- `proxy.ts` blocks signed-out visitors from private routes. It is only a first
  gate; real authorization is in Convex.
- The Admin link and `AdminGate` are UI conveniences. Admin data is protected
  by `requireAdmin` in Convex.
- `AppShell` waits for the Convex user record before rendering private pages.
- Forms validate for UX, and the server validates again.
- The public page shows tool name and category only.
- Loading skeletons, empty states, and clear error messages on every list and action.
- The chat widget shows a "Thinking…" state and friendly errors, and never
  exposes provider errors to the user.
- Admin Overview shows failed automation events so failures are never silent.

## Known limitations

- Chat history lives in the browser only (not saved).
- Answers are not streamed; the reply arrives all at once.
- No pagination on long lists yet.