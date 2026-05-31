# VIP Resort AI Assistant Web

VIP Resort AI Assistant Web 是一套智慧渡假村會員服務平台前端系統，提供 VIP 旅客個人化旅遊推薦、AI 導覽、景點地圖及智能助理等功能。

本專案採用 React + TypeScript 開發，未來將透過 FastAPI 提供後端 API 與 AI 服務。

---

## Technology Stack

### Frontend

* React 19
* TypeScript
* Vite
* React Router DOM
* Axios
* Lucide React

### Backend (Planned)

* FastAPI
* Python 3.12+
* Azure API
* Gemini API
* RAG
* Vector Database

---

## Project Structure

```text
src/
├─ apis/
│  └─ authApi.ts
│
├─ components/
│  ├─ Header.tsx
│  └─ Sidebar.tsx
│
├─ layouts/
│  └─ MainLayout.tsx
│
├─ mocks/
│  └─ login_success.json
│
├─ pages/
│  ├─ LoginPage.tsx
│  ├─ AssistantPage.tsx
│  ├─ ItineraryPage.tsx
│  ├─ GuidePage.tsx
│  └─ MapPage.tsx
│
├─ routes/
│  └─ ProtectedRoute.tsx
│
├─ types/
│  └─ auth.ts
│
├─ App.tsx
├─ main.tsx
└─ index.css
```

---

## Features

### Authentication

* Login Page
* Mock Login API
* Protected Route
* Session Storage
* Logout

### Layout

* Responsive Layout (RWD)
* Desktop Sidebar Navigation
* Mobile Bottom Navigation
* Shared Header Component

### Main Pages

* Smart Assistant
* Personalized Itinerary
* AI Tour Guide
* Resort Map

---

## Environment Variables

### Development

Create:

```text
.env.development
```

Example:

```env
VITE_USE_MOCK=true
VITE_PROXY_API=http://localhost:8000
```

---

## Mock Mode

When:

```env
VITE_USE_MOCK=true
```

Frontend uses:

```text
src/mocks/
```

instead of backend APIs.

Example:

```typescript
const useMock =
  import.meta.env.VITE_USE_MOCK === "true";
```

---

## Development

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Default URL:

```text
http://localhost:5173
```

---

## Build

Production build:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

---

## Coding Standards

### React

* Functional Components Only
* React Hooks
* TypeScript First
* No Class Components

### Naming

Components:

```text
PascalCase
```

Example:

```text
LoginPage.tsx
Sidebar.tsx
```

Functions:

```text
camelCase
```

Example:

```typescript
handleLogin()
loadProfile()
```

### API Layer

All API requests must be placed inside:

```text
src/apis/
```

UI components should never directly call axios.

Example:

```typescript
authApi.ts
profileApi.ts
itineraryApi.ts
```

---

## Future Roadmap

### Phase 1

* Login
* Layout
* Responsive Design

### Phase 2

* FastAPI Integration
* User Profile API
* Resort Recommendation API

### Phase 3

* AI Chat Assistant
* Azure or Gemini Integration
* RAG Knowledge Base

### Phase 4

* Image Recognition
* AI Tour Guide
* Personalized Recommendation Engine

---

## Git Commit Convention

Examples:

```bash
feat(frontend): add login page

feat(frontend): implement protected routes

feat(frontend): add responsive layout

refactor(frontend): use authenticated user data in sidebar

fix(frontend): resolve mobile navigation issue
```

---

## Notes

This project currently uses mock data for frontend development.

Backend integration will be implemented using FastAPI services in future iterations.
