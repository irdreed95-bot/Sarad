import { Router, type IRouter } from "express";
import { SearchTmdbQueryParams, GetTmdbTrendingQueryParams, GetTmdbMovieParams } from "@workspace/api-zod";

const router: IRouter = Router();

const TMDB_API_KEY = process.env.TMDB_API_KEY || "193c909f9dcb815ea536c783dab59ff5";
const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(path: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${TMDB_BASE}${path}${sep}api_key=${TMDB_API_KEY}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

router.get("/tmdb/search", async (req, res): Promise<void> => {
  const params = SearchTmdbQueryParams.safeParse(req.query);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const { query, type = "multi" } = params.data;
  const endpoint = type === "multi" ? "search/multi" : type === "tv" ? "search/tv" : "search/movie";
  const data = await tmdbFetch(`/${endpoint}?query=${encodeURIComponent(query)}`);
  res.json(data);
});

router.get("/tmdb/trending", async (req, res): Promise<void> => {
  const params = GetTmdbTrendingQueryParams.safeParse(req.query);
  const mediaType = params.success && params.data.type && params.data.type !== "all" ? params.data.type : "all";
  const data = await tmdbFetch(`/trending/${mediaType}/week`);
  res.json(data);
});

router.get("/tmdb/movie/:tmdbId", async (req, res): Promise<void> => {
  const params = GetTmdbMovieParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const data = await tmdbFetch(`/movie/${params.data.tmdbId}`);
  res.json(data);
});

// Category rows for home page (Trending, Action, Horror, Comedy, Top-Rated Series)
router.get("/tmdb/category", async (req, res): Promise<void> => {
  const type = (req.query.type as string) || "trending";
  const page = (req.query.page as string) || "1";

  let endpoint = "";
  switch (type) {
    case "trending":         endpoint = `/trending/all/week?page=${page}`; break;
    case "action":           endpoint = `/discover/movie?with_genres=28,12&sort_by=popularity.desc&page=${page}`; break;
    case "horror":           endpoint = `/discover/movie?with_genres=27&sort_by=popularity.desc&page=${page}`; break;
    case "comedy":           endpoint = `/discover/movie?with_genres=35&sort_by=popularity.desc&page=${page}`; break;
    case "top-rated-series": endpoint = `/tv/top_rated?page=${page}`; break;
    case "top-rated":        endpoint = `/movie/top_rated?page=${page}`; break;
    case "drama":            endpoint = `/discover/movie?with_genres=18&sort_by=popularity.desc&page=${page}`; break;
    case "sci-fi":           endpoint = `/discover/movie?with_genres=878&sort_by=popularity.desc&page=${page}`; break;
    default:                 endpoint = `/trending/all/week?page=${page}`; break;
  }

  try {
    const data = await tmdbFetch(endpoint);
    res.json(data);
  } catch {
    res.status(500).json({ error: "TMDB fetch failed", results: [] });
  }
});

// Genre list
router.get("/tmdb/genres", async (_req, res): Promise<void> => {
  const data = await tmdbFetch("/genre/movie/list");
  res.json(data);
});

// Discover by genre
router.get("/tmdb/discover", async (req, res): Promise<void> => {
  const genreId = req.query.genreId as string;
  const page = req.query.page || "1";
  if (!genreId) { res.status(400).json({ error: "genreId is required" }); return; }
  const data = await tmdbFetch(`/discover/movie?with_genres=${encodeURIComponent(genreId)}&sort_by=popularity.desc&page=${page}`);
  res.json(data);
});

// TV show details
router.get("/tmdb/tv/:tmdbId", async (req, res): Promise<void> => {
  const tmdbId = parseInt(req.params.tmdbId, 10);
  if (isNaN(tmdbId)) { res.status(400).json({ error: "Invalid tmdbId" }); return; }
  try {
    const data = await tmdbFetch(`/tv/${tmdbId}`);
    res.json(data);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

// TV season episodes — critical for seasons/episodes UI
router.get("/tmdb/tv/:tmdbId/season/:season", async (req, res): Promise<void> => {
  const tmdbId = parseInt(req.params.tmdbId, 10);
  const season = parseInt(req.params.season, 10);
  if (isNaN(tmdbId) || isNaN(season)) { res.status(400).json({ error: "Invalid params" }); return; }
  try {
    const data = await tmdbFetch(`/tv/${tmdbId}/season/${season}`);
    res.json(data);
  } catch {
    res.status(404).json({ error: "Season not found" });
  }
});

export default router;
