# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Commands

```bash
npm run dev        # Vite dev server → http://localhost:5173
npm run build      # tsc -b && vite build (type-check then bundle)
npm run lint       # ESLint flat config (TypeScript + React hooks)
npm run preview    # Serve the production build locally
```

No test runner is configured.

## Environment Variables

Create `.env.development` for local work:

```env
VITE_USE_MOCK=true                    # Use src/mocks/ instead of live backend
VITE_PROXY_API=http://localhost:8001  # Proxy /api/* to FastAPI when mock is off
```

When `VITE_USE_MOCK=true`, every API function returns its local JSON fixture and never hits the network.

## Architecture

**VIP Resort AI Assistant** — a React SPA for resort VIP guests. The backend (FastAPI + Azure / Gemini AI + RAG) is under development; all current data comes from mocks.

### Routing & Auth

[src/App.tsx](src/App.tsx) defines all routes. Protected routes check `localStorage.customer_access_token`. On logout, both `customer_access_token` and `customer_profile` are cleared and the user is redirected to `/login`.

```
/login                → LoginPage       (public)
/vip-login?token=<jwt>→ VipLoginPage    (public — magic-link entry)
/                     → ProtectedRoute
  /                   → redirect → /assistant
  /assistant          → AssistantPage   (chat UI with voice recording)
  /itinerary          → ItineraryPage   (date/preference filtered timeline)
  /guide              → GuidePage       (placeholder)
  /map                → MapPage         (placeholder)
```

**Magic-link flow** — the backend emails VIP guests a one-time signed JWT. `VipLoginPage` extracts `?token=`, calls `vipMagicLogin()`, and persists the session exactly like password login. Missing or invalid tokens redirect to `/login`.

After any login, the response is split into two `localStorage` keys:
- `customer_access_token` — the JWT string (sent as `Authorization: Bearer` on every `apiClient` request)
- `customer_profile` — JSON-serialized `CustomerProfile`

### Layout

`MainLayout` composes `Header` + `Sidebar` + `<Outlet />`. Responsive breakpoint: **768 px**.
- Desktop: fixed 320 px sidebar on the left
- Mobile: no sidebar; 76 px bottom navigation bar replaces it

`MainLayout` owns a `pageTitles` map keyed by pathname that drives the `Header` title prop.

### State Management

No external state library:
- **Component-local `useState`** for form inputs, chat messages, loading flags
- **`localStorage`** for session persistence
- `Sidebar` reads `customer_profile` on mount via `useEffect` to display guest name and room

### API Layer

All HTTP calls must live in `src/apis/`. Components never call Axios directly.

`apiClient` ([src/apis/apiClient.ts](src/apis/apiClient.ts)) is a shared Axios instance that:
- Sets `baseURL` to `VITE_PROXY_API`
- Injects `Authorization: Bearer <token>` when a token is present in `localStorage`
- On a `401` response, clears session and hard-redirects to `/login`

Mock-guard pattern used in every API file:

```typescript
const useMock = import.meta.env.VITE_USE_MOCK === "true";

export async function someCall(...) {
  if (useMock) return mockData as SomeType;
  const { data } = await apiClient.post<SomeType>("/api/...", ...);
  return data;
}
```

Current API files and their backend endpoints:

| File | Function | Endpoint | Method |
|---|---|---|---|
| `authApi.ts` | `login` | `/api/auth/login` | POST |
| `authApi.ts` | `vipMagicLogin` | `/api/auth/vip-login` | POST |
| `assistantApi.ts` | `sendMsg` | `/api/assistant/send-msg` | POST |
| `assistantApi.ts` | `speechToText` | `/api/assistant/speech-to-text` | POST |
| `assistantApi.ts` | `textToSpeech` | `/api/assistant/text-to-speech` | POST |
| `itineraryApi.ts` | `getExclusiveItinerary` | `/api/itinerary/exclusive-itinerary` | GET |
| `itineraryApi.ts` | `submitFeedback` | `/api/itinerary/feedback` | POST |

### Types

Shared TypeScript types live in `src/types/`:

| File | Exported types |
|---|---|
| `auth.ts` | `LoginRequest`, `LoginResponse`, `CustomerProfile`, `VipMagicLoginResponse` |
| `assistant.ts` | `SpeechToTextResponse`, `SmartHelperRequest`, `AssistantResponse` |
| `itinerary.ts` | `ItinerarySchedule`, `ItineraryDateGroup`, `ItineraryFeedbackRequest`, `ItineraryFeedbackResponse` |
| `chat_message.ts` | `ChatMessage` |

Keep types in `src/types/` when shared across files. Types used only inside one component stay in that component file.

## Docker

The `Dockerfile` is a two-stage build: `node:24-alpine` compiles the Vite bundle, then `nginx:1.29-alpine` serves the static output on port 80.

```bash
# Build frontend image
docker build --no-cache --build-arg VITE_PROXY_API=http://localhost:8001 -t resort-vip-web .

# Build backend image (run from the FastAPI repo)
docker build --no-cache -t resort-vip-api .

# Run frontend
docker run -d --name resort-vip-web -p 5174:80 resort-vip-web
```

`VITE_USE_MOCK` is forced to `false` inside the image — the Docker build always targets a live backend.

## Coding Conventions

- Functional components only — no class components
- Component filenames: `PascalCase`; functions and handlers: `camelCase`
- Avoid `any`; prefer explicit TypeScript types
- Mobile-first responsive design; support both desktop and mobile layouts
- Reusable components preferred

## Git

Conventional Commits with `(frontend)` scope:

```
feat(frontend):
fix(frontend):
refactor(frontend):
docs(project):
chore(frontend):
```
