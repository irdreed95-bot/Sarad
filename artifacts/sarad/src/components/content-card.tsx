import { useState } from "react";
import { useLocation } from "wouter";
import { Star, Bookmark, BookmarkCheck, Play } from "lucide-react";
import { isInList, addToList, removeFromList } from "@/lib/auth";
import { useLang } from "@/lib/language";

interface ContentCardProps {
  id: number;
  title: string;
  titleAr?: string | null;
  posterUrl?: string | null;
  rating?: number | null;
  year?: number | null;
  type?: string;
  quality?: string | null;
  tmdbId?: number | null;
  tmdbPoster?: string | null;
}

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export function ContentCard({
  id,
  title,
  titleAr,
  posterUrl,
  rating,
  year,
  type,
  quality,
  tmdbId,
  tmdbPoster,
}: ContentCardProps) {
  const [, navigate] = useLocation();
  const { t } = useLang();
  const [bookmarked, setBookmarked] = useState(() => isInList(id));
  const [imgError, setImgError] = useState(false);

  const poster = imgError
    ? null
    : posterUrl || (tmdbPoster ? `${TMDB_IMG}${tmdbPoster}` : null);

  const displayTitle = t(titleAr || title, title);

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookmarked) {
      removeFromList(id);
    } else {
      addToList(id);
    }
    setBookmarked(!bookmarked);
  };

  return (
    <div
      data-testid={`card-content-${id}`}
      className="relative flex-shrink-0 w-36 md:w-44 cursor-pointer group rounded-lg overflow-hidden"
      onClick={() => navigate(`/watch/${id}`)}
      style={{ aspectRatio: "2/3" }}
    >
      {/* Poster */}
      <div className="absolute inset-0 bg-card">
        {poster ? (
          <img
            src={poster}
            alt={displayTitle}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <span className="text-muted-foreground text-xs text-center px-2">{displayTitle}</span>
          </div>
        )}
      </div>

      {/* Quality badge */}
      {quality && (
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded z-10">
          {quality}
        </div>
      )}

      {/* Bookmark */}
      <button
        data-testid={`button-bookmark-${id}`}
        onClick={toggleBookmark}
        className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {bookmarked ? <BookmarkCheck size={14} className="text-primary" /> : <Bookmark size={14} />}
      </button>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3 z-10">
        <p className="text-white text-xs font-semibold line-clamp-2 mb-1">{displayTitle}</p>
        <div className="flex items-center gap-2">
          {rating && (
            <span className="flex items-center gap-0.5 text-[10px] text-primary">
              <Star size={10} fill="currentColor" />
              {rating.toFixed(1)}
            </span>
          )}
          {year && <span className="text-[10px] text-zinc-300">{year}</span>}
        </div>
        <div className="mt-2 flex items-center justify-center w-8 h-8 rounded-full bg-primary/90 text-primary-foreground mx-auto">
          <Play size={14} fill="currentColor" />
        </div>
      </div>

      {/* Gold shimmer border on hover */}
      <div className="absolute inset-0 rounded-lg border border-transparent group-hover:border-primary/50 transition-colors duration-300 pointer-events-none z-20" />
    </div>
  );
}
