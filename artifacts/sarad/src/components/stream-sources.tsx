/**
 * StreamSources — Stremio-inspired quality-sorted stream panel
 *
 * Architecture:
 *  1. Backend (/api/streams/imdb) → resolves TMDB ID to IMDB ID
 *  2. Browser → fetches Torrentio directly (avoids Cloudflare server-side block)
 *  3. Client-side SQF (Stream Quality Filter) parses, dedupes & sorts streams
 *  4. Debrid resolution stays server-side (/api/streams/resolve)
 *
 * Inspired by:
 *  - TheBeastLT/torrentio-scraper
 *  - sleeyax/stremio-addons/stream-quality-filter
 *  - doingodswork/deflix-stremio
 */
import { useEffect, useState, useCallback } from "react";
import {
  Zap, Copy, Check, Loader2, Wifi, AlertCircle,
  Play, Shield, Film, ChevronDown, RefreshCw, Info,
} from "lucide-react";
import { useLang } from "@/lib/language";
import { getAppConfig } from "@/lib/app-settings";

// ── Types ────────────────────────────────────────────────────────────────────
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

interface Props {
  tmdbId: number;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  onPlayDirect: (url: string, stream: ParsedStream) => void;
}

// ── Magnet trackers (used when building magnet URIs client-side) ─────────────
const DEFAULT_TRACKERS = [
  "udp://opentracker.i2p.rocks:6969/announce",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://exodus.desync.com:6969",
  "http://tracker.openbittorrent.com:80/announce",
];

// ── SQF — Quality scoring ────────────────────────────────────────────────────
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
const BLOCKED = ["CAM", "TELESYNC", "SCREENER", " 3D "];

function parseStream(raw: any): ParsedStream | null {
  try {
    const name  = (raw.name  || "").trim();
    const title = (raw.title || "").trim();
    const infoHash = (raw.infoHash || "").toLowerCase();
    if (!infoHash || infoHash.length !== 40) return null;

    const upperTitle = (name + " " + title).toUpperCase();
    if (BLOCKED.some(kw => upperTitle.includes(kw))) return null;

    const nameParts = name.split("\n");
    const qualLine  = nameParts.slice(1).join(" ").trim();

    // Quality
    const quality: ParsedStream["quality"] =
      /4K|2160p/i.test(qualLine)  ? "4K" :
      /1080p/i.test(qualLine)     ? "1080p" :
      /720p/i.test(qualLine)      ? "720p" :
      /480p/i.test(qualLine)      ? "480p" : "SD";

    // HDR
    const isDolbyVision = /Dolby.?Vision|\bDV\b/i.test(qualLine + title);
    const isHDR = isDolbyVision || /HDR10\+?|HDR|HLG/i.test(qualLine + title);
    const hdr = isDolbyVision ? "Dolby Vision" : /HDR10\+/i.test(qualLine) ? "HDR10+" : isHDR ? "HDR" : "";

    // Codec & source type
    const codec      = qualLine.match(/x265|HEVC|x264|AVC|AV1/i)?.[0] || "";
    const sourceType = qualLine.match(/Remux|BluRay|BDRip|WEB-DL|WEBRip|HDTV|DVDRip/i)?.[0] || "WEB";

    // Title metadata
    const size    = title.match(/💾\s*([\d.]+\s*(?:GB|MB))/i)?.[1] || "";
    const seeders = parseInt(title.match(/👤\s*(\d+)/)?.[1] || "0", 10);
    const source  = title.match(/⚙\s*(\S+)/)?.[1] || nameParts[0]?.replace(/[⚡✈️]/g, "").trim() || "Unknown";

    const filename = (raw.behaviorHints?.filename as string) || "";
    const fileIdx  = typeof raw.fileIdx === "number" ? raw.fileIdx : 0;

    // Quality score (SQF)
    let qualityScore = QUALITY_SCORES[quality] || 20;
    if (hdr) qualityScore += HDR_BONUS[hdr] || 0;
    const codecKey = Object.keys(CODEC_BONUS).find(k => codec.toUpperCase().includes(k.toUpperCase()));
    if (codecKey) qualityScore += CODEC_BONUS[codecKey];
    const srcKey = Object.keys(SOURCE_BONUS).find(k => sourceType.toUpperCase().includes(k.toUpperCase()));
    if (srcKey) qualityScore += SOURCE_BONUS[srcKey];
    qualityScore += Math.min(seeders / 10, 20);

    // Magnet
    const trackers = [
      ...((raw.sources as string[] | undefined) || []).map((s: string) => s.replace("tracker:", "")),
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

function deduplicateStreams(streams: ParsedStream[]): ParsedStream[] {
  const best = new Map<string, ParsedStream>();
  for (const s of streams) {
    const key = `${s.quality}::${s.sourceType}::${s.source}`;
    const ex  = best.get(key);
    if (!ex || s.qualityScore > ex.qualityScore) best.set(key, s);
  }
  return [...best.values()];
}

// ── Badge styles ─────────────────────────────────────────────────────────────
const QUALITY_COLORS: Record<string, string> = {
  "4K":   "bg-yellow-400/20 text-yellow-300 border-yellow-400/40",
  "1080p":"bg-blue-500/15   text-blue-300   border-blue-500/35",
  "720p": "bg-green-500/15  text-green-300  border-green-500/35",
  "480p": "bg-zinc-700      text-zinc-300   border-zinc-600",
  "SD":   "bg-zinc-800      text-zinc-400   border-zinc-700",
};
const HDR_COLORS: Record<string, string> = {
  "Dolby Vision": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "HDR10+":       "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "HDR":          "bg-amber-500/15  text-amber-300  border-amber-500/30",
};
const SOURCE_ICONS: Record<string, string> = {
  "YTS": "🟡", "RARBG": "🔴", "1337X": "🔵", "YIFY": "🟡",
  "ThePirateBay": "☠️", "KickassTorrents": "🐱", "TorrentGalaxy": "🌌",
};

// ── Main component ────────────────────────────────────────────────────────────
export function StreamSources({ tmdbId, type, season = 1, episode = 1, onPlayDirect }: Props) {
  const { t, isRTL } = useLang();
  const [streams,      setStreams]      = useState<ParsedStream[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [imdbId,       setImdbId]       = useState<string | null>(null);
  const [resolvingId,  setResolvingId]  = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [copiedId,     setCopiedId]     = useState<string | null>(null);
  const [showAll,      setShowAll]      = useState(false);

  const config   = getAppConfig();
  const debrid   = config.debrid;
  const hasDebrid = !!(debrid?.service && debrid.service !== "none" && debrid.apiKey);

  const fetchStreams = useCallback(async () => {
    if (!tmdbId) return;
    setLoading(true);
    setError(null);
    setStreams([]);
    setImdbId(null);

    try {
      // Backend proxy: aggregates Torrentio + YTS, applies SQF filter, bypasses CORS/CF
      const params = new URLSearchParams({ tmdbId: String(tmdbId), type });
      if (type === "tv") { params.set("season", String(season)); params.set("episode", String(episode)); }

      const res  = await fetch(`/api/streams?${params}`, { signal: AbortSignal.timeout(20_000) });
      const data = await res.json();

      if (data.imdbId) setImdbId(data.imdbId);

      if (data.error && !(data.streams?.length)) {
        setError(data.error);
        setLoading(false);
        return;
      }

      processRaw(data.streams || []);
    } catch (err: any) {
      const msg = err?.name === "TimeoutError"
        ? t("انتهت مهلة الاتصال بـ Torrentio. أعد المحاولة.", "Torrentio request timed out. Please retry.")
        : t("تعذّر تحميل المصادر من Torrentio.", "Could not load streams from Torrentio.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tmdbId, type, season, episode]);

  function processRaw(rawStreams: any[]) {
    // Step 3: Client-side SQF — parse, deduplicate, sort
    const parsed  = rawStreams.map(parseStream).filter((s): s is ParsedStream => s !== null);
    const deduped = deduplicateStreams(parsed);
    const sorted  = deduped
      .sort((a, b) => b.qualityScore !== a.qualityScore ? b.qualityScore - a.qualityScore : b.seeders - a.seeders)
      .slice(0, 15);
    setStreams(sorted);
    if (sorted.length === 0 && rawStreams.length > 0) {
      setError(t("تم فلترة جميع المصادر بسبب جودة منخفضة.", "All sources were filtered out by quality filter."));
    }
  }

  useEffect(() => { fetchStreams(); }, [fetchStreams]);

  const copyMagnet = (stream: ParsedStream) => {
    navigator.clipboard.writeText(stream.magnetUri).catch(() => undefined);
    setCopiedId(stream.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const resolveAndPlay = async (stream: ParsedStream) => {
    if (!hasDebrid) { copyMagnet(stream); return; }

    setResolvingId(stream.id);
    setResolveError(null);
    try {
      const res = await fetch("/api/streams/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          infoHash:  stream.infoHash,
          fileIdx:   stream.fileIdx,
          service:   debrid!.service,
          apiKey:    debrid!.apiKey,
          magnetUri: stream.magnetUri,
        }),
      });
      const data = await res.json();
      if (data.url) {
        onPlayDirect(data.url, stream);
      } else {
        setResolveError(data.error || t("فشل الحصول على رابط التشغيل المباشر.", "Failed to get direct stream URL."));
      }
    } catch {
      setResolveError(t("تعذّر الاتصال بخدمة Debrid.", "Could not connect to debrid service."));
    } finally {
      setResolvingId(null);
    }
  };

  const displayed = showAll ? streams : streams.slice(0, 6);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/40">
      <Loader2 size={28} className="animate-spin text-primary" />
      <p className="text-sm font-medium">{t("جارٍ البحث عن مصادر البث...", "Scanning stream sources...")}</p>
      <p className="text-[11px] text-white/25">Torrentio • SQF Quality Filter</p>
    </div>
  );

  // ── Empty / Error ────────────────────────────────────────────────────────
  if (!loading && streams.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-white/40">
      {error ? (
        <>
          <AlertCircle size={28} className="text-red-400/60" />
          <p className="text-sm text-center max-w-xs text-red-300/60">{error}</p>
        </>
      ) : (
        <>
          <Film size={28} className="opacity-40" />
          <p className="text-sm">{t("لم يُعثر على مصادر لهذا المحتوى.", "No streams found for this content.")}</p>
        </>
      )}
      <button onClick={fetchStreams} className="flex items-center gap-1.5 text-primary text-xs hover:underline mt-1">
        <RefreshCw size={11} /> {t("إعادة المحاولة", "Retry")}
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <Zap size={14} className="text-primary" />
          <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">
            {streams.length} {t("مصدر", "sources")}
            {imdbId && <span className="text-white/20 ms-2 font-normal normal-case">{imdbId}</span>}
          </span>
        </div>
        <button onClick={fetchStreams} className="p-1.5 text-white/25 hover:text-white/60 transition-colors" title="Refresh">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Debrid notice (only when no debrid) */}
      {!hasDebrid && (
        <div className="flex items-start gap-2 bg-zinc-900/60 border border-white/6 rounded-xl px-3 py-2.5">
          <Info size={12} className="text-primary/50 mt-0.5 flex-shrink-0" />
          <p className="text-white/30 text-[11px] leading-relaxed">
            {t(
              "فعّل Real-Debrid أو AllDebrid في إعدادات التطبيق للتشغيل المباشر. بدونه، انسخ رابط المغناطيس وافتحه في مشغّل خارجي.",
              "Activate Real-Debrid or AllDebrid in App Settings for in-player streaming. Without it, copy the magnet link for an external player like qBittorrent."
            )}
          </p>
        </div>
      )}

      {/* Debrid has key — shield badge */}
      {hasDebrid && (
        <div className="flex items-center gap-2 bg-green-500/8 border border-green-500/20 rounded-xl px-3 py-2">
          <Shield size={12} className="text-green-400 flex-shrink-0" />
          <p className="text-green-300/70 text-[11px]">
            {debrid!.service === "realdebrid" ? "Real-Debrid" : "AllDebrid"}
            {t(" — تشغيل مباشر عبر Video.js", " — direct Video.js playback enabled")}
          </p>
        </div>
      )}

      {/* Resolve error */}
      {resolveError && (
        <div className="flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2">
          <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
          <p className="text-red-300/70 text-xs">{resolveError}</p>
        </div>
      )}

      {/* Stream cards */}
      <div className="space-y-2">
        {displayed.map((stream) => {
          const isResolving = resolvingId === stream.id;
          const isCopied    = copiedId === stream.id;
          const srcIcon = Object.entries(SOURCE_ICONS).find(([k]) =>
            stream.source.toLowerCase().includes(k.toLowerCase())
          )?.[1] || "🌐";

          return (
            <div
              key={stream.id}
              className="bg-zinc-900/80 border border-white/7 rounded-2xl overflow-hidden hover:border-white/14 transition-colors"
            >
              {/* Main info row */}
              <div className={`flex items-center gap-3 px-4 py-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                {/* Source icon */}
                <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/8 flex items-center justify-center text-lg flex-shrink-0">
                  {srcIcon}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Badges */}
                  <div className={`flex flex-wrap items-center gap-1.5 mb-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${QUALITY_COLORS[stream.quality] || QUALITY_COLORS["SD"]}`}>
                      {stream.quality}
                    </span>
                    {stream.hdr && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${HDR_COLORS[stream.hdr] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                        {stream.hdr}
                      </span>
                    )}
                    {stream.codec && (
                      <span className="text-[10px] text-white/30 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
                        {stream.codec}
                      </span>
                    )}
                    {stream.sourceType && stream.sourceType !== "WEB" && (
                      <span className="text-[10px] text-white/25 bg-zinc-800/50 border border-zinc-700/50 px-1.5 py-0.5 rounded">
                        {stream.sourceType}
                      </span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <span className="text-white/50 text-xs font-medium truncate">{stream.source}</span>
                    {stream.size && <span className="text-white/25 text-[10px] flex-shrink-0">💾 {stream.size}</span>}
                    {stream.seeders > 0 && (
                      <span className={`text-[10px] flex items-center gap-0.5 flex-shrink-0 ${
                        stream.seeders > 50 ? "text-green-400/70" :
                        stream.seeders > 10 ? "text-yellow-400/60" : "text-red-400/50"
                      }`}>
                        <Wifi size={9} />{stream.seeders}
                      </span>
                    )}
                    {/* Quality bar */}
                    <div className={`flex gap-0.5 ${isRTL ? "me-auto" : "ms-auto"} flex-shrink-0`}>
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-3 rounded-sm ${
                            i < Math.ceil(stream.qualityScore / 28)
                              ? "bg-primary/70"
                              : "bg-zinc-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className={`flex border-t border-white/5 ${isRTL ? "flex-row-reverse" : ""}`}>
                {/* Play / Resolve */}
                <button
                  onClick={() => resolveAndPlay(stream)}
                  disabled={isResolving}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-e border-white/5 ${
                    hasDebrid
                      ? "text-primary hover:bg-primary/8"
                      : "text-white/35 hover:text-primary hover:bg-white/3"
                  } disabled:opacity-50`}
                >
                  {isResolving ? (
                    <><Loader2 size={12} className="animate-spin" />{t("جارٍ التحليل...", "Resolving...")}</>
                  ) : hasDebrid ? (
                    <><Play size={12} fill="currentColor" />{t("تشغيل مباشر", "Play Direct")}</>
                  ) : (
                    <><Zap size={12} />{t("معلومات الجودة", "Quality Info")}</>
                  )}
                </button>

                {/* Copy magnet */}
                <button
                  onClick={() => copyMagnet(stream)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-white/30 hover:text-primary hover:bg-primary/5 transition-colors text-xs flex-shrink-0"
                  title={t("نسخ رابط المغناطيس", "Copy Magnet Link")}
                >
                  {isCopied
                    ? <><Check size={12} className="text-green-400" /><span className="text-green-400">{t("تم", "Copied")}</span></>
                    : <><Copy size={12} /><span>{t("مغناطيس", "Magnet")}</span></>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more */}
      {streams.length > 6 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-white/30 hover:text-primary text-xs font-medium transition-colors border border-white/6 hover:border-primary/30 rounded-xl"
        >
          <ChevronDown size={13} className={`transition-transform ${showAll ? "rotate-180" : ""}`} />
          {showAll
            ? t("عرض أقل", "Show less")
            : t(`عرض ${streams.length - 6} مصادر إضافية`, `Show ${streams.length - 6} more`)}
        </button>
      )}
    </div>
  );
}
