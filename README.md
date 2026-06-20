# VIP Resort AI Assistant — Frontend

A React SPA for resort VIP guests, providing a personalized AI chat assistant, itinerary planner, tour guide, and resort map. The backend (FastAPI + Azure / Gemini AI + RAG) is under development; all data currently comes from mocks.

---

## Tech Stack

| Layer | Libraries |
|---|---|
| Framework | React 19, TypeScript ~6, Vite 8 |
| Routing | React Router DOM 7 |
| HTTP | Axios |
| Icons | Lucide React |
| Linting | ESLint 10, typescript-eslint |

---

## Routes

| Path | Component | Access |
|---|---|---|
| `/login` | `LoginPage` | Public |
| `/vip-login?token=<jwt>` | `VipLoginPage` | Public — magic-link entry point |
| `/assistant` | `AssistantPage` | Protected |
| `/itinerary` | `ItineraryPage` | Protected |
| `/guide` | `GuidePage` | Protected |
| `/map` | `MapPage` | Protected |

`ProtectedRoute` checks `localStorage.customer_access_token`. Unauthenticated requests redirect to `/login`.

### Magic-link login (`/vip-login`)

The backend emails VIP guests a one-time link containing a signed JWT. `VipLoginPage` extracts the token, calls `vipMagicLogin()`, and persists the session identically to password login. Invalid or missing tokens fall back to `/login`.

---

## Project Structure

```
src/
├── apis/
│   ├── apiClient.ts          # Axios instance
│   ├── authApi.ts            # /api/auth/login, /api/auth/vip-login
│   ├── assistantApi.ts       # /api/assistant/{send-msg,speech-to-text,text-to-speech}
│   └── itineraryApi.ts       # /api/recommends/exclusive-itinerary
│
├── components/
│   ├── Header.tsx
│   └── Sidebar.tsx
│
├── layouts/
│   └── MainLayout.tsx        # Header + Sidebar + <Outlet />
│
├── mocks/                    # JSON fixtures for VITE_USE_MOCK=true
│
├── pages/
│   ├── LoginPage.tsx
│   ├── VipLoginPage.tsx
│   ├── AssistantPage.tsx     # Chat UI with voice recording
│   ├── ItineraryPage.tsx     # Date/preference filtered timeline
│   ├── GuidePage.tsx
│   └── MapPage.tsx
│
├── routes/
│   └── ProtectedRoute.tsx
│
├── types/
│   ├── auth.ts               # LoginRequest, LoginResponse, CustomerProfile
│   ├── assistant.ts          # SpeechToTextResponse, AssistantResponse
│   ├── itinerary.ts          # ItinerarySchedule, ItineraryDateGroup
│   └── chat_message.ts
│
├── App.tsx
├── main.tsx
└── index.css
```

---

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
```

### Environment variables

Create `.env.development` in the project root:

```env
VITE_USE_MOCK=true                      # Use src/mocks/ instead of live backend
VITE_PROXY_API=http://localhost:8000    # Proxy /api/* to FastAPI when mock is off
```

When `VITE_USE_MOCK=true`, every API module returns its local JSON fixture and never hits the network. Toggle it off to point at a running FastAPI instance.

---

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run preview   # Serve the production build locally
```

---

## API Layer

All HTTP calls live in `src/apis/`. Components never call Axios directly.

Mock-guard pattern used in every API file:

```typescript
const useMock = import.meta.env.VITE_USE_MOCK === "true";

export async function someCall(...) {
  if (useMock) return mockData as SomeType;
  const { data } = await apiClient.post<SomeType>("/api/...", ...);
  return data;
}
```

---

## Layout & Responsive Design

`MainLayout` composes `Header` + `Sidebar` + `<Outlet />`. Breakpoint: **768 px**.

- **Desktop** — fixed 320 px sidebar on the left
- **Mobile** — no sidebar; 76 px bottom navigation bar

---

## Session Storage

After login, two `localStorage` keys are written:

| Key | Value |
|---|---|
| `customer_access_token` | JWT string |
| `customer_profile` | JSON-serialized `CustomerProfile` |

Logout clears both keys and redirects to `/login`.

---

## Coding Conventions

- Functional components only — no class components
- Component filenames: `PascalCase`; handlers and functions: `camelCase`
- Avoid `any`; use shared types in `src/types/`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) with a `(frontend)` scope:

```
feat(frontend): ...
fix(frontend): ...
refactor(frontend): ...
```

---

## Roadmap

| Phase | Scope |
|---|---|
| 1 | Login, layout, responsive design — **done** |
| 2 | FastAPI integration, user profile API, resort recommendation API |
| 3 | AI chat assistant, Azure / Gemini integration, RAG knowledge base |
| 4 | Speech-to-text / text-to-speech, image recognition, personalized recommendations |
