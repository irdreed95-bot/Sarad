import { useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Star, Clock, Calendar, Bookmark, BookmarkCheck } from "lucide-react";
import { useGetContent, getGetContentQueryKey } from "@workspace/api-client-react";
import { useLang } from "@/lib/language";
import { isInList, addToList, removeFromList } from "@/lib/auth";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { t, isRTL } = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const contentId = parseInt(id || "0", 10);
  const [bookmarked, setBookmarked] = useState(() => isInList(contentId));

  const { data: content, isLoading } = useGetContent(contentId, {
    query: { enabled: !!contentId, queryKey: getGetContentQueryKey(contentId) }
  });

  useEffect(() => {
    if (!content?.videoUrl || !videoRef.current) return;

    let player: any = null;

    import("video.js").then((videojs) => {
      const vjs = videojs.default;
      const isHls = content.videoUrl!.includes(".m3u8");
      player = vjs(videoRef.current!, {
        controls: true,
        autoplay: false,
        preload: "auto",
        fluid: true,
        responsive: true,
        sources: [{
          src: content.videoUrl!,
          type: isHls ? "application/x-mpegURL" : "video/mp4",
        }],
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
      });
      playerRef.current = player;
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [content?.videoUrl]);

  useEffect(() => {
    // Import video.js CSS dynamically
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/video.js@8/dist/video-js.min.css";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const toggleBookmark = () => {
    if (bookmarked) removeFromList(contentId);
    else addToList(contentId);
    setBookmarked(!bookmarked);
  };

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

  if (!content) {
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

  const genres = content.genres?.split(",").map((g) => g.trim()).filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-black text-white pb-24 md:pb-8">
      {/* Back button */}
      <div className="fixed top-4 left-4 z-50 md:top-6 md:left-8">
        <button
          data-testid="button-back"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-full text-white/80 hover:text-white transition-colors border border-white/10"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">{t("رجوع", "Back")}</span>
        </button>
      </div>

      {/* Player */}
      <div className="w-full bg-black">
        {content.videoUrl ? (
          <div data-vjs-player className="w-full">
            <video
              ref={videoRef}
              className="video-js vjs-big-play-centered vjs-theme-fantasy"
              style={{ width: "100%", minHeight: 280 }}
              poster={content.backdropUrl || content.posterUrl || undefined}
            />
          </div>
        ) : (
          <div
            className="w-full flex flex-col items-center justify-center bg-zinc-950 border-b border-white/5"
            style={{ minHeight: 320, aspectRatio: "16/9", maxHeight: 500 }}
          >
            {(content.backdropUrl || content.posterUrl) && (
              <img
                src={content.backdropUrl || content.posterUrl || ""}
                alt={content.title}
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
            )}
            <div className="relative text-center px-8">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-white/40">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-white/50 text-base">{t("الفيديو غير متاح حالياً", "Video not available yet")}</p>
              <p className="text-white/30 text-sm mt-1">{t("يرجى المراجعة لاحقاً", "Please check back later")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className={`px-4 md:px-8 py-6 max-w-4xl ${isRTL ? "text-right ml-auto" : "text-left"}`}>
        <div className={`flex items-start justify-between gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {t(content.titleAr || content.title, content.title)}
            </h1>

            <div className={`flex flex-wrap items-center gap-3 mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              {content.rating && (
                <span className="flex items-center gap-1 text-primary font-semibold text-sm">
                  <Star size={14} fill="currentColor" />
                  {content.rating.toFixed(1)}
                </span>
              )}
              {content.year && (
                <span className="flex items-center gap-1 text-white/60 text-sm">
                  <Calendar size={14} />
                  {content.year}
                </span>
              )}
              {content.duration && (
                <span className="flex items-center gap-1 text-white/60 text-sm">
                  <Clock size={14} />
                  {content.duration} {t("دقيقة", "min")}
                </span>
              )}
              {content.quality && (
                <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">
                  {content.quality}
                </span>
              )}
            </div>

            {/* Genre badges */}
            {genres.length > 0 && (
              <div className={`flex flex-wrap gap-2 mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                {genres.map((g) => (
                  <span key={g} className="bg-zinc-800 text-white/70 text-xs px-3 py-1 rounded-full border border-white/10">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {(content.description || content.descriptionAr) && (
              <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
                {t(content.descriptionAr || content.description || "", content.description || "")}
              </p>
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
              : <Bookmark size={22} className="text-white/60" />
            }
            <span className="text-[10px] text-white/50">{t("قائمتي", "My List")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
