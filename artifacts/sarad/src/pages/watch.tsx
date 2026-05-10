import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Star, Clock, Calendar, Bookmark, BookmarkCheck, Globe } from "lucide-react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { useGetContent, getGetContentQueryKey } from "@workspace/api-client-react";
import { useLang } from "@/lib/language";
import { isInList, addToList, removeFromList } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

// Demo video — WebM/VP9 always supported in Chromium; MP4 as fallback
const DEMO_SOURCES = [
  { src: "/demo.webm", type: "video/webm" },
  { src: "/demo.mp4", type: "video/mp4" },
];
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";
const TMDB_BG = "https://image.tmdb.org/t/p/original";

interface TmdbDetail {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  genres?: { id: number; name: string }[];
}

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { t, isRTL } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  const contentId = parseInt(id || "0", 10);
  const [bookmarked, setBookmarked] = useState(() => isInList(contentId));
  const [tmdbData, setTmdbData] = useState<TmdbDetail | null>(null);
  const [tmdbLoading, setTmdbLoading] = useState(false);

  const { data: content, isLoading: dbLoading } = useGetContent(contentId, {
    query: {
      enabled: !!contentId,
      queryKey: getGetContentQueryKey(contentId),
      retry: false,
    },
  });

  // If not in DB, fetch from TMDB (for search result clicks)
  useEffect(() => {
    if (dbLoading) return;
    if (content) return;
    if (!contentId || contentId <= 0) return;
    setTmdbLoading(true);
    fetch(`/api/tmdb/movie/${contentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        if (data && data.id) {
          setTmdbData(data);
        } else {
          const r2 = await fetch(`/api/tmdb/tv/${contentId}`);
          const tvData = r2.ok ? await r2.json() : null;
          if (tvData && tvData.id) setTmdbData(tvData);
        }
      })
      .catch(() => undefined)
      .finally(() => setTmdbLoading(false));
  }, [content, dbLoading, contentId]);

  // Initialize Video.js player
  useEffect(() => {
    if (!videoRef.current) return;
    // Don't init until we know what source to use
    if (dbLoading || tmdbLoading) return;

    const customUrl = content?.videoUrl;
    const isHls = !!customUrl && customUrl.includes(".m3u8");
    const sources = customUrl
      ? [{ src: customUrl, type: isHls ? "application/x-mpegURL" : "video/mp4" }]
      : DEMO_SOURCES;

    // Dispose any existing player
    if (playerRef.current) {
      try { playerRef.current.dispose(); } catch {}
      playerRef.current = null;
    }

    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      preload: "auto",
      fluid: true,
      responsive: true,
      aspectRatio: "16:9",
      sources,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
    });

    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        try { playerRef.current.dispose(); } catch {}
        playerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.videoUrl, content?.id, tmdbData?.id, dbLoading, tmdbLoading]);

  const toggleBookmark = () => {
    if (bookmarked) removeFromList(contentId);
    else addToList(contentId);
    setBookmarked(!bookmarked);
  };

  const isLoading = dbLoading || tmdbLoading;

  // Build unified display data
  const displayTitle = content
    ? t(content.titleAr || content.title, content.title)
    : (tmdbData?.title || tmdbData?.name || "");
  const displayDescription = content
    ? t(content.descriptionAr || content.description || "", content.description || "")
    : (tmdbData?.overview || "");
  const displayPoster = content?.posterUrl || (tmdbData?.poster_path ? `${TMDB_IMG}${tmdbData.poster_path}` : null);
  const displayBackdrop = content?.backdropUrl || (tmdbData?.backdrop_path ? `${TMDB_BG}${tmdbData.backdrop_path}` : null);
  const displayRating = content?.rating ?? tmdbData?.vote_average;
  const displayYear = content?.year
    ? content.year
    : (() => {
        const d = tmdbData?.release_date || tmdbData?.first_air_date || "";
        return d ? parseInt(d.slice(0, 4)) : null;
      })();
  const displayDuration = content?.duration ?? tmdbData?.runtime ?? tmdbData?.episode_run_time?.[0] ?? null;
  const displayQuality = content?.quality || "HD";
  const genres = content?.genres
    ? content.genres.split(",").map((g) => g.trim()).filter(Boolean)
    : (tmdbData?.genres?.map((g) => g.name) || []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-16">
        <Skeleton className="w-full aspect-video bg-zinc-900" />
        <div className="px-4 md:px-8 py-6 space-y-3">
          <Skeleton className="h-8 w-64 bg-zinc-900" />
          <Skeleton className="h-4 w-96 bg-zinc-900" />
        </div>
      </div>
    );
  }

  if (!content && !tmdbData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-lg mb-4">{t("المحتوى غير متوفر", "Content not available")}</p>
          <button onClick={() => navigate("/")} className="text-primary hover:underline">
            {t("العودة للرئيسية", "Back to Home")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8">
      {/* Back button */}
      <div className="fixed top-4 left-4 z-50 md:top-6 md:left-8">
        <button
          data-testid="button-back"
          onClick={() => history.back()}
          className="flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-full text-white/80 hover:text-white transition-colors border border-white/10"
        >
          <ArrowLeft size={16} />
          <span className="text-sm hidden md:inline">{t("رجوع", "Back")}</span>
        </button>
      </div>

      {/* Video.js Player */}
      <div className="w-full bg-black pt-12 md:pt-0">
        <div data-vjs-player>
          <video
            ref={videoRef}
            className="video-js vjs-big-play-centered"
            poster={displayBackdrop || displayPoster || undefined}
          />
        </div>
        {!content?.videoUrl && (
          <div className="bg-zinc-900/80 border-t border-white/5 px-4 py-2 flex items-center gap-2">
            <Globe size={12} className="text-primary flex-shrink-0" />
            <p className="text-white/40 text-xs">
              {t(
                "يتم تشغيل فيديو تجريبي — أضف رابط فيديو حقيقي من لوحة التحكم",
                "Playing demo stream — add a real video URL from the admin dashboard"
              )}
            </p>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className={`px-4 md:px-8 py-6 max-w-4xl ${isRTL ? "mr-0 ml-auto text-right" : ""}`}>
        <div className={`flex items-start justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
              {displayTitle}
            </h1>

            <div className={`flex flex-wrap items-center gap-3 mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              {displayRating && displayRating > 0 ? (
                <span className="flex items-center gap-1 text-primary font-semibold text-sm">
                  <Star size={14} fill="currentColor" />
                  {displayRating.toFixed(1)}
                </span>
              ) : null}
              {displayYear && (
                <span className="flex items-center gap-1 text-white/60 text-sm">
                  <Calendar size={14} />
                  {displayYear}
                </span>
              )}
              {displayDuration && (
                <span className="flex items-center gap-1 text-white/60 text-sm">
                  <Clock size={14} />
                  {displayDuration} {t("دقيقة", "min")}
                </span>
              )}
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">
                {displayQuality}
              </span>
            </div>

            {genres.length > 0 && (
              <div className={`flex flex-wrap gap-2 mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                {genres.map((g) => (
                  <span key={g} className="bg-zinc-800 text-white/70 text-xs px-3 py-1 rounded-full border border-white/10">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {displayDescription && (
              <p className="text-white/70 text-sm leading-relaxed max-w-2xl">{displayDescription}</p>
            )}
          </div>

          {/* Bookmark */}
          <button
            data-testid="button-bookmark-watch"
            onClick={toggleBookmark}
            className="flex-shrink-0 flex flex-col items-center gap-1 p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors border border-white/10"
          >
            {bookmarked
              ? <BookmarkCheck size={22} className="text-primary" />
              : <Bookmark size={22} className="text-white/60" />}
            <span className="text-[10px] text-white/50">{t("قائمتي", "My List")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
