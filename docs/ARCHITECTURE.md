# Miao Engineering Map

This document captures the current project shape before refactoring. Keep it in sync when modules move so later changes can be checked against the intended behavior.

## Runtime Shape

- Client: Vite, React 19, React Router, Tailwind CSS v4.
- Server: Express served from `server.ts`.
- Development entry: `npm run dev`, which runs `tsx server.ts`.
- Production build: Vite client bundle plus an esbuild bundle for `server.ts`.
- Persistence:
  - Browser: `localStorage` for user/session/domain records, IndexedDB for larger media payloads.
  - Server: JSON files under `data/`.
  - Uploads: local files under `uploads/`.
- AI providers:
  - DashScope for image/video generation.
  - Volcengine Ark for image/video generation.

## Frontend Entry Points

- `src/main.tsx` bootstraps React, global touch behavior, ErrorBoundary, and service worker registration.
- `src/App.tsx` owns top-level auth gating, route definitions, deep-link handling, and lazy page loading.
- `src/components/layout/MainLayout.tsx` owns the persistent bottom-tab experience for the main app.
- `src/context/AuthContext.tsx` owns authenticated user state and migration from older local-only users.

## Data Flow

1. User logs in or registers through `AuthContext`.
2. Auth state and token are stored through `storage`.
3. Domain operations are mostly called through `storage`, `friendService`, `aiClient`, and `FileManager`.
4. Client data is written optimistically to local storage, then synced to server JSON endpoints where available.
5. AI generation is requested from the client through `/api/ai/*` routes and polled until complete.
6. Generated or uploaded media may be persisted to server uploads for stable playback.

## Refactor Boundaries

The safest module boundaries are:

- Server storage: JSON read/write helpers and typed repositories.
- Server auth: token signing/verification, auth middleware, public user mapping.
- Server routes: auth, user, cats, diaries, letters, points, friends, notifications, feedback, upload, AI, proxy/assets.
- Client storage facade: keep the exported `storage` object stable while moving implementation behind it.
- Client request helpers: shared token headers and response parsing.
- Page hooks: extract orchestration from large pages without changing rendered markup or class names.

## Non-Goals During Refactor

- Do not change route paths.
- Do not change request/response shapes.
- Do not change UI copy, visual styling, layout, or interaction order.
- Do not remove legacy `/api/*` routes until current clients have been audited.
- Do not migrate storage formats without a compatibility path.
