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

[src/App.tsx](src/App.tsx) defines all routes. The entire app (except `/login`) is wrapped in `ProtectedRoute`, which checks `localStorage.customer_access_token`. On logout, both `customer_access_token` and `customer_profile` are cleared and the user is redirected to `/login`.

```
/login          → LoginPage        (public)
/               → ProtectedRoute
  /             → redirect → /assistant
  /assistant    → AssistantPage    (chat UI with voice recording)
  /itinerary    → ItineraryPage    (date/preference filtered timeline)
  /guide        → GuidePage        (placeholder)
  /map          → MapPage          (placeholder)
```

After login, `LoginResponse` is split into two localStorage entries:
- `customer_access_token` — the JWT string
- `customer_profile` — JSON-serialized `CustomerProfile` object

### Layout

`MainLayout` composes `Header` + `Sidebar` + `<Outlet />`. Responsive breakpoint is **768px**:
- Desktop: fixed 320px sidebar on the left, main content to the right
- Mobile: no sidebar; bottom navigation bar (76px) replaces it

`MainLayout` owns a `pageTitles` map keyed by pathname that drives the `Header` title prop.

### State Management

No external state library. State lives in:
- **Component-local `useState`** (form inputs, chat messages, loading flags)
- **`localStorage`** for session persistence (`customer_access_token`, `customer_profile` as JSON)
- `Sidebar` reads `customer_profile` on mount via `useEffect` to display guest name and room

### API Layer

All HTTP calls must live in `src/apis/`. Components never call Axios directly.

Mock-guard pattern (used consistently in all API files):

```typescript
const useMock = import.meta.env.VITE_USE_MOCK === "true";

export async function someCall(...) {
  if (useMock) return mockData as SomeType;
  const { data } = await axios.post<SomeType>("/api/...", ...);
  return data;
}
```

Current API files and their backend endpoints:

| File | Endpoint | Method |
|---|---|---|
| `authApi.ts` | `/api/auth/login` | POST |
| `assistantApi.ts` | `/api/nlplabs/speech-to-text` | POST |
| `assistantApi.ts` | `/api/nlplabs/smart-helper-msg` | POST |
| `itineraryApi.ts` | `/api/recommends/exclusive-itinerary` | GET |

### Types

Shared TypeScript types live in `src/types/`:
- `auth.ts` — `LoginRequest`, `LoginResponse`, `CustomerProfile`
- `assistant.ts` — `SpeechToTextResponse`, `SmartHelperRequest`, `SmartHelperResponse`
- `itinerary.ts` — `ItinerarySchedule`, `ItineraryDateGroup`

Page-local types (e.g., `ChatMessage` in `AssistantPage`) stay in their component file when not shared.

## Coding Conventions

- **Functional components only**, no class components
- Components: `PascalCase` filenames; functions/handlers: `camelCase`
- Commits follow Conventional Commits with `(frontend)` scope:
  `feat(frontend): ...`, `fix(frontend): ...`, `refactor(frontend): ...`

## Project Rules

### Architecture

- React handles UI only
- FastAPI handles business logic
- All API calls must go through `src/apis/`
- Components must never call axios directly

### TypeScript

- Avoid `any` whenever possible
- Use shared types under `src/types/`; only keep types local to a component when they are not reused
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

```
feat(frontend):
fix(frontend):
refactor(frontend):
docs(project):
chore(frontend):
```
