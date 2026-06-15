---
name: Client-side streaming architecture
description: How Sarad fetches streams and TMDB data — fully client-side, no backend required, all absolute https:// URLs.
---

## Rule
All outbound API calls from the frontend use absolute `https://` URLs. No relative `/api/` paths in any streaming, TMDB, or debrid logic.

**Why:** App is built to work as a standalone static site and Android APK (via Capacitor or similar). Relative paths break in non-browser runtimes with no local server.

## Key libs

- `src/lib/tmdb.ts` — Direct TMDB API client (`https://api.themoviedb.org/3`). Functions: `fetchMovie`, `fetchTv`, `fetchSeason`, `searchMulti`, `fetchCategory`, `fetchDiscover`, `getImdbId`.
- `src/lib/stream-scraper.ts` — Client-side stream aggregator. Sources: Torrentio (via CORS proxy), YTS (direct), EZTV (direct), apibay (via CORS proxy). SQF filter + dedup + sorting built in. Main export: `getStreams(imdbId, type, season, episode, title)`.
- `src/lib/debrid.ts` — Client-side debrid resolution. `resolveDebrid(config, stream)` calls Real-Debrid or AllDebrid REST APIs directly from the browser.

## CORS strategy
- Primary proxy: `https://corsproxy.io/?url={encoded}`
- Fallback proxy: `https://api.allorigins.win/raw?url={encoded}`
- Applied to: Torrentio, apibay (TPB)
- Direct (have CORS headers): YTS (`yts.mx`), EZTV (`eztv.re`), TMDB, Real-Debrid, AllDebrid

## Admin auth
Client-side only. Credentials checked against hardcoded constants in `admin-login.tsx`. No API call for auth.

**How to apply:** Never add `fetch('/api/...')` to the frontend. If a new feature needs external data, call the provider's public API directly or wrap in corsproxy.io.
