import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearch } from "wouter";
import {
  ArrowLeft, Star, Clock, Calendar, Bookmark, BookmarkCheck,
  Play, Server, Tv, ChevronDown, ChevronUp, Zap, X, AlertCircle,
} from "lucide-react";
import { useLang } from "@/lib/language";
import { isInList, addToList, removeFromList } from "@/lib/auth";
import { getActiveServers, buildMovieUrl, buildTvUrl } from "@/lib/app-settings";
import { StreamSources, type ParsedStream } from "@/components/stream-sources";
import { fetchMovie, fetchTv, fetchSeason } from "@/lib/tmdb";

const TMDB_W780 = "https://image.tmdb.org/t/p/w780";
const TMDB_BG   = "https://image.tmdb.org/t/p/original";
const TMDB_W300 = "https://image.tmdb.org/t/p/w300";

interface TmdbDetail {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  genres?: { id: number; name: string }[];
  number_of_seasons?: number;
  seasons?: TmdbSeason[];
}
interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path?: string | null;
}
interface TmdbEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview?: string;
  still_path?: string | null;
  air_date?: string;
  vote_average?: number;
  runtime?: number;
}

// ── Video.js Direct Player ────────────────────────────────────────────────────
function DirectVideoPlayer({
  src, onError, onClose,
}: { src: string; onError: () => void; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef    = useRef<any>(null);
  const idRef        = useRef(`vjs-direct-${Math.random().toString(36).slice(2)}`);

  const initPlayer = useCallback(() => {
    const vjs = (window as any).videojs;
    if (!vjs || !containerRef.current) return;

    const existing = containerRef.current.querySelector("video");
    if (!existing) return;
    existing.id = idRef.current;

    if (playerRef.current) {
      try { playerRef.current.dispose(); } catch { /* ignore */ }
      playerRef.current = null;
    }

    const mimeType = src.toLowerCase().includes(".m3u8")
      ? "application/x-mpegURL"
      : src.toLowerCase().includes(".mp4")
      ? "video/mp4"
      : "application/x-mpegURL"; // try HLS first for unknown types

    playerRef.current = vjs(idRef.current, {
      autoplay:   true,
      controls:   true,
      responsive: false,
      fluid:      false,
      fill:       true,
      sources:    [{ src, type: mimeType }],
      html5: { vhs: { overrideNative: true, enableLowInitialPlaylist: true } },
    });

    playerRef.current.on("error", () => {
      if (mimeType === "application/x-mpegURL") {
        playerRef.current.src({ src, type: "video/mp4" });
      } else {
        onError();
      }
    });
  }, [src, onError]);

  useEffect(() => {
    const loadVjs = () => {
      if ((window as any).videojs) { initPlayer(); return; }
      const link = document.createElement("link");
      link.rel  = "stylesheet";
      link.href = "https://vjs.zencdn.net/8.10.0/video-js.min.css";
      document.head.appendChild(link);
      const script   = document.createElement("script");
      script.src     = "https://vjs.zencdn.net/8.10.0/video.min.js";
      script.onload  = initPlayer;
      document.head.appendChild(script);
    };
    loadVjs();
    return () => {
      if (playerRef.current) {
        try { playerRef.current.dispose(); } catch { /* ignore */ }
        playerRef.current = null;
      }
    };
  }, [src, initPlayer]);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-black">
      <video className="video-js vjs-big-play-centered vjs-theme-city w-full h-full" />
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-50 bg-black/70 hover:bg-black text-white/70 hover:text-white p-2 rounded-full transition-colors"
        title="Close direct player"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function WatchPage() {
  const { id }  = useParams<{ id: string }>();
  const search  = useSearch();
  const { t, isRTL } = useLang();

  const tmdbId    = parseInt(id || "0", 10);
  const sp        = new URLSearchParams(search);
  const typeParam = sp.get("type") as "movie" | "tv" | null;

  // Core state
  const [data,        setData]        = useState<TmdbDetail | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [contentType, setContentType] = useState<"movie" | "tv">(typeParam || "movie");
  const [bookmarked,  setBookmarked]  = useState(() => isInList(tmdbId));

  // Player tab: "iframe" = existing iframe servers, "smart" = Torrentio streams
  const [playerTab, setPlayerTab] = useState<"iframe" | "smart">("smart");

  // Iframe server state
  const [activeServerId, setActiveServerId] = useState<string>("");
  const [iframeActive,   setIframeActive]   = useState(false);
  const servers = getActiveServers();

  // Direct playback state (debrid-resolved)
  const [directUrl,   setDirectUrl]   = useState<string | null>(null);
  const [directInfo,  setDirectInfo]  = useState<ParsedStream | null>(null);
  const [directError, setDirectError] = useState(false);

  // TV state
  const [selectedSeason,       setSelectedSeason]       = useState(1);
  const [selectedEpisode,      setSelectedEpisode]       = useState(1);
  const [episodes,             setEpisodes]             = useState<TmdbEpisode[]>([]);
  const [episodesLoading,      setEpisodesLoading]      = useState(false);
  const [seasonDropdownOpen,   setSeasonDropdownOpen]   = useState(false);

  useEffect(() => {
    if (servers.length && !activeServerId) setActiveServerId(servers[0]?.id || "");
  }, [servers.length]);

  // Fetch TMDB metadata
  useEffect(() => {
    if (!tmdbId || isNaN(tmdbId)) return;
    setLoading(true);
    setData(null);
    setIframeActive(false);
    setDirectUrl(null);

    const go = async () => {
      if (typeParam === "tv") {
        const d = await fetchTv(tmdbId).catch(() => null);
        if (d?.id) { setData(d); setContentType("tv"); }
      } else if (typeParam === "movie") {
        const d = await fetchMovie(tmdbId).catch(() => null);
        if (d?.id) { setData(d); setContentType("movie"); }
      } else {
        const d1 = await fetchMovie(tmdbId).catch(() => null);
        if (d1?.id) { setData(d1); setContentType("movie"); return; }
        const d2 = await fetchTv(tmdbId).catch(() => null);
        if (d2?.id) { setData(d2); setContentType("tv"); }
      }
    };
    go().catch(() => undefined).finally(() => setLoading(false));
  }, [tmdbId, typeParam]);

  // Fetch TV episodes
  useEffect(() => {
    if (contentType !== "tv" || !tmdbId || isNaN(tmdbId)) return;
    setEpisodesLoading(true);
    setEpisodes([]);
    fetchSeason(tmdbId, selectedSeason)
      .then(d => setEpisodes(d.episodes || []))
      .catch(() => setEpisodes([]))
      .finally(() => setEpisodesLoading(false));
  }, [tmdbId, selectedSeason, contentType]);

  const toggleBookmark = () => {
    if (bookmarked) removeFromList(tmdbId); else addToList(tmdbId);
    setBookmarked(b => !b);
  };

  // Build iframe URL
  const getIframeSrc = (): string => {
    const server = servers.find(s => s.id === activeServerId) || servers[0];
    if (!server) return "";
    return contentType === "movie"
      ? buildMovieUrl(server, tmdbId)
      : buildTvUrl(server, tmdbId, selectedSeason, selectedEpisode);
  };

  // Handle direct stream resolved from debrid
  const handlePlayDirect = (url: string, stream: ParsedStream) => {
    setDirectUrl(url);
    setDirectInfo(stream);
    setDirectError(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEpisodePlay = (epNum: number) => {
    setSelectedEpisode(epNum);
    setIframeActive(true);
    setDirectUrl(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activateIframeServer = (serverId: string) => {
    setActiveServerId(serverId);
    setDirectUrl(null);
    if (contentType === "movie") setIframeActive(true);
    else if (iframeActive) { setIframeActive(false); setTimeout(() => setIframeActive(true), 60); }
  };

  const title    = data?.title || data?.name || "";
  const poster   = data?.poster_path  ? `${TMDB_W780}${data.poster_path}`  : null;
  const backdrop = data?.backdrop_path ? `${TMDB_BG}${data.backdrop_path}` : null;
  const year     = (data?.release_date || data?.first_air_date || "").slice(0, 4);
  const genres   = data?.genres?.map(g => g.name) || [];
  const validSeasons     = (data?.seasons || []).filter(s => s.season_number > 0);
  const currentSeason    = validSeasons.find(s => s.season_number === selectedSeason);
  const showIframePlayer = playerTab === "iframe" && (contentType === "movie" ? iframeActive : iframeActive);
  const showDirectPlayer = !!(directUrl && !directError);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-black">
      <div className="w-full bg-zinc-950 relative" style={{ paddingTop: "56.25%" }}>
        <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
      </div>
      <div className="px-4 md:px-8 py-6 space-y-3 max-w-4xl">
        <div className="h-8 w-72 bg-zinc-900 rounded-lg animate-pulse" />
        <div className="h-4 w-96 bg-zinc-900 rounded animate-pulse" />
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <AlertCircle size={36} className="text-white/20 mx-auto mb-4" />
        <p className="text-white/50 mb-4">{t("المحتوى غير متوفر", "Content not available")}</p>
        <button onClick={() => history.back()} className="text-primary hover:underline text-sm">
          {t("رجوع", "Go back")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-10">

      {/* Back button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => history.back()}
          className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-2 rounded-full text-white/80 hover:text-white border border-white/10 shadow-lg"
        >
          <ArrowLeft size={15} />
          <span className="text-xs hidden md:inline font-medium">{t("رجوع", "Back")}</span>
        </button>
      </div>

      {/* ══ PLAYER AREA ═════════════════════════════════════════════════════ */}
      <div className="w-full bg-zinc-950 shadow-xl">
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          {/* Direct Video.js player */}
          {showDirectPlayer && (
            <DirectVideoPlayer
              src={directUrl!}
              onError={() => setDirectError(true)}
              onClose={() => { setDirectUrl(null); setDirectInfo(null); }}
            />
          )}

          {/* Iframe player */}
          {showIframePlayer && !showDirectPlayer && playerTab === "iframe" && (
            <iframe
              key={`iframe-${tmdbId}-${activeServerId}-${selectedSeason}-${selectedEpisode}`}
              src={getIframeSrc()}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              referrerPolicy="no-referrer"
              frameBorder="0"
              title={title}
            />
          )}

          {/* Placeholder (no player active) */}
          {!showDirectPlayer && !showIframePlayer && (
            <>
              {backdrop && <img src={backdrop} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-25" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 flex flex-col items-center justify-center gap-3">
                <Tv size={48} className="text-primary opacity-60" />
                <p className="text-white/60 text-sm font-medium">
                  {contentType === "tv"
                    ? t("اختر حلقة أدناه أو شغّل مصدراً مباشراً", "Select an episode below or play a smart stream")
                    : t("اختر مصدراً للبث أدناه", "Choose a stream source below")}
                </p>
              </div>
            </>
          )}

          {/* Direct player quality badge */}
          {showDirectPlayer && directInfo && (
            <div className="absolute top-3 left-3 z-50 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Zap size={11} className="text-primary" />
              <span className="text-white/80 text-[11px] font-semibold">{directInfo.quality}</span>
              {directInfo.hdr && <span className="text-purple-300 text-[10px]">{directInfo.hdr}</span>}
              {directInfo.codec && <span className="text-white/40 text-[10px]">{directInfo.codec}</span>}
            </div>
          )}

          {/* Direct error fallback */}
          {directError && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-white/60 text-sm">{t("تعذّر تشغيل الرابط المباشر.", "Direct stream playback failed.")}</p>
              <button
                onClick={() => { setDirectError(false); setDirectUrl(null); setPlayerTab("iframe"); setIframeActive(true); }}
                className="text-primary text-sm hover:underline"
              >
                {t("التبديل إلى خادم iframe", "Switch to iframe server")}
              </button>
            </div>
          )}
        </div>

        {/* ══ PLAYER TABS + CONTROLS ══════════════════════════════════════ */}
        <div className="bg-zinc-950 border-t border-white/5">

          {/* Tab switcher */}
          <div className={`flex border-b border-white/5 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              onClick={() => setPlayerTab("smart")}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
                playerTab === "smart"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              <Zap size={13} />
              {t("مصادر ذكية", "Smart Streams")}
            </button>
            <button
              onClick={() => setPlayerTab("iframe")}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
                playerTab === "iframe"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              <Server size={13} />
              {t("خوادم Iframe", "Iframe Servers")}
            </button>
          </div>

          {/* Smart Streams panel */}
          {playerTab === "smart" && (
            <div className="px-4 md:px-6 py-4 max-h-[55vh] md:max-h-none overflow-y-auto">
              <StreamSources
                tmdbId={tmdbId}
                type={contentType}
                season={selectedSeason}
                episode={selectedEpisode}
                title={title}
                onPlayDirect={handlePlayDirect}
              />
            </div>
          )}

          {/* Iframe Servers panel */}
          {playerTab === "iframe" && (
            <div className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="flex items-center gap-1.5">
                <Server size={13} className="text-primary" />
                <span className="text-white/40 text-xs font-medium">{t("الخادم:", "Server:")}</span>
              </div>
              {servers.map(server => (
                <button
                  key={server.id}
                  onClick={() => activateIframeServer(server.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    activeServerId === server.id
                      ? "bg-primary text-black border-primary shadow-[0_0_14px_rgba(212,175,55,0.4)]"
                      : "bg-zinc-900 text-white/60 border-white/10 hover:border-primary/50 hover:text-white"
                  }`}
                >
                  {server.label}
                </button>
              ))}
              {contentType === "movie" && (
                <button
                  onClick={() => { setIframeActive(true); setDirectUrl(null); }}
                  className="ms-auto flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-black px-5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  <Play size={11} fill="currentColor" />
                  {t("شاهد الآن", "Watch Now")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ METADATA ════════════════════════════════════════════════════════ */}
      <div className={`px-4 md:px-8 py-5 max-w-5xl ${isRTL ? "ml-auto text-right" : ""}`}>
        <div className={`flex items-start gap-5 ${isRTL ? "flex-row-reverse" : ""}`}>
          {poster && (
            <img src={poster} alt={title} className="hidden md:block w-28 lg:w-36 rounded-xl border border-white/10 flex-shrink-0 shadow-2xl" />
          )}
          <div className="flex-1 min-w-0">
            <div className={`flex items-start justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">{title}</h1>
                <div className={`flex flex-wrap items-center gap-2 mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                  {(data.vote_average ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-primary font-bold text-sm">
                      <Star size={13} fill="currentColor" />{data.vote_average!.toFixed(1)}
                    </span>
                  )}
                  {year && <span className="flex items-center gap-1 text-white/55 text-sm"><Calendar size={12} />{year}</span>}
                  {data.runtime ? <span className="flex items-center gap-1 text-white/55 text-sm"><Clock size={12} />{data.runtime} {t("دق", "min")}</span> : null}
                  {contentType === "tv" && data.number_of_seasons ? (
                    <span className="text-white/55 text-xs">{data.number_of_seasons} {t("موسم", "seasons")}</span>
                  ) : null}
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                    contentType === "tv"
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      : "bg-primary/15 text-primary border-primary/30"
                  }`}>
                    {contentType === "tv" ? t("مسلسل", "TV Series") : t("فيلم", "Movie")}
                  </span>
                </div>
                {genres.length > 0 && (
                  <div className={`flex flex-wrap gap-2 mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    {genres.map(g => (
                      <span key={g} className="bg-zinc-800/80 text-white/65 text-xs px-3 py-1 rounded-full border border-white/8">{g}</span>
                    ))}
                  </div>
                )}
                {data.overview && (
                  <p className="text-white/65 text-sm leading-relaxed max-w-2xl line-clamp-4">{data.overview}</p>
                )}
              </div>
              <button
                onClick={toggleBookmark}
                className="flex-shrink-0 flex flex-col items-center gap-1 p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors border border-white/8"
              >
                {bookmarked
                  ? <BookmarkCheck size={20} className="text-primary" />
                  : <Bookmark size={20} className="text-white/50" />}
                <span className="text-[10px] text-white/40">{t("قائمتي", "My List")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ TV EPISODES ═════════════════════════════════════════════════════ */}
      {contentType === "tv" && validSeasons.length > 0 && (
        <div className="px-4 md:px-8 pb-8">
          <div className="border-t border-white/8 pt-6">
            <div className={`flex items-center justify-between mb-5 ${isRTL ? "flex-row-reverse" : ""}`}>
              <h2 className="text-lg font-bold text-white">{t("الحلقات", "Episodes")}</h2>
              <div className="relative">
                <button
                  onClick={() => setSeasonDropdownOpen(o => !o)}
                  className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-primary/50 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                >
                  {currentSeason?.name || `${t("الموسم", "Season")} ${selectedSeason}`}
                  {seasonDropdownOpen ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-white/50" />}
                </button>
                {seasonDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[180px]">
                    {validSeasons.map(s => (
                      <button
                        key={s.season_number}
                        onClick={() => {
                          setSelectedSeason(s.season_number);
                          setSeasonDropdownOpen(false);
                          setIframeActive(false);
                          setDirectUrl(null);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-zinc-800 ${
                          selectedSeason === s.season_number ? "text-primary font-semibold bg-primary/10" : "text-white/80"
                        }`}
                      >
                        {s.name || `Season ${s.season_number}`}
                        <span className="text-white/30 text-xs ms-2">({s.episode_count} {t("حلقة", "eps")})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {episodesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-zinc-900 rounded-2xl animate-pulse" />)}
              </div>
            ) : episodes.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">{t("لا توجد حلقات", "No episodes found")}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {episodes.map(ep => {
                  const isIframePlaying = iframeActive && selectedEpisode === ep.episode_number && !directUrl;
                  const still = ep.still_path ? `${TMDB_W300}${ep.still_path}` : null;
                  return (
                    <button
                      key={ep.id}
                      onClick={() => handleEpisodePlay(ep.episode_number)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all duration-200 group/ep hover:scale-[1.01] ${
                        isIframePlaying
                          ? "bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                          : "bg-zinc-900/70 border-white/6 hover:border-primary/30 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="relative flex-shrink-0 w-28 rounded-xl overflow-hidden bg-zinc-800" style={{ aspectRatio: "16/9" }}>
                        {still
                          ? <img src={still} alt={ep.name} className="w-full h-full object-cover" loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center"><Tv size={22} className="text-white/20" /></div>}
                        <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${isIframePlaying ? "opacity-100" : "opacity-0 group-hover/ep:opacity-100"}`}>
                          <div className="w-9 h-9 rounded-full bg-primary shadow-[0_0_16px_rgba(212,175,55,0.5)] flex items-center justify-center">
                            <Play size={13} fill="black" className="ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className={`flex items-center gap-2 mb-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isIframePlaying ? "bg-primary text-black" : "bg-zinc-800 text-white/50"}`}>
                            {t("ح", "E")}{ep.episode_number}
                          </span>
                          {isIframePlaying && (
                            <span className="text-primary text-[11px] font-semibold animate-pulse">{t("يعرض ●", "Playing ●")}</span>
                          )}
                          {ep.runtime ? <span className="text-white/30 text-[10px] ms-auto">{ep.runtime}{t("د", "m")}</span> : null}
                        </div>
                        <p className="text-white text-sm font-semibold line-clamp-1 mb-1">{ep.name}</p>
                        {ep.overview && <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{ep.overview}</p>}
                        {(ep.vote_average ?? 0) > 0 && (
                          <p className="flex items-center gap-1 text-primary text-[10px] mt-1.5">
                            <Star size={8} fill="currentColor" />{ep.vote_average!.toFixed(1)}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
