# talk-ui

Web frontend for the `talk` AI assistant, built on CopilotKit + AG-UI protocol.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+ (see `.nvmrc`)
- [pnpm](https://pnpm.io/) 9+

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app runs at `http://localhost:5173` by default.

## Environment Variables

| Variable         | Default                 | Description       |
| ---------------- | ----------------------- | ----------------- |
| `VITE_AGENT_URL` | `http://localhost:8090` | Backend AG-UI URL |

Copy `.env.example` to `.env.local` and adjust as needed.

## Scripts

| Command              | Description                         |
| -------------------- | ----------------------------------- |
| `pnpm dev`           | Start Vite dev server with HMR      |
| `pnpm build`         | TypeScript check + production build |
| `pnpm preview`       | Preview production build locally    |
| `pnpm lint`          | Run ESLint                          |
| `pnpm lint:fix`      | Run ESLint with auto-fix            |
| `pnpm format`        | Check Prettier formatting           |
| `pnpm format:fix`    | Fix Prettier formatting             |
| `pnpm test`          | Run Vitest tests                    |
| `pnpm test:watch`    | Run Vitest in watch mode            |
| `pnpm test:coverage` | Run tests with coverage report      |

## Tech Stack

- **Framework:** React 19 + TypeScript (strict)
- **Build:** Vite 8
- **Chat SDK:** CopilotKit + AG-UI protocol (`@ag-ui/client`)
- **Styling:** Tailwind CSS v4 (dark theme only)
- **Routing:** TanStack Router
- **Validation:** Zod (env + data boundaries)
- **Testing:** Vitest + Testing Library
- **Linting:** ESLint (flat config, strict) + Prettier
- **CI:** GitHub Actions (build + lint + test)

## Running with Backend

The app connects to a `talk serve` backend via the AG-UI protocol.

```bash
# In the talk-backend workspace:
cd talk && go run ./cmd/cli serve

# Then in talk-ui:
pnpm dev
```

The connection is configured via `VITE_AGENT_URL` (validated at startup with Zod).

## Project Structure

```
src/
├── config/
│   ├── env.ts       # Zod-validated environment config
│   └── agent.ts     # HttpAgent setup for CopilotKit
├── routes/          # TanStack Router file-based routes
│   ├── __root.tsx   # Root layout (CopilotKit provider)
│   └── index.tsx    # Home route (/)
├── __tests__/       # Test files
├── App.tsx          # Main app component
├── main.tsx         # Entry point (router setup)
├── index.css        # Tailwind imports + theme
└── routeTree.gen.ts # Auto-generated route tree
```
