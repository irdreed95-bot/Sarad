/**
 * Client-side stream scraper + SQF (Stream Quality Filter)
 * Fully standalone — no backend required, all absolute https:// URLs.
 *
 * Sources (in priority order):
 *  1. Torrentio     — via CORS proxy (corsproxy.io → allorigins fallback)
 *  2. YTS           — movies only, direct (CORS-enabled public API)
 *  3. EZTV          — series only, direct (CORS-enabled public API)
 *  4. apibay (TPB)  — general fallback, direct (CORS-enabled public API)
 *
 * Inspired by:
 *  - TheBeastLT/torrentio-scraper
 *  - sleeyax/stremio-addons/stream-quality-filter
 *  - doingodswork/deflix-stremio
 */

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

// ── Constants ──────────────────────────────────────────────────────────────────
const DEFAULT_TRACKERS = [
  "udp://opentracker.i2p.rocks:6969/announce",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://exodus.desync.com:6969",
  "http://tracker.openbittorrent.com:80/announce",
];

const TORRENTIO  = "https://torrentio.strem.fun";
const CORS_PROXY = "https://corsproxy.io/?url=";
const ALT_PROXY  = "https://api.allorigins.win/raw?url=";

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

// ── Magnet builder ─────────────────────────────────────────────────────────────
export function buildMagnet(infoHash: string, filename?: string, trackers?: string[]): string {
  const trs = [...(trackers || []), ...DEFAULT_TRACKERS].filter(Boolean).slice(0, 10);
  return `magnet:?xt=urn:btih:${infoHash}${filename ? `&dn=${encodeURIComponent(filename)}` : ""}${trs.map(t => `&tr=${encodeURIComponent(t)}`).join("")}`;
}

// ── SQF — Parse a Torrentio-format stream object ──────────────────────────────
function parseTorrentioStream(raw: any): ParsedStream | null {
  try {
    const name     = (raw.name  || "").trim();
    const title    = (raw.title || "").trim();
    const infoHash = (raw.infoHash || "").toLowerCase();
    if (!infoHash || infoHash.length !== 40) return null;

    const upperAll = (name + " " + title).toUpperCase();
    if (BLOCKED_KEYWORDS.some(kw => upperAll.includes(kw))) return null;

    const parts    = name.split("\n");
    const qualLine = parts.slice(1).join(" ").trim();

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
    const size          = title.match(/💾\s*([\d.]+\s*(?:GB|MB))/i)?.[1] || "";
    const seeders       = parseInt(title.match(/👤\s*(\d+)/)?.[1] || "0", 10);
    const source        = title.match(/⚙\s*(\S+)/)?.[1] || parts[0]?.replace(/[⚡✈️]/g, "").trim() || "Torrentio";
    const filename      = (raw.behaviorHints?.filename as string) || "";
    const fileIdx       = typeof raw.fileIdx === "number" ? raw.fileIdx : 0;

    let qualityScore = QUALITY_SCORES[quality] || 20;
    if (hdr) qualityScore += HDR_BONUS[hdr] || 0;
    const ck = Object.keys(CODEC_BONUS).find(k => codec.toUpperCase().includes(k.toUpperCase()));
    if (ck) qualityScore += CODEC_BONUS[ck];
    const sk = Object.keys(SOURCE_BONUS).find(k => sourceType.toUpperCase().includes(k.toUpperCase()));
    if (sk) qualityScore += SOURCE_BONUS[sk];
    qualityScore += Math.min(seeders / 10, 20);

    const extraTrackers = ((raw.sources as string[] | undefined) || []).map((s: string) => s.replace("tracker:", ""));
    const magnetUri = buildMagnet(infoHash, filename, extraTrackers);

    return {
      id: `torrentio_${infoHash}_${fileIdx}`,
      source, quality, qualityScore, codec, hdr,
      isDolbyVision, isHDR, sourceType, size, seeders,
      infoHash, fileIdx, filename, magnetUri,
    };
  } catch { return null; }
}

// ── Source: Torrentio (via CORS proxy) ────────────────────────────────────────
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
    torrentioUrl, // direct last (may work in some environments / native apps)
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, {
        headers: { "Accept": "application/json" },
        signal:  AbortSignal.timeout(14_000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.trim().startsWith("{")) continue; // Cloudflare HTML guard
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

// ── Source: YTS (movies only, direct, CORS-enabled) ───────────────────────────
async function fetchYts(imdbId: string): Promise<ParsedStream[]> {
  try {
    const res = await fetch(
      `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(imdbId)}&limit=5`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return [];
    const data = await res.json() as any;
    const movies: any[] = data.data?.movies || [];
    const results: ParsedStream[] = [];

    for (const movie of movies) {
      for (const torrent of (movie.torrents || [])) {
        const infoHash = (torrent.hash || "").toLowerCase();
        if (!infoHash || infoHash.length !== 40) continue;

        const rawQuality = torrent.quality as string;
        const quality: ParsedStream["quality"] =
          /2160p|4K/i.test(rawQuality) ? "4K" :
          /1080p/i.test(rawQuality) ? "1080p" :
          /720p/i.test(rawQuality)  ? "720p" :
          /480p/i.test(rawQuality)  ? "480p" : "SD";

        const codec    = (torrent.video_codec as string) || "x264";
        const filename = `${(movie.title_english || movie.title).replace(/[/\\?%*:|"<>]/g, "-")}.${rawQuality}.BluRay.${codec}.mkv`;
        const size     = torrent.size as string || "";
        const seeders  = (torrent.seeds as number) || 0;

        let qualityScore = QUALITY_SCORES[quality] || 60;
        qualityScore += SOURCE_BONUS["BluRay"] || 0;
        const ck = Object.keys(CODEC_BONUS).find(k => codec.toUpperCase().includes(k.toUpperCase()));
        if (ck) qualityScore += CODEC_BONUS[ck];
        qualityScore += Math.min(seeders / 10, 20);

        results.push({
          id: `yts_${infoHash}`,
          source:   "YTS",
          quality,
          qualityScore,
          codec,
          hdr:           "",
          isDolbyVision: false,
          isHDR:         false,
          sourceType:    "BluRay",
          size,
          seeders,
          infoHash,
          fileIdx:   0,
          filename,
          magnetUri: buildMagnet(infoHash, filename),
        });
      }
    }
    return results;
  } catch { return []; }
}

// ── Source: EZTV (series only, direct, CORS-enabled) ──────────────────────────
async function fetchEztv(imdbId: string): Promise<ParsedStream[]> {
  try {
    // EZTV expects numeric IMDB ID without "tt"
    const numericId = imdbId.replace(/^tt0*/i, "");
    const res = await fetch(
      `https://eztv.re/api/get-torrents?imdb_id=${numericId}&limit=20`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return [];
    const data = await res.json() as any;
    const torrents: any[] = data.torrents || [];
    const results: ParsedStream[] = [];

    for (const t of torrents) {
      const infoHash = (t.hash || "").toLowerCase();
      if (!infoHash || infoHash.length !== 40) continue;

      const filename = (t.filename || t.title || "") as string;
      const upperFn  = filename.toUpperCase();

      if (BLOCKED_KEYWORDS.some(kw => upperFn.includes(kw))) continue;

      const quality: ParsedStream["quality"] =
        /2160p|4K/i.test(filename)  ? "4K" :
        /1080p/i.test(filename)     ? "1080p" :
        /720p/i.test(filename)      ? "720p" :
        /480p/i.test(filename)      ? "480p" : "SD";

      const codec     = filename.match(/x265|HEVC|x264|AVC|AV1/i)?.[0] || "";
      const sourceType= filename.match(/BluRay|BDRip|WEB-DL|WEBRip|HDTV/i)?.[0] || "WEB";
      const seeders   = (t.seeds as number) || 0;
      const sizeBytes = (t.size_bytes as number) || 0;
      const size      = sizeBytes > 0 ? `${(sizeBytes / 1_073_741_824).toFixed(2)} GB` : "";

      let qualityScore = QUALITY_SCORES[quality] || 20;
      const sk = Object.keys(SOURCE_BONUS).find(k => sourceType.toUpperCase().includes(k.toUpperCase()));
      if (sk) qualityScore += SOURCE_BONUS[sk];
      const ck = Object.keys(CODEC_BONUS).find(k => codec.toUpperCase().includes(k.toUpperCase()));
      if (ck) qualityScore += CODEC_BONUS[ck];
      qualityScore += Math.min(seeders / 10, 20);

      results.push({
        id:        `eztv_${infoHash}`,
        source:    "EZTV",
        quality,
        qualityScore,
        codec,
        hdr:           "",
        isDolbyVision: false,
        isHDR:         false,
        sourceType,
        size,
        seeders,
        infoHash,
        fileIdx:   0,
        filename,
        magnetUri: buildMagnet(infoHash, filename),
      });
    }
    return results;
  } catch { return []; }
}

// ── Source: apibay / ThePirateBay (fallback, via CORS proxy) ──────────────────
async function fetchApibay(query: string, type: "movie" | "tv"): Promise<ParsedStream[]> {
  try {
    const cat = type === "movie" ? "200,205,207,208" : "500,205";
    const directUrl = `https://apibay.org/q.php?q=${encodeURIComponent(query)}&cat=${cat}`;
    // apibay doesn't send CORS headers — proxy it
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(directUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return [];
    const items = await res.json() as any[];
    if (!Array.isArray(items)) return [];

    return items
      .filter(item => item.info_hash && item.info_hash !== "0000000000000000000000000000000000000000")
      .slice(0, 10)
      .map(item => {
        const infoHash = (item.info_hash as string).toLowerCase();
        const name     = (item.name as string) || "";
        const upperName = name.toUpperCase();
        if (BLOCKED_KEYWORDS.some(kw => upperName.includes(kw))) return null;

        const quality: ParsedStream["quality"] =
          /2160p|4K/i.test(name) ? "4K" :
          /1080p/i.test(name)    ? "1080p" :
          /720p/i.test(name)     ? "720p" :
          /480p/i.test(name)     ? "480p" : "SD";

        const codec      = name.match(/x265|HEVC|x264|AVC|AV1/i)?.[0] || "";
        const sourceType = name.match(/BluRay|BDRip|WEB-DL|WEBRip|HDTV|DVDRip/i)?.[0] || "WEB";
        const seeders    = parseInt(item.seeders as string || "0", 10);
        const sizeBytes  = parseInt(item.size as string || "0", 10);
        const size       = sizeBytes > 0 ? `${(sizeBytes / 1_073_741_824).toFixed(2)} GB` : "";

        let qualityScore = QUALITY_SCORES[quality] || 20;
        const sk = Object.keys(SOURCE_BONUS).find(k => sourceType.toUpperCase().includes(k.toUpperCase()));
        if (sk) qualityScore += SOURCE_BONUS[sk];
        const ck = Object.keys(CODEC_BONUS).find(k => codec.toUpperCase().includes(k.toUpperCase()));
        if (ck) qualityScore += CODEC_BONUS[ck];
        qualityScore += Math.min(seeders / 10, 20);

        return {
          id:        `tpb_${infoHash}`,
          source:    "1337X",
          quality,
          qualityScore,
          codec,
          hdr:           "",
          isDolbyVision: false,
          isHDR:         false,
          sourceType,
          size,
          seeders,
          infoHash,
          fileIdx:   0,
          filename:  name,
          magnetUri: buildMagnet(infoHash, name),
        } as ParsedStream;
      })
      .filter((s): s is ParsedStream => s !== null);
  } catch { return []; }
}

// ── SQF — Deduplicate (best per quality+sourceType+source) ────────────────────
function deduplicate(streams: ParsedStream[]): ParsedStream[] {
  const best = new Map<string, ParsedStream>();
  for (const s of streams) {
    const key = `${s.quality}::${s.sourceType}::${s.source}`;
    const ex  = best.get(key);
    if (!ex || s.qualityScore > ex.qualityScore) best.set(key, s);
  }
  return [...best.values()];
}

// ── In-memory cache (5-min TTL) ────────────────────────────────────────────────
const _cache = new Map<string, { data: ParsedStream[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1_000;

// ── Main export ────────────────────────────────────────────────────────────────
export interface StreamResult {
  streams: ParsedStream[];
  imdbId:  string | null;
  sources: { torrentio: number; yts: number; eztv: number; tpb: number };
}

export async function getStreams(
  imdbId: string,
  type: "movie" | "tv",
  season = 1,
  episode = 1,
  titleForFallback = "",
): Promise<StreamResult> {
  const cacheKey = `${type}_${imdbId}_${type === "tv" ? `s${season}e${episode}` : ""}`;
  const cached   = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { streams: cached.data, imdbId, sources: { torrentio: 0, yts: 0, eztv: 0, tpb: 0 } };
  }

  const [torrentioRaw, ytsRaw, eztvRaw, tpbRaw] = await Promise.all([
    fetchTorrentio(imdbId, type, season, episode),
    type === "movie" ? fetchYts(imdbId) : Promise.resolve<ParsedStream[]>([]),
    type === "tv"    ? fetchEztv(imdbId) : Promise.resolve<ParsedStream[]>([]),
    titleForFallback ? fetchApibay(titleForFallback, type) : Promise.resolve<ParsedStream[]>([]),
  ]);

  const all     = [...torrentioRaw, ...ytsRaw, ...eztvRaw, ...tpbRaw];
  const deduped = deduplicate(all);
  const streams = deduped
    .sort((a, b) => b.qualityScore !== a.qualityScore ? b.qualityScore - a.qualityScore : b.seeders - a.seeders)
    .slice(0, 20);

  if (streams.length) _cache.set(cacheKey, { data: streams, ts: Date.now() });

  return {
    streams,
    imdbId,
    sources: { torrentio: torrentioRaw.length, yts: ytsRaw.length, eztv: eztvRaw.length, tpb: tpbRaw.length },
  };
}
