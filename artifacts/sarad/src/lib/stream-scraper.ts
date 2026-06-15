/**
 * Client-side stream scraper + SQF (Stream Quality Filter)
 * Fully standalone — no backend required, all absolute https:// URLs.
 *
 * Sources (in priority order):
 *  1. Torrentio     — CORS proxy (corsproxy.io → allorigins fallback → direct)
 *  2. Deflix        — doingodswork/deflix-stremio addon (requires debrid key)
 *  3. Orion         — api.orionoid.com (requires user API key)
 *  4. 1337x         — torrent-api-py public instance (CORS proxy)
 *  5. YTS           — movies only, direct CORS-enabled API
 *  6. EZTV          — series only, direct CORS-enabled API
 *  7. ThePirateBay  — apibay.org via CORS proxy
 *
 * SQF — Stream Quality Filter:
 *  - Blocks CAM / Telesync / Screener / 3D
 *  - Scores by: resolution + HDR + codec + source type + seeders
 *  - Deduplicates by (quality × sourceType × source)
 *  - Sorts descending by qualityScore, then seeders
 *
 * References:
 *  - TheBeastLT/torrentio-scraper
 *  - doingodswork/deflix-stremio
 *  - Ryuk-me/Torrent-Api-py
 *  - orionoid.com API v1
 */

import type { DebridConfig } from "./app-settings";

// ── ParsedStream ───────────────────────────────────────────────────────────────
export interface ParsedStream {
  id:             string;
  source:         string;
  quality:        "4K" | "1080p" | "720p" | "480p" | "SD";
  qualityScore:   number;
  codec:          string;
  hdr:            string;
  isDolbyVision:  boolean;
  isHDR:          boolean;
  sourceType:     string;
  size:           string;
  seeders:        number;
  infoHash:       string;
  fileIdx:        number;
  filename:       string;
  magnetUri:      string;
  directUrl?:     string;   // Pre-resolved link (Deflix / Orion HOSTERs)
  isDirectLink?:  boolean;  // True → no debrid needed, play directly
}

// ── Constants ──────────────────────────────────────────────────────────────────
const DEFAULT_TRACKERS = [
  "udp://opentracker.i2p.rocks:6969/announce",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://exodus.desync.com:6969",
  "http://tracker.openbittorrent.com:80/announce",
];

const TORRENTIO   = "https://torrentio.strem.fun";
const DEFLIX_BASE = "https://deflix.strem.io";
const ORION_BASE  = "https://api.orionoid.com/v1";
const TORRENT_API = "https://torrent-api-py-a0vb.onrender.com/api/v1"; // Ryuk-me/Torrent-Api-py
const CORS_PROXY  = "https://corsproxy.io/?url=";
const ALT_PROXY   = "https://api.allorigins.win/raw?url=";

// ── SQF — Scoring tables ───────────────────────────────────────────────────────
const QUALITY_SCORES: Record<string, number> = {
  "4K": 100, "1080p": 80, "720p": 60, "480p": 40, "SD": 20,
};
const HDR_BONUS: Record<string, number> = {
  "Dolby Vision": 15, "HDR10+": 12, "HDR": 10, "HLG": 5,
};
const CODEC_BONUS: Record<string, number> = {
  "AV1": 7, "x265": 5, "HEVC": 5, "x264": 2, "AVC": 2,
};
const SOURCE_BONUS: Record<string, number> = {
  "Remux": 10, "BluRay": 8, "BDRip": 7, "WEB-DL": 6,
  "WEBRip": 4, "HDTV": 2, "DVDRip": 1,
};
const BLOCKED_KEYWORDS = ["CAM", "TELESYNC", "SCREENER", " 3D "];

// ── Helpers ────────────────────────────────────────────────────────────────────
export function buildMagnet(infoHash: string, filename?: string, trackers?: string[]): string {
  const trs = [...(trackers || []), ...DEFAULT_TRACKERS].filter(Boolean).slice(0, 10);
  return `magnet:?xt=urn:btih:${infoHash}${filename ? `&dn=${encodeURIComponent(filename)}` : ""}${trs.map(t => `&tr=${encodeURIComponent(t)}`).join("")}`;
}

function extractInfoHash(magnetOrHash: string): string {
  if (magnetOrHash.length === 40 && /^[0-9a-f]+$/i.test(magnetOrHash)) {
    return magnetOrHash.toLowerCase();
  }
  const m = magnetOrHash.match(/xt=urn:btih:([0-9a-fA-F]{40})/i);
  return m ? m[1].toLowerCase() : "";
}

function detectQuality(text: string): ParsedStream["quality"] {
  if (/4K|2160p/i.test(text))  return "4K";
  if (/1080p/i.test(text))     return "1080p";
  if (/720p/i.test(text))      return "720p";
  if (/480p/i.test(text))      return "480p";
  return "SD";
}

function scoreStream(
  quality: ParsedStream["quality"],
  hdr: string,
  codec: string,
  sourceType: string,
  seeders: number,
): number {
  let score = QUALITY_SCORES[quality] || 20;
  if (hdr) score += HDR_BONUS[hdr] || 0;
  const ck = Object.keys(CODEC_BONUS).find(k => codec.toUpperCase().includes(k.toUpperCase()));
  if (ck) score += CODEC_BONUS[ck];
  const sk = Object.keys(SOURCE_BONUS).find(k => sourceType.toUpperCase().includes(k.toUpperCase()));
  if (sk) score += SOURCE_BONUS[sk];
  score += Math.min(seeders / 10, 20);
  return score;
}

// ── SQF — Parse a Torrentio-format stream object ──────────────────────────────
function parseTorrentioStream(raw: any): ParsedStream | null {
  try {
    const name      = (raw.name  || "").trim();
    const titleLine = (raw.title || "").trim();
    const infoHash  = (raw.infoHash || "").toLowerCase();
    if (!infoHash || infoHash.length !== 40) return null;

    const upperAll = (name + " " + titleLine).toUpperCase();
    if (BLOCKED_KEYWORDS.some(kw => upperAll.includes(kw))) return null;

    const parts    = name.split("\n");
    const qualLine = parts.slice(1).join(" ").trim();

    const quality        = detectQuality(qualLine);
    const isDolbyVision  = /Dolby.?Vision|\bDV\b/i.test(qualLine + titleLine);
    const isHDR          = isDolbyVision || /HDR10\+?|HDR|HLG/i.test(qualLine + titleLine);
    const hdr            = isDolbyVision ? "Dolby Vision" : /HDR10\+/i.test(qualLine) ? "HDR10+" : isHDR ? "HDR" : "";
    const codec          = qualLine.match(/x265|HEVC|x264|AVC|AV1/i)?.[0] || "";
    const sourceType     = qualLine.match(/Remux|BluRay|BDRip|WEB-DL|WEBRip|HDTV|DVDRip/i)?.[0] || "WEB";
    const size           = titleLine.match(/💾\s*([\d.]+\s*(?:GB|MB))/i)?.[1] || "";
    const seeders        = parseInt(titleLine.match(/👤\s*(\d+)/)?.[1] || "0", 10);
    const source         = titleLine.match(/⚙\s*(\S+)/)?.[1] || parts[0]?.replace(/[⚡✈️]/g, "").trim() || "Torrentio";
    const filename       = (raw.behaviorHints?.filename as string) || "";
    const fileIdx        = typeof raw.fileIdx === "number" ? raw.fileIdx : 0;
    const extraTrackers  = ((raw.sources as string[] | undefined) || []).map((s: string) => s.replace("tracker:", ""));

    return {
      id: `torrentio_${infoHash}_${fileIdx}`,
      source, quality,
      qualityScore: scoreStream(quality, hdr, codec, sourceType, seeders),
      codec, hdr, isDolbyVision, isHDR, sourceType, size, seeders,
      infoHash, fileIdx, filename,
      magnetUri: buildMagnet(infoHash, filename, extraTrackers),
    };
  } catch { return null; }
}

// ── Source 1: Torrentio ────────────────────────────────────────────────────────
async function fetchTorrentio(
  imdbId: string,
  type: "movie" | "tv",
  season: number,
  episode: number,
): Promise<ParsedStream[]> {
  const path = type === "movie"
    ? `/sort=qualitysize/stream/movie/${imdbId}.json`
    : `/sort=qualitysize/stream/series/${imdbId}:${season}:${episode}.json`;

  const torrentioUrl = `${TORRENTIO}${path}`;
  const proxies = [
    `${CORS_PROXY}${encodeURIComponent(torrentioUrl)}`,
    `${ALT_PROXY}${encodeURIComponent(torrentioUrl)}`,
    torrentioUrl,
  ];

  for (const proxyUrl of proxies) {
    try {
      const res  = await fetch(proxyUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(14_000) });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.trim().startsWith("{")) continue;
      const data = JSON.parse(text) as any;
      if (Array.isArray(data.streams) && data.streams.length > 0) {
        return (data.streams as any[])
          .map(parseTorrentioStream)
          .filter((s: ParsedStream | null): s is ParsedStream => s !== null);
      }
    } catch { continue; }
  }
  return [];
}

// ── Source 2: Deflix (doingodswork/deflix-stremio) ─────────────────────────────
// Requires a debrid key — provides pre-resolved direct streaming URLs.
async function fetchDeflix(
  imdbId: string,
  type: "movie" | "tv",
  season: number,
  episode: number,
  debridConfig: DebridConfig,
): Promise<ParsedStream[]> {
  if (!debridConfig.apiKey || debridConfig.service === "none") return [];
  try {
    const cfgObj  = debridConfig.service === "realdebrid"
      ? { rdKey: debridConfig.apiKey }
      : { adKey: debridConfig.apiKey };
    const cfgB64  = btoa(JSON.stringify(cfgObj));

    const stremType = type === "movie" ? "movie" : "series";
    const idPart    = type === "movie" ? imdbId : `${imdbId}:${season}:${episode}`;
    const url       = `${DEFLIX_BASE}/${cfgB64}/stream/${stremType}/${idPart}.json`;

    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text.trim().startsWith("{")) return [];
    const data = JSON.parse(text) as any;
    if (!Array.isArray(data.streams)) return [];

    return (data.streams as any[]).flatMap((raw: any, idx: number): ParsedStream[] => {
      const name      = (raw.name  || "").trim();
      const titleLine = (raw.title || "").trim();
      const directUrl = (raw.url   || "") as string;
      if (!directUrl) return [];

      const allText    = (name + " " + titleLine).toUpperCase();
      if (BLOCKED_KEYWORDS.some(kw => allText.includes(kw))) return [];

      const quality    = detectQuality(name + " " + titleLine);
      const isDV       = /Dolby.?Vision|\bDV\b/i.test(allText);
      const isHDR      = isDV || /HDR10\+?|HDR|HLG/i.test(allText);
      const hdr        = isDV ? "Dolby Vision" : /HDR10\+/i.test(allText) ? "HDR10+" : isHDR ? "HDR" : "";
      const codec      = (name + " " + titleLine).match(/x265|HEVC|x264|AVC|AV1/i)?.[0] || "";
      const sourceType = (name + " " + titleLine).match(/Remux|BluRay|BDRip|WEB-DL|WEBRip|HDTV/i)?.[0] || "WEB-DL";

      return [{
        id:           `deflix_${debridConfig.service}_${imdbId}_${idx}`,
        source:       `Deflix ${debridConfig.service === "realdebrid" ? "RD" : "AD"}`,
        quality,
        qualityScore: scoreStream(quality, hdr, codec, sourceType, 999),
        codec, hdr, isDolbyVision: isDV, isHDR, sourceType,
        size:         titleLine.match(/[\d.]+\s*(?:GB|MB)/i)?.[0] || "",
        seeders:      0,
        infoHash:     "",
        fileIdx:      0,
        filename:     titleLine,
        magnetUri:    "",
        directUrl,
        isDirectLink: true,
      }];
    });
  } catch { return []; }
}

// ── Source 3: Orion (api.orionoid.com) ────────────────────────────────────────
// Requires user's Orion API key set in App Settings → Orion API Key.
async function fetchOrion(
  imdbId: string,
  type: "movie" | "tv",
  season: number,
  episode: number,
  userKey: string,
): Promise<ParsedStream[]> {
  if (!userKey) return [];
  try {
    const orionType = type === "movie" ? "movie" : "show";
    const params    = new URLSearchParams({
      keyapp:      "SARAD",
      keyuser:     userKey,
      idimdb:      imdbId,
      type:        orionType,
      streamtype:  "torrent",
      sortvalue:   "best",
      limitcount:  "20",
      ...(type === "tv" ? { numberseason: String(season), numberepisode: String(episode) } : {}),
    });

    const url = `${ORION_BASE}/stream/search?${params}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(14_000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const streams: any[] = data?.data?.streams || [];

    return streams.flatMap((s: any): ParsedStream[] => {
      const hash = extractInfoHash(s?.links?.magnet || s?.file?.hash || "");
      if (!hash) return [];

      const filename = (s?.file?.name || "") as string;
      const upper    = filename.toUpperCase();
      if (BLOCKED_KEYWORDS.some(kw => upper.includes(kw))) return [];

      const quality    = detectQuality(filename + " " + (s?.video?.quality || ""));
      const codec      = (filename.match(/x265|HEVC|x264|AVC|AV1/i)?.[0] || s?.video?.codec || "") as string;
      const sourceType = (filename.match(/Remux|BluRay|BDRip|WEB-DL|WEBRip|HDTV|DVDRip/i)?.[0] || "WEB") as string;
      const seeders    = (s?.stream?.seeds as number) || 0;
      const sizeBytes  = (s?.file?.size as number) || 0;
      const size       = sizeBytes > 0 ? `${(sizeBytes / 1_073_741_824).toFixed(2)} GB` : "";
      const hdr        = "";
      const isDV       = false;
      const isHDR      = /HDR/i.test(filename);
      const magnet     = (s?.links?.magnet as string) || buildMagnet(hash, filename);

      return [{
        id:           `orion_${hash}`,
        source:       "Orion",
        quality,
        qualityScore: scoreStream(quality, hdr, codec, sourceType, seeders),
        codec, hdr, isDolbyVision: isDV, isHDR, sourceType, size, seeders,
        infoHash:  hash,
        fileIdx:   0,
        filename,
        magnetUri: magnet,
      }];
    });
  } catch { return []; }
}

// ── Source 4: 1337x (via Ryuk-me/Torrent-Api-py public instance) ──────────────
async function fetch1337x(query: string, type: "movie" | "tv"): Promise<ParsedStream[]> {
  if (!query) return [];
  try {
    const cat       = type === "movie" ? "Movies" : "TV";
    const directUrl = `${TORRENT_API}/search?site=1337x&query=${encodeURIComponent(query)}&limit=20&category=${cat}`;
    const proxyUrl  = `${CORS_PROXY}${encodeURIComponent(directUrl)}`;

    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(14_000) });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text.trim().startsWith("{")) return [];
    const data    = JSON.parse(text) as any;
    const results: any[] = data?.data || [];

    return results.flatMap((item: any): ParsedStream[] => {
      const magnet   = (item?.magnet_link || item?.magnet || "") as string;
      const infoHash = extractInfoHash(magnet);
      if (!infoHash) return [];

      const name    = (item?.name || item?.title || "") as string;
      const upper   = name.toUpperCase();
      if (BLOCKED_KEYWORDS.some(kw => upper.includes(kw))) return [];

      const quality    = detectQuality(name);
      const codec      = name.match(/x265|HEVC|x264|AVC|AV1/i)?.[0] || "";
      const sourceType = name.match(/Remux|BluRay|BDRip|WEB-DL|WEBRip|HDTV|DVDRip/i)?.[0] || "WEB";
      const seeders    = parseInt(String(item?.seeders || item?.seed || "0"), 10);
      const rawSize    = (item?.size || "") as string;
      const size       = rawSize;
      const hdr        = "";
      const isDV       = false;
      const isHDR      = /HDR/i.test(name);

      return [{
        id:           `1337x_${infoHash}`,
        source:       "1337x",
        quality,
        qualityScore: scoreStream(quality, hdr, codec, sourceType, seeders),
        codec, hdr, isDolbyVision: isDV, isHDR, sourceType, size, seeders,
        infoHash,
        fileIdx:   0,
        filename:  name,
        magnetUri: magnet || buildMagnet(infoHash, name),
      }];
    });
  } catch { return []; }
}

// ── Source 5: YTS (movies only, direct, CORS-enabled) ─────────────────────────
async function fetchYts(imdbId: string): Promise<ParsedStream[]> {
  try {
    const res = await fetch(
      `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(imdbId)}&limit=5`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return [];
    const data    = await res.json() as any;
    const movies: any[] = data.data?.movies || [];
    const results: ParsedStream[] = [];

    for (const movie of movies) {
      for (const torrent of (movie.torrents || [])) {
        const infoHash = (torrent.hash || "").toLowerCase();
        if (!infoHash || infoHash.length !== 40) continue;

        const rawQ     = (torrent.quality as string) || "";
        const quality  = detectQuality(rawQ);
        const codec    = (torrent.video_codec as string) || "x264";
        const filename = `${((movie.title_english || movie.title) as string).replace(/[/\\?%*:|"<>]/g, "-")}.${rawQ}.BluRay.${codec}.mkv`;
        const size     = (torrent.size as string) || "";
        const seeders  = (torrent.seeds as number) || 0;

        results.push({
          id:           `yts_${infoHash}`,
          source:       "YTS",
          quality,
          qualityScore: scoreStream(quality, "", codec, "BluRay", seeders),
          codec,
          hdr:           "",
          isDolbyVision: false,
          isHDR:         false,
          sourceType:    "BluRay",
          size, seeders, infoHash,
          fileIdx:  0,
          filename,
          magnetUri: buildMagnet(infoHash, filename),
        });
      }
    }
    return results;
  } catch { return []; }
}

// ── Source 6: EZTV (series only, direct, CORS-enabled) ────────────────────────
async function fetchEztv(imdbId: string): Promise<ParsedStream[]> {
  try {
    const numericId = imdbId.replace(/^tt0*/i, "");
    const res = await fetch(
      `https://eztv.re/api/get-torrents?imdb_id=${numericId}&limit=20`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return [];
    const data      = await res.json() as any;
    const torrents: any[] = data.torrents || [];
    const results: ParsedStream[] = [];

    for (const t of torrents) {
      const infoHash = (t.hash || "").toLowerCase();
      if (!infoHash || infoHash.length !== 40) continue;

      const filename = (t.filename || t.title || "") as string;
      if (BLOCKED_KEYWORDS.some(kw => filename.toUpperCase().includes(kw))) continue;

      const quality    = detectQuality(filename);
      const codec      = filename.match(/x265|HEVC|x264|AVC|AV1/i)?.[0] || "";
      const sourceType = filename.match(/BluRay|BDRip|WEB-DL|WEBRip|HDTV/i)?.[0] || "WEB";
      const seeders    = (t.seeds as number) || 0;
      const sizeBytes  = (t.size_bytes as number) || 0;
      const size       = sizeBytes > 0 ? `${(sizeBytes / 1_073_741_824).toFixed(2)} GB` : "";

      results.push({
        id:           `eztv_${infoHash}`,
        source:       "EZTV",
        quality,
        qualityScore: scoreStream(quality, "", codec, sourceType, seeders),
        codec,
        hdr:           "",
        isDolbyVision: false,
        isHDR:         false,
        sourceType, size, seeders, infoHash,
        fileIdx:  0,
        filename,
        magnetUri: buildMagnet(infoHash, filename),
      });
    }
    return results;
  } catch { return []; }
}

// ── Source 7: ThePirateBay via apibay.org (CORS proxy) ────────────────────────
async function fetchTPB(query: string, type: "movie" | "tv"): Promise<ParsedStream[]> {
  if (!query) return [];
  try {
    const cat        = type === "movie" ? "200,205,207,208" : "500,205";
    const directUrl  = `https://apibay.org/q.php?q=${encodeURIComponent(query)}&cat=${cat}`;
    const proxyUrl   = `${CORS_PROXY}${encodeURIComponent(directUrl)}`;
    const res        = await fetch(proxyUrl, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return [];
    const items = await res.json() as any[];
    if (!Array.isArray(items)) return [];

    return items
      .filter(item => item.info_hash && item.info_hash !== "0000000000000000000000000000000000000000")
      .slice(0, 10)
      .flatMap((item: any): ParsedStream[] => {
        const infoHash  = (item.info_hash as string).toLowerCase();
        const name      = (item.name as string) || "";
        if (BLOCKED_KEYWORDS.some(kw => name.toUpperCase().includes(kw))) return [];

        const quality    = detectQuality(name);
        const codec      = name.match(/x265|HEVC|x264|AVC|AV1/i)?.[0] || "";
        const sourceType = name.match(/BluRay|BDRip|WEB-DL|WEBRip|HDTV|DVDRip/i)?.[0] || "WEB";
        const seeders    = parseInt(String(item.seeders || "0"), 10);
        const sizeBytes  = parseInt(String(item.size || "0"), 10);
        const size       = sizeBytes > 0 ? `${(sizeBytes / 1_073_741_824).toFixed(2)} GB` : "";
        const hdr        = "";
        const isDV       = false;
        const isHDR      = /HDR/i.test(name);

        return [{
          id:           `tpb_${infoHash}`,
          source:       "ThePirateBay",
          quality,
          qualityScore: scoreStream(quality, hdr, codec, sourceType, seeders),
          codec, hdr, isDolbyVision: isDV, isHDR, sourceType, size, seeders,
          infoHash,
          fileIdx:  0,
          filename: name,
          magnetUri: buildMagnet(infoHash, name),
        }];
      });
  } catch { return []; }
}

// ── SQF — Deduplicate (best per quality+sourceType+source) ────────────────────
function deduplicate(streams: ParsedStream[]): ParsedStream[] {
  const best = new Map<string, ParsedStream>();
  for (const s of streams) {
    const key = s.isDirectLink
      ? `direct::${s.source}::${s.quality}`
      : `${s.quality}::${s.sourceType}::${s.source}`;
    const ex = best.get(key);
    if (!ex || s.qualityScore > ex.qualityScore) best.set(key, s);
  }
  return [...best.values()];
}

// ── In-memory cache (5-min TTL) ────────────────────────────────────────────────
const _cache = new Map<string, { data: ParsedStream[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1_000;

// ── StreamResult ───────────────────────────────────────────────────────────────
export interface StreamResult {
  streams: ParsedStream[];
  imdbId:  string | null;
  sources: {
    torrentio: number;
    deflix:    number;
    orion:     number;
    leet37x:   number;
    yts:       number;
    eztv:      number;
    tpb:       number;
  };
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function getStreams(
  imdbId: string,
  type: "movie" | "tv",
  season         = 1,
  episode        = 1,
  titleFallback  = "",
  debridConfig?: DebridConfig | null,
  orionApiKey    = "",
): Promise<StreamResult> {
  const cacheKey = `${type}_${imdbId}_${type === "tv" ? `s${season}e${episode}` : ""}`;
  const cached   = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return {
      streams: cached.data, imdbId,
      sources: { torrentio: 0, deflix: 0, orion: 0, leet37x: 0, yts: 0, eztv: 0, tpb: 0 },
    };
  }

  const [torrentioRaw, deflixRaw, orionRaw, leet37xRaw, ytsRaw, eztvRaw, tpbRaw] = await Promise.all([
    fetchTorrentio(imdbId, type, season, episode),
    debridConfig?.service && debridConfig.service !== "none"
      ? fetchDeflix(imdbId, type, season, episode, debridConfig)
      : Promise.resolve<ParsedStream[]>([]),
    orionApiKey
      ? fetchOrion(imdbId, type, season, episode, orionApiKey)
      : Promise.resolve<ParsedStream[]>([]),
    titleFallback ? fetch1337x(titleFallback, type) : Promise.resolve<ParsedStream[]>([]),
    type === "movie" ? fetchYts(imdbId)  : Promise.resolve<ParsedStream[]>([]),
    type === "tv"    ? fetchEztv(imdbId) : Promise.resolve<ParsedStream[]>([]),
    titleFallback ? fetchTPB(titleFallback, type) : Promise.resolve<ParsedStream[]>([]),
  ]);

  const all     = [...torrentioRaw, ...deflixRaw, ...orionRaw, ...leet37xRaw, ...ytsRaw, ...eztvRaw, ...tpbRaw];
  const deduped = deduplicate(all);
  const streams = deduped
    .sort((a, b) => b.qualityScore !== a.qualityScore ? b.qualityScore - a.qualityScore : b.seeders - a.seeders)
    .slice(0, 25);

  if (streams.length) _cache.set(cacheKey, { data: streams, ts: Date.now() });

  return {
    streams,
    imdbId,
    sources: {
      torrentio: torrentioRaw.length,
      deflix:    deflixRaw.length,
      orion:     orionRaw.length,
      leet37x:   leet37xRaw.length,
      yts:       ytsRaw.length,
      eztv:      eztvRaw.length,
      tpb:       tpbRaw.length,
    },
  };
}
