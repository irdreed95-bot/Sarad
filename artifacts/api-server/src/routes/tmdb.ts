import { Router, type IRouter } from "express";
import { SearchTmdbQueryParams, GetTmdbTrendingQueryParams, GetTmdbMovieParams } from "@workspace/api-zod";

const router: IRouter = Router();

const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(path: string): Promise<any> {
  const url = `${TMDB_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${TMDB_API_KEY}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

router.get("/tmdb/search", async (req, res): Promise<void> => {
  const params = SearchTmdbQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

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
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const data = await tmdbFetch(`/movie/${params.data.tmdbId}`);
  res.json(data);
});

// Genre list for movies
router.get("/tmdb/genres", async (_req, res): Promise<void> => {
  const data = await tmdbFetch("/genre/movie/list");
  res.json(data);
});

// Discover movies by genre
router.get("/tmdb/discover", async (req, res): Promise<void> => {
  const genreId = req.query.genreId as string;
  const page = req.query.page || "1";
  if (!genreId) {
    res.status(400).json({ error: "genreId is required" });
    return;
  }
  const data = await tmdbFetch(`/discover/movie?with_genres=${encodeURIComponent(genreId)}&sort_by=popularity.desc&page=${page}`);
  res.json(data);
});

// TMDB TV show details
router.get("/tmdb/tv/:tmdbId", async (req, res): Promise<void> => {
  const tmdbId = parseInt(req.params.tmdbId, 10);
  if (isNaN(tmdbId)) {
    res.status(400).json({ error: "Invalid tmdbId" });
    return;
  }
  const data = await tmdbFetch(`/tv/${tmdbId}`);
  res.json(data);
});

export default router;
