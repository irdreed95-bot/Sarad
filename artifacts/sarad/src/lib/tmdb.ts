/**
 * Direct TMDB API client — no backend required.
 * All requests go to https://api.themoviedb.org/3 with the public API key.
 */

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY || "193c909f9dcb815ea536c783dab59ff5";
const BASE     = "https://api.themoviedb.org/3";

export const TMDB_IMG = {
  w300:     "https://image.tmdb.org/t/p/w300",
  w500:     "https://image.tmdb.org/t/p/w500",
  w780:     "https://image.tmdb.org/t/p/w780",
  original: "https://image.tmdb.org/t/p/original",
} as const;

function buildUrl(path: string, params: Record<string, string> = {}): string {
  const sp = new URLSearchParams({ api_key: TMDB_KEY, ...params });
  return `${BASE}${path}?${sp}`;
}

async function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const res = await fetch(buildUrl(path, params), { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`TMDB ${res.status} — ${path}`);
  return res.json() as Promise<T>;
}

// ── Content detail ────────────────────────────────────────────────────────────
export function fetchMovie(id: number): Promise<any> {
  return tmdbGet(`/movie/${id}`);
}

export function fetchTv(id: number): Promise<any> {
  return tmdbGet(`/tv/${id}`);
}

export function fetchSeason(tvId: number, season: number): Promise<any> {
  return tmdbGet(`/tv/${tvId}/season/${season}`);
}

// ── IMDB ID lookup ────────────────────────────────────────────────────────────
const imdbCache = new Map<string, string>();
export async function getImdbId(tmdbId: number, type: "movie" | "tv"): Promise<string | null> {
  const key = `${type}_${tmdbId}`;
  if (imdbCache.has(key)) return imdbCache.get(key)!;
  try {
    const data = await tmdbGet<any>(`/${type}/${tmdbId}/external_ids`);
    const id: string | null = data.imdb_id || null;
    if (id) imdbCache.set(key, id);
    return id;
  } catch { return null; }
}

// ── Search ────────────────────────────────────────────────────────────────────
export function searchMulti(query: string): Promise<any> {
  return tmdbGet("/search/multi", { query, include_adult: "false" });
}

// ── Category rows ─────────────────────────────────────────────────────────────
// Maps the legacy "category" string used by TmdbRow → direct TMDB path + params
const CATEGORY_MAP: Record<string, { path: string; params?: Record<string, string> }> = {
  "trending":         { path: "/trending/all/week" },
  "action":           { path: "/discover/movie", params: { with_genres: "28", sort_by: "popularity.desc" } },
  "horror":           { path: "/discover/movie", params: { with_genres: "27", sort_by: "popularity.desc" } },
  "comedy":           { path: "/discover/movie", params: { with_genres: "35", sort_by: "popularity.desc" } },
  "top-rated-series": { path: "/tv/top_rated" },
  "movie_popular":    { path: "/movie/popular" },
  "movie_top_rated":  { path: "/movie/top_rated" },
  "tv_popular":       { path: "/tv/popular" },
  "tv_top_rated":     { path: "/tv/top_rated" },
  "movie_upcoming":   { path: "/movie/upcoming" },
  "movie_now_playing":{ path: "/movie/now_playing" },
};

export function fetchCategory(category: string): Promise<any> {
  const map = CATEGORY_MAP[category];
  if (map) return tmdbGet(map.path, map.params);
  // Fallback: treat as a raw TMDB path segment
  return tmdbGet(`/${category}`);
}

// ── Genre discover ────────────────────────────────────────────────────────────
export function fetchDiscover(genreId: number, type: "movie" | "tv" = "movie"): Promise<any> {
  return tmdbGet(`/discover/${type}`, {
    with_genres: String(genreId),
    sort_by:     "popularity.desc",
  });
}
