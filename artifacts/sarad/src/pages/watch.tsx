import { useEffect, useState } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import {
  ArrowLeft, Star, Clock, Calendar, Bookmark, BookmarkCheck,
  Play, Server, Tv, ChevronDown, ChevronUp,
} from "lucide-react";
import { useLang } from "@/lib/language";
import { isInList, addToList, removeFromList } from "@/lib/auth";

const TMDB_W780 = "https://image.tmdb.org/t/p/w780";
const TMDB_BG   = "https://image.tmdb.org/t/p/original";
const TMDB_W300 = "https://image.tmdb.org/t/p/w300";

// ── Server configs ──────────────────────────────────────────────────────────
const MOVIE_SERVERS = [
  { id: 1, label: "Server 1", getUrl: (id: number) => `https://vidsrc.me/embed/movie?tmdb=${id}` },
  { id: 2, label: "Server 2", getUrl: (id: number) => `https://2embed.cc/embed/${id}` },
  { id: 3, label: "Server 3", getUrl: (id: number) => `https://superembed.stream/movie/${id}` },
];

const TV_SERVERS = [
  { id: 1, label: "Server 1", getUrl: (id: number, s: number, e: number) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}` },
  { id: 2, label: "Server 2", getUrl: (id: number, s: number, e: number) => `https://2embed.cc/embed/tv?tmdb=${id}&season=${s}&episode=${e}` },
  { id: 3, label: "Server 3", getUrl: (id: number, s: number, e: number) => `https://superembed.stream/tv/${id}/${s}/${e}` },
];

// ── Types ───────────────────────────────────────────────────────────────────
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
  episode_run_time?: number[];
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
  air_date?: string;
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

// ── Component ───────────────────────────────────────────────────────────────
export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { t, isRTL } = useLang();

  const tmdbId = parseInt(id || "0", 10);
  const searchParams = new URLSearchParams(search);
  const typeParam = searchParams.get("type") as "movie" | "tv" | null;

  // Core state
  const [data, setData] = useState<TmdbDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentType, setContentType] = useState<"movie" | "tv">(typeParam || "movie");
  const [bookmarked, setBookmarked] = useState(() => isInList(tmdbId));

  // Player state
  const [activeServer, setActiveServer] = useState(1);
  const [playerActive, setPlayerActive] = useState(false);

  // TV state
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState<TmdbEpisode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

  // ── Fetch TMDB metadata ──────────────────────────────────────────────────
  useEffect(() => {
    if (!tmdbId || isNaN(tmdbId)) return;
    setLoading(true);
    setData(null);
    setPlayerActive(false);
    setSelectedSeason(1);
    setSelectedEpisode(1);

    const go = async () => {
      if (typeParam === "tv") {
        const r = await fetch(`/api/tmdb/tv/${tmdbId}`);
        if (r.ok) { setData(await r.json()); setContentType("tv"); }
      } else if (typeParam === "movie") {
        const r = await fetch(`/api/tmdb/movie/${tmdbId}`);
        if (r.ok) { setData(await r.json()); setContentType("movie"); }
      } else {
        // Auto-detect
        const r1 = await fetch(`/api/tmdb/movie/${tmdbId}`);
        if (r1.ok) {
          const d = await r1.json();
          if (d?.id) { setData(d); setContentType("movie"); return; }
        }
        const r2 = await fetch(`/api/tmdb/tv/${tmdbId}`);
        if (r2.ok) {
          const d = await r2.json();
          if (d?.id) { setData(d); setContentType("tv"); }
        }
      }
    };

    go().catch(() => undefined).finally(() => setLoading(false));
  }, [tmdbId, typeParam]);

  // ── Fetch episodes when season changes ──────────────────────────────────
  useEffect(() => {
    if (contentType !== "tv" || !tmdbId || isNaN(tmdbId)) return;
    setEpisodesLoading(true);
    setEpisodes([]);
    fetch(`/api/tmdb/tv/${tmdbId}/season/${selectedSeason}`)
      .then(r => r.ok ? r.json() : { episodes: [] })
      .then(d => setEpisodes(d.episodes || []))
      .catch(() => setEpisodes([]))
      .finally(() => setEpisodesLoading(false));
  }, [tmdbId, selectedSeason, contentType]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const toggleBookmark = () => {
    if (bookmarked) removeFromList(tmdbId);
    else addToList(tmdbId);
    setBookmarked(b => !b);
  };

  const getIframeSrc = (): string => {
    if (contentType === "movie") {
      const s = MOVIE_SERVERS.find(s => s.id === activeServer) || MOVIE_SERVERS[0];
      return s.getUrl(tmdbId);
    }
    const s = TV_SERVERS.find(s => s.id === activeServer) || TV_SERVERS[0];
    return s.getUrl(tmdbId, selectedSeason, selectedEpisode);
  };

  const handleEpisodePlay = (epNum: number) => {
    setSelectedEpisode(epNum);
    setPlayerActive(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Derived display values ───────────────────────────────────────────────
  const title    = data?.title || data?.name || "";
  const poster   = data?.poster_path  ? `${TMDB_W780}${data.poster_path}`  : null;
  const backdrop = data?.backdrop_path ? `${TMDB_BG}${data.backdrop_path}` : null;
  const year     = (data?.release_date || data?.first_air_date || "").slice(0, 4);
  const genres   = data?.genres?.map(g => g.name) || [];
  const validSeasons = (data?.seasons || []).filter(s => s.season_number > 0);
  const currentSeason = validSeasons.find(s => s.season_number === selectedSeason);
  const showPlayer = contentType === "movie" || (contentType === "tv" && playerActive);

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="w-full bg-zinc-950" style={{ paddingTop: "56.25%", position: "relative" }}>
          <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
        </div>
        <div className="px-4 md:px-8 py-6 space-y-3 max-w-4xl">
          <div className="h-8 w-72 bg-zinc-900 rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-zinc-900 rounded animate-pulse" />
          <div className="h-4 w-64 bg-zinc-900 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-lg mb-4">{t("المحتوى غير متوفر", "Content not available")}</p>
          <button onClick={() => navigate("/")} className="text-primary hover:underline text-sm">
            {t("العودة للرئيسية", "Back to Home")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-10">

      {/* ── Back button ─────────────────────────────────────────────────── */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => history.back()}
          className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-2 rounded-full text-white/80 hover:text-white transition-colors border border-white/10 shadow-lg"
        >
          <ArrowLeft size={15} />
          <span className="text-xs hidden md:inline font-medium">{t("رجوع", "Back")}</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PLAYER SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-zinc-950 shadow-xl">

        {/* iframe or placeholder */}
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          {showPlayer ? (
            <iframe
              key={`${tmdbId}-s${activeServer}-s${selectedSeason}-e${selectedEpisode}`}
              src={getIframeSrc()}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              referrerPolicy="no-referrer"
              frameBorder="0"
              title={title}
            />
          ) : (
            /* TV: backdrop placeholder before episode is selected */
            <>
              {backdrop && (
                <img
                  src={backdrop}
                  alt={title}
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 flex flex-col items-center justify-center gap-4">
                <Tv size={52} className="text-primary opacity-70" />
                <p className="text-white/70 text-sm font-medium">
                  {t("اختر حلقة من القائمة أدناه", "Select an episode below to start watching")}
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── Server Switcher Bar ────────────────────────────────────────── */}
        <div className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 bg-zinc-950 border-t border-white/5 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className={`flex items-center gap-1.5 ${isRTL ? "mr-auto" : "mr-0"}`}>
            <Server size={13} className="text-primary" />
            <span className="text-white/50 text-xs font-medium">{t("الخادم:", "Server:")}</span>
          </div>

          {(contentType === "movie" ? MOVIE_SERVERS : TV_SERVERS).map(server => (
            <button
              key={server.id}
              onClick={() => {
                setActiveServer(server.id);
                if (contentType === "movie") setPlayerActive(true);
                else if (playerActive) {
                  // force re-render by staying active
                  setPlayerActive(false);
                  setTimeout(() => setPlayerActive(true), 50);
                }
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 ${
                activeServer === server.id
                  ? "bg-primary text-black border-primary shadow-[0_0_14px_rgba(212,175,55,0.45)]"
                  : "bg-zinc-900 text-white/60 border-white/10 hover:border-primary/50 hover:text-white"
              }`}
            >
              {server.label}
            </button>
          ))}

          {contentType === "movie" && (
            <button
              onClick={() => setPlayerActive(true)}
              className="ms-auto flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-black px-5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-[0_0_12px_rgba(212,175,55,0.3)]"
            >
              <Play size={11} fill="currentColor" />
              {t("شاهد الآن", "Watch Now")}
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          METADATA SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <div className={`px-4 md:px-8 py-5 max-w-5xl ${isRTL ? "ml-auto text-right" : ""}`}>
        <div className={`flex items-start gap-5 ${isRTL ? "flex-row-reverse" : ""}`}>

          {/* Poster thumbnail */}
          {poster && (
            <img
              src={poster}
              alt={title}
              className="hidden md:block w-28 lg:w-36 rounded-xl border border-white/10 flex-shrink-0 shadow-2xl"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className={`flex items-start justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">{title}</h1>

                {/* Meta badges */}
                <div className={`flex flex-wrap items-center gap-2 mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                  {data.vote_average && data.vote_average > 0 ? (
                    <span className="flex items-center gap-1 text-primary font-bold text-sm">
                      <Star size={13} fill="currentColor" />{data.vote_average.toFixed(1)}
                    </span>
                  ) : null}
                  {year && (
                    <span className="flex items-center gap-1 text-white/55 text-sm">
                      <Calendar size={12} />{year}
                    </span>
                  )}
                  {data.runtime ? (
                    <span className="flex items-center gap-1 text-white/55 text-sm">
                      <Clock size={12} />{data.runtime} {t("دق", "min")}
                    </span>
                  ) : null}
                  {contentType === "tv" && data.number_of_seasons ? (
                    <span className="text-white/55 text-xs">
                      {data.number_of_seasons} {t("موسم", "seasons")}
                    </span>
                  ) : null}
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                    contentType === "tv"
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      : "bg-primary/15 text-primary border-primary/30"
                  }`}>
                    {contentType === "tv" ? t("مسلسل", "TV Series") : t("فيلم", "Movie")}
                  </span>
                </div>

                {/* Genres */}
                {genres.length > 0 && (
                  <div className={`flex flex-wrap gap-2 mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    {genres.map(g => (
                      <span key={g} className="bg-zinc-800/80 text-white/65 text-xs px-3 py-1 rounded-full border border-white/8">
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Overview */}
                {data.overview && (
                  <p className="text-white/65 text-sm leading-relaxed max-w-2xl line-clamp-4">{data.overview}</p>
                )}
              </div>

              {/* Bookmark button */}
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

      {/* ══════════════════════════════════════════════════════════════════
          TV: SEASONS & EPISODES
      ══════════════════════════════════════════════════════════════════ */}
      {contentType === "tv" && validSeasons.length > 0 && (
        <div className="px-4 md:px-8 pb-8">
          <div className="border-t border-white/8 pt-6">
            <div className={`flex items-center justify-between mb-5 ${isRTL ? "flex-row-reverse" : ""}`}>
              <h2 className="text-lg font-bold text-white">{t("الحلقات", "Episodes")}</h2>

              {/* Season dropdown */}
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
                          setPlayerActive(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-zinc-800 ${
                          selectedSeason === s.season_number
                            ? "text-primary font-semibold bg-primary/10"
                            : "text-white/80"
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

            {/* Episode cards */}
            {episodesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-28 bg-zinc-900 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : episodes.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">{t("لا توجد حلقات", "No episodes found")}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {episodes.map(ep => {
                  const isPlaying = playerActive && selectedEpisode === ep.episode_number;
                  const still = ep.still_path ? `${TMDB_W300}${ep.still_path}` : null;

                  return (
                    <button
                      key={ep.id}
                      onClick={() => handleEpisodePlay(ep.episode_number)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all duration-200 group/ep hover:scale-[1.01] ${
                        isPlaying
                          ? "bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                          : "bg-zinc-900/70 border-white/6 hover:border-primary/30 hover:bg-zinc-900"
                      }`}
                    >
                      {/* Still image */}
                      <div
                        className="relative flex-shrink-0 w-28 rounded-xl overflow-hidden bg-zinc-800"
                        style={{ aspectRatio: "16/9" }}
                      >
                        {still ? (
                          <img src={still} alt={ep.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Tv size={22} className="text-white/20" />
                          </div>
                        )}
                        {/* Play overlay */}
                        <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${isPlaying ? "opacity-100" : "opacity-0 group-hover/ep:opacity-100"}`}>
                          <div className="w-9 h-9 rounded-full bg-primary shadow-[0_0_16px_rgba(212,175,55,0.5)] flex items-center justify-center">
                            <Play size={13} fill="black" className="ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Episode info */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className={`flex items-center gap-2 mb-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isPlaying ? "bg-primary text-black" : "bg-zinc-800 text-white/50"
                          }`}>
                            {t("ح", "E")}{ep.episode_number}
                          </span>
                          {isPlaying && (
                            <span className="text-primary text-[11px] font-semibold animate-pulse">
                              {t("يعرض الآن ●", "Now Playing ●")}
                            </span>
                          )}
                          {ep.runtime ? (
                            <span className="text-white/30 text-[10px] ms-auto">{ep.runtime}{t("د", "m")}</span>
                          ) : null}
                        </div>
                        <p className="text-white text-sm font-semibold line-clamp-1 mb-1">{ep.name}</p>
                        {ep.overview && (
                          <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{ep.overview}</p>
                        )}
                        {ep.vote_average && ep.vote_average > 0 ? (
                          <p className="flex items-center gap-1 text-primary text-[10px] mt-1.5">
                            <Star size={8} fill="currentColor" />{ep.vote_average.toFixed(1)}
                          </p>
                        ) : null}
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
