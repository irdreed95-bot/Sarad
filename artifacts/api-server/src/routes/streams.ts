/**
 * Smart Streaming Backend
 * Inspired by:
 *  - Torrentio Scraper (TheBeastLT/torrentio-scraper)
 *  - Deflix Stremio (doingodswork/deflix-stremio)
 *  - Stream Quality Filter (sleeyax/stremio-addons/stream-quality-filter)
 *
 * Architecture:
 *  - /api/streams/imdb       → TMDB ID → IMDB ID lookup
 *  - /api/streams            → Torrentio proxy + fallback scrapers + SQF filter
 *  - /api/streams/resolve    → Debrid resolution (Real-Debrid / AllDebrid)
 */

import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const TMDB_API_KEY = process.env.TMDB_API_KEY || "193c909f9dcb815ea536c783dab59ff5";
const TMDB_BASE    = "https://api.themoviedb.org/3";
const TORRENTIO    = "https://torrentio.strem.fun";

// Browser-like headers to bypass basic Cloudflare bot detection
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Referer": "https://torrentio.strem.fun/",
  "Origin": "https://torrentio.strem.fun",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};

// Default trackers for magnet URIs
const DEFAULT_TRACKERS = [
  "udp://opentracker.i2p.rocks:6969/announce",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://tracker.bittor.pw:1337/announce",
  "udp://exodus.desync.com:6969",
  "udp://open.demonii.com:1337/announce",
  "http://tracker.openbittorrent.com:80/announce",
];

// ── In-memory cache (5-min TTL) ───────────────────────────────────────────────
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;
function getCached(key: string): any | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { cache.delete(key); return null; }
  return e.data;
}
function setCache(key: string, data: any): void {
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]?.[0];
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now() });
}

// ── SQF — Quality scoring types ───────────────────────────────────────────────
export interface ParsedStream {
  id: string;
  source: string;
  quality: "4K" | "1080p" | "720p" | "480p" | "SD";
  qualityScore: number;
  codec: string;
  hdr: string;
  isDolbyVision: boolean;
  isHDR: boolean;
  sourceType: string;
  size: string;
  seeders: number;
  infoHash: string;
  fileIdx: number;
  filename: string;
  magnetUri: string;
}

const QUALITY_SCORES: Record<string, number> = {
  "4K": 100, "1080p": 80, "720p": 60, "480p": 40, "SD": 20,
};
const HDR_BONUS: Record<string, number> = {
  "Dolby Vision": 15, "HDR10+": 12, "HDR": 10, "HLG": 5,
};
const CODEC_BONUS: Record<string, number> = {
  "x265": 5, "HEVC": 5, "AV1": 7, "x264": 2, "AVC": 2,
};
const SOURCE_BONUS: Record<string, number> = {
  "Remux": 10, "BluRay": 8, "BDRip": 7, "WEB-DL": 6,
  "WEBRip": 4, "HDTV": 2, "DVDRip": 1,
};
const BLOCKED_KEYWORDS = ["CAM", "TELESYNC", "SCREENER", " 3D "];

// ── SQF — Parse a single raw Torrentio stream ─────────────────────────────────
function parseStream(raw: any): ParsedStream | null {
  try {
    const name  = (raw.name  || "").trim();
    const title = (raw.title || "").trim();
    const infoHash = (raw.infoHash || "").toLowerCase();
    if (!infoHash || infoHash.length !== 40) return null;

    const upperAll = (name + " " + title).toUpperCase();
    if (BLOCKED_KEYWORDS.some(kw => upperAll.includes(kw))) return null;

    const nameParts = name.split("\n");
    const qualLine  = nameParts.slice(1).join(" ").trim();

    const quality: ParsedStream["quality"] =
      /4K|2160p/i.test(qualLine)  ? "4K" :
      /1080p/i.test(qualLine)     ? "1080p" :
      /720p/i.test(qualLine)      ? "720p" :
      /480p/i.test(qualLine)      ? "480p" : "SD";

    const isDolbyVision = /Dolby.?Vision|\bDV\b/i.test(qualLine + title);
    const isHDR         = isDolbyVision || /HDR10\+?|HDR|HLG/i.test(qualLine + title);
    const hdr           = isDolbyVision ? "Dolby Vision" : /HDR10\+/i.test(qualLine) ? "HDR10+" : isHDR ? "HDR" : "";
    const codec         = qualLine.match(/x265|HEVC|x264|AVC|AV1/i)?.[0] || "";
    const sourceType    = qualLine.match(/Remux|BluRay|BDRip|WEB-DL|WEBRip|HDTV|DVDRip/i)?.[0] || "WEB";

    const size    = title.match(/💾\s*([\d.]+\s*(?:GB|MB))/i)?.[1] || "";
    const seeders = parseInt(title.match(/👤\s*(\d+)/)?.[1] || "0", 10);
    const source  = title.match(/⚙\s*(\S+)/)?.[1] || nameParts[0]?.replace(/[⚡✈️]/g, "").trim() || "Unknown";

    const filename = (raw.behaviorHints?.filename as string) || "";
    const fileIdx  = typeof raw.fileIdx === "number" ? raw.fileIdx : 0;

    let qualityScore = QUALITY_SCORES[quality] || 20;
    if (hdr) qualityScore += HDR_BONUS[hdr] || 0;
    const ck = Object.keys(CODEC_BONUS).find(k => codec.toUpperCase().includes(k.toUpperCase()));
    if (ck) qualityScore += CODEC_BONUS[ck];
    const sk = Object.keys(SOURCE_BONUS).find(k => sourceType.toUpperCase().includes(k.toUpperCase()));
    if (sk) qualityScore += SOURCE_BONUS[sk];
    qualityScore += Math.min(seeders / 10, 20);

    const trackers = [
      ...((raw.sources as string[] | undefined) || []).map(s => s.replace("tracker:", "")),
      ...DEFAULT_TRACKERS,
    ].filter(Boolean).slice(0, 12);

    const magnetUri = `magnet:?xt=urn:btih:${infoHash}${filename ? `&dn=${encodeURIComponent(filename)}` : ""}${trackers.map(t => `&tr=${encodeURIComponent(t)}`).join("")}`;

    return {
      id: `${infoHash}_${fileIdx}`,
      source, quality, qualityScore, codec, hdr,
      isDolbyVision, isHDR, sourceType, size, seeders,
      infoHash, fileIdx, filename, magnetUri,
    };
  } catch {
    return null;
  }
}

// ── SQF — Deduplicate (best per quality+sourceType+source) ────────────────────
function deduplicateStreams(streams: ParsedStream[]): ParsedStream[] {
  const best = new Map<string, ParsedStream>();
  for (const s of streams) {
    const key = `${s.quality}::${s.sourceType}::${s.source}`;
    const ex  = best.get(key);
    if (!ex || s.qualityScore > ex.qualityScore) best.set(key, s);
  }
  return [...best.values()];
}

// ── Helper: TMDB → IMDB ID ────────────────────────────────────────────────────
async function getImdbId(tmdbId: number, type: "movie" | "tv"): Promise<string | null> {
  const key    = `imdb_${type}_${tmdbId}`;
  const cached = getCached(key);
  if (cached) return cached;
  try {
    const res  = await fetch(`${TMDB_BASE}/${type}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const imdbId: string | null = data.imdb_id || null;
    if (imdbId) setCache(key, imdbId);
    return imdbId;
  } catch { return null; }
}

// ── Helper: YTS API (movies only, no Cloudflare) ──────────────────────────────
async function fetchYts(imdbId: string): Promise<ParsedStream[]> {
  try {
    const url = `https://yts.mx/api/v2/list_movies.json?query_term=${imdbId}&limit=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: BROWSER_HEADERS });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const movies: any[] = data.data?.movies || [];
    const results: ParsedStream[] = [];

    for (const movie of movies) {
      for (const torrent of (movie.torrents || [])) {
        const quality = torrent.quality === "2160p" ? "4K" : (torrent.quality || "720p") as ParsedStream["quality"];
        const infoHash = (torrent.hash || "").toLowerCase();
        if (!infoHash || infoHash.length !== 40) continue;

        const filename = `${movie.title_english || movie.title}.${torrent.quality}.BluRay.${torrent.video_codec || "x264"}.mkv`;
        const magnetUri = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(filename)}${DEFAULT_TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join("")}`;

        const qualScore = (QUALITY_SCORES[quality] || 60) + SOURCE_BONUS["BluRay"];

        results.push({
          id: `yts_${infoHash}`,
          source: "YTS",
          quality: quality as ParsedStream["quality"],
          qualityScore: qualScore,
          codec: torrent.video_codec || "x264",
          hdr: "",
          isDolbyVision: false,
          isHDR: false,
          sourceType: "BluRay",
          size: torrent.size || "",
          seeders: torrent.seeds || 0,
          infoHash,
          fileIdx: 0,
          filename,
          magnetUri,
        });
      }
    }
    return results;
  } catch { return []; }
}

// ── Helper: Torrentio proxy (with browser headers) ────────────────────────────
async function fetchTorrentio(
  imdbId: string,
  type: "movie" | "tv",
  season: number,
  episode: number,
): Promise<any[]> {
  const urls = type === "movie"
    ? [
        `${TORRENTIO}/sort=qualitysize/stream/movie/${imdbId}.json`,
        `${TORRENTIO}/stream/movie/${imdbId}.json`,
      ]
    : [
        `${TORRENTIO}/sort=qualitysize/stream/series/${imdbId}:${season}:${episode}.json`,
        `${TORRENTIO}/stream/series/${imdbId}:${season}:${episode}.json`,
      ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      // Guard: Cloudflare returns HTML, not JSON
      if (!text.trim().startsWith("{")) continue;
      const data = JSON.parse(text) as any;
      if (Array.isArray(data.streams) && data.streams.length > 0) {
        return data.streams;
      }
    } catch {
      continue;
    }
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/streams/imdb — TMDB → IMDB ID (lightweight lookup)
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/streams/imdb", async (req, res): Promise<void> => {
  const tmdbId = parseInt(req.query.tmdbId as string, 10);
  const type   = (req.query.type as string) === "tv" ? "tv" : "movie";

  if (isNaN(tmdbId) || tmdbId <= 0) {
    res.status(400).json({ error: "Invalid tmdbId" }); return;
  }
  const imdbId = await getImdbId(tmdbId, type);
  if (!imdbId) { res.status(404).json({ error: "IMDB ID not found" }); return; }
  res.json({ imdbId });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/streams — Main stream aggregator (Torrentio + YTS fallback + SQF)
// Frontend calls this as a proxy to avoid CORS and Cloudflare issues
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/streams", async (req, res): Promise<void> => {
  const tmdbId  = parseInt(req.query.tmdbId  as string, 10);
  const type    = (req.query.type as string) === "tv" ? "tv" : "movie";
  const season  = parseInt(req.query.season  as string || "1", 10);
  const episode = parseInt(req.query.episode as string || "1", 10);

  if (isNaN(tmdbId) || tmdbId <= 0) {
    res.status(400).json({ error: "Invalid tmdbId", streams: [] }); return;
  }

  const cacheKey = `streams_${type}_${tmdbId}_${type === "tv" ? `s${season}e${episode}` : ""}`;
  const cached   = getCached(cacheKey);
  if (cached) { res.json(cached); return; }

  try {
    // 1. TMDB → IMDB ID
    const imdbId = await getImdbId(tmdbId, type);
    if (!imdbId) {
      res.json({ streams: [], imdbId: null, total: 0, error: "IMDB ID not found for this title" }); return;
    }

    // 2. Fetch from Torrentio (with browser-mimicking headers to bypass CF)
    const [torrentioStreams, ytsStreams] = await Promise.all([
      fetchTorrentio(imdbId, type, season, episode),
      type === "movie" ? fetchYts(imdbId) : Promise.resolve([]),
    ]);

    const rawStreams = torrentioStreams;

    // 3. Parse + SQF quality filter
    const parsed  = rawStreams.map(parseStream).filter((s): s is ParsedStream => s !== null);

    // Merge YTS streams (deduplicated below)
    const allParsed = [...parsed, ...ytsStreams];

    // 4. SQF Deduplicate
    const deduped = deduplicateStreams(allParsed);

    // 5. Sort by qualityScore desc, seeders desc
    const streams = deduped
      .sort((a, b) => b.qualityScore !== a.qualityScore ? b.qualityScore - a.qualityScore : b.seeders - a.seeders)
      .slice(0, 15);

    const result = {
      streams,
      imdbId,
      total: rawStreams.length,
      sources: {
        torrentio: torrentioStreams.length,
        yts: ytsStreams.length,
      },
    };
    setCache(cacheKey, result);
    res.json(result);
  } catch (err: any) {
    logger.error({ err }, "Stream aggregation error");
    res.json({ streams: [], error: "Stream aggregation failed — please retry" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/streams/resolve — Debrid resolution (Deflix-inspired)
// Converts torrent infoHash → direct HTTP stream URL
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/streams/resolve", async (req, res): Promise<void> => {
  const { infoHash, fileIdx = 0, service, apiKey, magnetUri } = req.body as {
    infoHash: string;
    fileIdx?: number;
    service: "realdebrid" | "alldebrid";
    apiKey: string;
    magnetUri?: string;
  };

  if (!infoHash || !apiKey || !service) {
    res.status(400).json({ error: "Missing required fields: infoHash, apiKey, service" }); return;
  }

  const magnet = magnetUri || (() => {
    const trs = DEFAULT_TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join("");
    return `magnet:?xt=urn:btih:${infoHash}${trs}`;
  })();

  try {
    if (service === "realdebrid") {
      const rdBase = "https://api.real-debrid.com/rest/1.0";
      const auth   = { Authorization: `Bearer ${apiKey}` };

      const addRes = await fetch(`${rdBase}/torrents/addMagnet`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" },
        body: `magnet=${encodeURIComponent(magnet)}`,
        signal: AbortSignal.timeout(10_000),
      });
      if (!addRes.ok) { res.status(502).json({ error: `Real-Debrid addMagnet: ${addRes.status}` }); return; }
      const addData = await addRes.json() as any;
      const torrentId: string = addData.id;

      await fetch(`${rdBase}/torrents/selectFiles/${torrentId}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" },
        body: `files=${fileIdx + 1}`,
        signal: AbortSignal.timeout(8_000),
      }).catch(() => undefined);

      let directUrl = "";
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 5_000));
        const infoRes = await fetch(`${rdBase}/torrents/info/${torrentId}`, {
          headers: auth, signal: AbortSignal.timeout(8_000),
        });
        const info = await infoRes.json() as any;
        if (info.status === "downloaded" && Array.isArray(info.links) && info.links.length > 0) {
          const unrRes = await fetch(`${rdBase}/unrestrict/link`, {
            method: "POST",
            headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" },
            body: `link=${encodeURIComponent(info.links[0] as string)}`,
            signal: AbortSignal.timeout(8_000),
          });
          const unrData = await unrRes.json() as any;
          directUrl = (unrData.download as string) || "";
          break;
        }
        if (["error", "dead", "magnet_error"].includes(info.status as string)) {
          res.status(422).json({ error: `Torrent status: ${info.status}` }); return;
        }
      }
      if (!directUrl) { res.status(504).json({ error: "Timeout — torrent still caching in Real-Debrid" }); return; }
      res.json({ url: directUrl, service: "realdebrid" });

    } else if (service === "alldebrid") {
      const adBase = "https://api.alldebrid.com/v4";
      const agent  = "sarad";

      const uploadRes = await fetch(`${adBase}/magnet/upload?agent=${agent}&apikey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `magnets[]=${encodeURIComponent(magnet)}`,
        signal: AbortSignal.timeout(10_000),
      });
      const upload = await uploadRes.json() as any;
      const magnetId: string | number | undefined = upload.data?.magnets?.[0]?.id;
      if (!magnetId) { res.status(502).json({ error: "AllDebrid upload failed" }); return; }

      let directUrl = "";
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 5_000));
        const statusRes = await fetch(`${adBase}/magnet/status?agent=${agent}&apikey=${apiKey}&id=${magnetId}`, {
          signal: AbortSignal.timeout(8_000),
        });
        const statusData = await statusRes.json() as any;
        const m = statusData.data?.magnets;
        if (m?.statusCode === 4 && Array.isArray(m?.links) && m.links.length > 0) {
          const linkToUnlock: string = m.links[fileIdx]?.link || m.links[0]?.link;
          const unlockRes = await fetch(`${adBase}/link/unlock?agent=${agent}&apikey=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `link=${encodeURIComponent(linkToUnlock)}`,
            signal: AbortSignal.timeout(8_000),
          });
          const unlocked = await unlockRes.json() as any;
          directUrl = (unlocked.data?.link as string) || "";
          break;
        }
      }
      if (!directUrl) { res.status(504).json({ error: "AllDebrid resolution timeout" }); return; }
      res.json({ url: directUrl, service: "alldebrid" });

    } else {
      res.status(400).json({ error: "Unsupported service. Use 'realdebrid' or 'alldebrid'" });
    }
  } catch (err: any) {
    logger.error({ err }, "Debrid resolve error");
    res.status(500).json({ error: err.message || "Debrid resolution failed" });
  }
});

export default router;
