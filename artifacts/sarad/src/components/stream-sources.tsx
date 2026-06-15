/**
 * StreamSources — Stremio-inspired quality-sorted stream panel
 *
 * Fully client-side, no backend dependency.
 * All API calls use absolute https:// URLs.
 *
 * Sources: Torrentio · Deflix · Orion · 1337x · YTS · EZTV · ThePirateBay
 * Debrid:  Real-Debrid / AllDebrid resolved client-side
 */
import { useEffect, useState, useCallback } from "react";
import {
  Zap, Copy, Check, Loader2, Wifi, AlertCircle,
  Play, Shield, Film, ChevronDown, RefreshCw, Info, ExternalLink,
} from "lucide-react";
import { useLang }       from "@/lib/language";
import { getAppConfig }  from "@/lib/app-settings";
import { getImdbId }     from "@/lib/tmdb";
import { getStreams }    from "@/lib/stream-scraper";
import { resolveDebrid } from "@/lib/debrid";

// Re-export ParsedStream so watch.tsx can keep its existing import
export type { ParsedStream } from "@/lib/stream-scraper";
import type { ParsedStream } from "@/lib/stream-scraper";

interface Props {
  tmdbId:       number;
  type:         "movie" | "tv";
  season?:      number;
  episode?:     number;
  title?:       string;
  onPlayDirect: (url: string, stream: ParsedStream) => void;
}

// ── Badge styles ──────────────────────────────────────────────────────────────
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
  "yts":           "🟡",
  "rarbg":         "🔴",
  "1337x":         "🔵",
  "yify":          "🟡",
  "eztv":          "📺",
  "thepiratebay":  "☠️",
  "kickass":       "🐱",
  "torrentgalaxy": "🌌",
  "torrentio":     "⚡",
  "deflix":        "🚀",
  "orion":         "🔮",
};

function sourceIcon(src: string): string {
  const lower = src.toLowerCase();
  return Object.entries(SOURCE_ICONS).find(([k]) => lower.includes(k))?.[1] || "🌐";
}

// ── Component ──────────────────────────────────────────────────────────────────
export function StreamSources({
  tmdbId, type, season = 1, episode = 1, title = "", onPlayDirect,
}: Props) {
  const { t, isRTL } = useLang();
  const [streams,      setStreams]      = useState<ParsedStream[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [imdbId,       setImdbId]       = useState<string | null>(null);
  const [resolvingId,  setResolvingId]  = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [copiedId,     setCopiedId]     = useState<string | null>(null);
  const [showAll,      setShowAll]      = useState(false);

  const config      = getAppConfig();
  const debrid      = config.debrid;
  const orionKey    = config.orionApiKey || "";
  const hasDebrid   = !!(debrid?.service && debrid.service !== "none" && debrid.apiKey);
  const hasOrion    = !!orionKey;

  const fetchStreams = useCallback(async () => {
    if (!tmdbId) return;
    setLoading(true);
    setError(null);
    setStreams([]);
    setImdbId(null);

    try {
      // 1. TMDB → IMDb ID (direct TMDB API, absolute URL)
      const resolvedImdbId = await getImdbId(tmdbId, type);
      if (!resolvedImdbId) {
        setError(t("لم يُعثر على معرّف IMDb لهذا المحتوى.", "IMDb ID not found for this title."));
        setLoading(false);
        return;
      }
      setImdbId(resolvedImdbId);

      // 2. Aggregate all sources (all absolute https:// URLs)
      const result = await getStreams(
        resolvedImdbId, type, season, episode, title,
        hasDebrid ? debrid : null,
        orionKey,
      );

      if (result.streams.length === 0) {
        setError(t("لم يُعثر على مصادر لهذا المحتوى.", "No streams found for this content."));
      }
      setStreams(result.streams);
    } catch (err: any) {
      const msg = err?.name === "TimeoutError"
        ? t("انتهت مهلة الاتصال. أعد المحاولة.", "Request timed out. Please retry.")
        : t("تعذّر تحميل المصادر. أعد المحاولة.", "Could not load streams. Please retry.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tmdbId, type, season, episode, title, hasDebrid, orionKey]);

  useEffect(() => { fetchStreams(); }, [fetchStreams]);

  const copyMagnet = (stream: ParsedStream) => {
    const text = stream.magnetUri || stream.directUrl || "";
    navigator.clipboard.writeText(text).catch(() => undefined);
    setCopiedId(stream.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const resolveAndPlay = async (stream: ParsedStream) => {
    // Direct-link streams (Deflix) play immediately — no debrid needed
    if (stream.isDirectLink && stream.directUrl) {
      onPlayDirect(stream.directUrl, stream);
      return;
    }
    if (!hasDebrid) { copyMagnet(stream); return; }

    setResolvingId(stream.id);
    setResolveError(null);
    try {
      const url = await resolveDebrid(debrid!, stream);
      onPlayDirect(url, stream);
    } catch (err: any) {
      setResolveError(
        err?.message?.includes("timeout") || err?.message?.includes("caching")
          ? t("لا يزال التورنت يُحمَّل في خدمة Debrid. انتظر لحظة وأعد المحاولة.", "Torrent is still caching in debrid. Wait a moment and retry.")
          : t("فشل الحصول على رابط التشغيل المباشر.", "Failed to get direct stream URL.")
      );
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
      <p className="text-[11px] text-white/25">
        Torrentio{hasDebrid ? " · Deflix" : ""}{hasOrion ? " · Orion" : ""} · 1337x · YTS · EZTV · TPB · SQF
      </p>
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

      {/* Status banners */}
      {!hasDebrid && (
        <div className="flex items-start gap-2 bg-zinc-900/60 border border-white/6 rounded-xl px-3 py-2.5">
          <Info size={12} className="text-primary/50 mt-0.5 flex-shrink-0" />
          <p className="text-white/30 text-[11px] leading-relaxed">
            {t(
              "فعّل Real-Debrid أو AllDebrid في إعدادات التطبيق للتشغيل المباشر. بدونه، انسخ رابط المغناطيس وافتحه في مشغّل خارجي.",
              "Enable Real-Debrid or AllDebrid in App Settings for in-player streaming. Without it, copy the magnet link for an external player."
            )}
          </p>
        </div>
      )}

      {hasDebrid && (
        <div className="flex items-center gap-2 bg-green-500/8 border border-green-500/20 rounded-xl px-3 py-2">
          <Shield size={12} className="text-green-400 flex-shrink-0" />
          <p className="text-green-300/70 text-[11px]">
            {debrid!.service === "realdebrid" ? "Real-Debrid" : "AllDebrid"}
            {t(" — تشغيل مباشر عبر Video.js", " — direct Video.js playback enabled")}
          </p>
        </div>
      )}

      {resolveError && (
        <div className="flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2">
          <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
          <p className="text-red-300/70 text-xs">{resolveError}</p>
        </div>
      )}

      {/* Stream cards */}
      <div className="space-y-2">
        {displayed.map((stream) => {
          const isResolving  = resolvingId === stream.id;
          const isCopied     = copiedId    === stream.id;
          const isDirect     = !!stream.isDirectLink;
          const canPlayNow   = isDirect || hasDebrid;
          const srcIcon      = sourceIcon(stream.source);

          return (
            <div
              key={stream.id}
              className={`bg-zinc-900/80 border rounded-2xl overflow-hidden transition-colors ${
                isDirect
                  ? "border-green-500/20 hover:border-green-500/35"
                  : "border-white/7 hover:border-white/14"
              }`}
            >
              <div className={`flex items-center gap-3 px-4 py-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                {/* Source icon */}
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg flex-shrink-0 ${
                  isDirect ? "bg-green-900/30 border-green-500/25" : "bg-zinc-800 border-white/8"
                }`}>
                  {srcIcon}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Quality badges */}
                  <div className={`flex flex-wrap items-center gap-1.5 mb-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${QUALITY_COLORS[stream.quality] || QUALITY_COLORS["SD"]}`}>
                      {stream.quality}
                    </span>
                    {isDirect && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-green-500/15 text-green-300 border-green-500/30">
                        DIRECT
                      </span>
                    )}
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
                        <div key={i} className={`w-1 h-3 rounded-sm ${i < Math.ceil(stream.qualityScore / 28) ? "bg-primary/70" : "bg-zinc-700"}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className={`flex border-t border-white/5 ${isRTL ? "flex-row-reverse" : ""}`}>
                <button
                  onClick={() => resolveAndPlay(stream)}
                  disabled={isResolving}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-e border-white/5 disabled:opacity-50 ${
                    isDirect
                      ? "text-green-300 hover:bg-green-500/10"
                      : canPlayNow
                        ? "text-primary hover:bg-primary/8"
                        : "text-white/35 hover:text-primary hover:bg-white/3"
                  }`}
                >
                  {isResolving ? (
                    <><Loader2 size={12} className="animate-spin" />{t("جارٍ التحليل...", "Resolving...")}</>
                  ) : isDirect ? (
                    <><ExternalLink size={12} />{t("تشغيل مباشر", "Play Direct")}</>
                  ) : canPlayNow ? (
                    <><Play size={12} fill="currentColor" />{t("تشغيل", "Play")}</>
                  ) : (
                    <><Zap size={12} />{t("معلومات الجودة", "Quality Info")}</>
                  )}
                </button>

                <button
                  onClick={() => copyMagnet(stream)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-white/30 hover:text-primary hover:bg-primary/5 transition-colors text-xs flex-shrink-0"
                  title={isDirect
                    ? t("نسخ الرابط المباشر", "Copy Direct URL")
                    : t("نسخ رابط المغناطيس", "Copy Magnet Link")}
                >
                  {isCopied
                    ? <><Check size={12} className="text-green-400" /><span className="text-green-400">{t("تم", "Copied")}</span></>
                    : <><Copy size={12} /><span>{isDirect ? t("رابط", "URL") : t("مغناطيس", "Magnet")}</span></>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
