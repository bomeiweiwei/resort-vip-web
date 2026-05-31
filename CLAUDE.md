# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server at http://localhost:5173
npm run build      # tsc -b && vite build (TypeScript check then bundle)
npm run lint       # ESLint with flat config (TypeScript + React hooks)
npm run preview    # Serve the production build locally
```

There is no test runner configured yet.

## Environment Variables

Create `.env.development` for local work:

```env
VITE_USE_MOCK=true          # Use src/mocks/ instead of live backend
VITE_PROXY_API=http://localhost:8000  # Proxy /api/* to FastAPI backend
```

When `VITE_USE_MOCK=true`, API modules import mock JSON directly instead of hitting the proxy.

## Architecture

**VIP Resort AI Assistant** — a React SPA for resort VIP guests. The backend (FastAPI + Azure/Gemini AI + RAG) is planned but not yet implemented; all current data comes from mocks.

### Routing & Auth

[src/App.tsx](src/App.tsx) defines all routes. The entire app (except `/login`) is wrapped in `ProtectedRoute`, which checks `localStorage.vip_token`. On logout, both `vip_token` and `vip_user` are cleared and the user is redirected to `/login`.

```
/login          → LoginPage        (public)
/               → ProtectedRoute
  /             → redirect → /assistant
  /assistant    → AssistantPage    (placeholder)
  /itinerary    → ItineraryPage    (placeholder)
  /guide        → GuidePage        (placeholder)
  /map          → MapPage          (placeholder)
```

### Layout

`MainLayout` composes `Header` + `Sidebar` + `<Outlet />`. Responsive breakpoint is **768px**:
- Desktop: fixed 320px sidebar on the left, main content to the right
- Mobile: no sidebar; bottom navigation bar (76px) replaces it

### State Management

No external state library. State lives in:
- **Component-local `useState`** (form inputs, error messages)
- **`localStorage`** for session persistence (`vip_token`, `vip_user` as JSON)
- `Sidebar` reads `vip_user` on mount via `useEffect`

### API Layer

All HTTP calls must live in `src/apis/`. Components never call Axios directly.

Pattern used in [src/apis/authApi.ts](src/apis/authApi.ts):

```typescript
const useMock = import.meta.env.VITE_USE_MOCK === "true";

export async function login(...) {
  if (useMock) return mockData as LoginResponse;
  const { data } = await axios.post<LoginResponse>("/api/auth/login", ...);
  return data;
}
```

Future API files (`profileApi.ts`, `itineraryApi.ts`, etc.) follow the same mock-guard pattern. Mock data lives in `src/mocks/`.

### Types

Shared TypeScript types in `src/types/auth.ts` (`VipProfile`, `LoginResponse`). Add new domain types here as features are built.

## Coding Conventions

- **Functional components only**, no class components
- Components: `PascalCase` filenames; functions/handlers: `camelCase`
- Commits follow Conventional Commits with `(frontend)` scope:
  `feat(frontend): ...`, `fix(frontend): ...`, `refactor(frontend): ...`

## Project Rules

### Architecture

- React handles UI only
- FastAPI handles business logic
- All API calls must go through src/apis
- Components must never call axios directly

### TypeScript

- Avoid any whenever possible
- Use shared types under src/types
- Prefer explicit typing

### Development

- Support desktop and mobile layouts
- Mobile-first responsive design
- Reusable components preferred

### AI Features

Planned integrations:

- Gemini AI
- RAG Knowledge Base
- Image Recognition
- Personalized Recommendation Engine

### Git

Use Conventional Commits:

feat(frontend):
fix(frontend):
refactor(frontend):
docs(project):
chore(frontend):
