# Sarad | سرّاد

A premium bilingual (Arabic/English) streaming platform with luxury dark-mode design, TMDB integration, and a hidden admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/sarad run dev` — run the frontend (port 26054)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`, `TMDB_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `VITE_TMDB_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, Framer Motion, Video.js 8
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/sarad/` — React + Vite frontend (preview at `/`)
- `artifacts/api-server/` — Express 5 API server (routes at `/api`)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks + Zod schemas
- `lib/db/src/schema.ts` — Drizzle ORM schema (source of truth)

## Architecture decisions

- HMAC token auth for admin: `SESSION_SECRET` signs the token; `verifyToken` middleware protects all write endpoints.
- TMDB is proxied through `/api/tmdb/*` to keep the API key server-side only (also exposed as `VITE_TMDB_API_KEY` for client fallback).
- RTL/LTR controlled via `LanguageProvider` context — sets `document.dir` and `document.lang` on change; persisted to `localStorage`.
- My List feature is fully client-side (localStorage) — no auth required for users.
- Announcement ticker and hero slider pull live data from the DB, falling back to TMDB trending.

## Product

- **Home** — Hero slider (featured content), announcement ticker, ad banners, category rows (Movies, Series, Genres, TMDB Trending)
- **Search** — TMDB-powered search with local library matching; filter by All / Movies / Series
- **Watch** — Video.js player (HLS + MP4), movie metadata, bookmark button
- **My List** — Locally bookmarked content
- **Admin** (`/admin`) — Hidden login page; dashboard with Content / Ads / Announcements tabs, TMDB auto-fill for content

## User preferences

- Luxury dark mode: Black (#000), Gold (#D4AF37 / `--primary`), Dark Gray
- Bilingual: Arabic (RTL, Noto Sans Arabic) + English (LTR, Inter) — switcher in navbar
- Admin credentials: syckbocckv@gmail.com / DREED12345FNR

## Gotchas

- Never call service ports directly (use `localhost:80/api/...` via proxy, not `localhost:8080`).
- Run codegen after any OpenAPI spec changes before starting the frontend.
- `pnpm run dev` at workspace root has no script by design — use workflows.
- Video.js CSS is loaded dynamically in `watch.tsx` from CDN to avoid SSR issues.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
