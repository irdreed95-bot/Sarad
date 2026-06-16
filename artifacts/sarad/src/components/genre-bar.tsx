import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clapperboard, Star } from "lucide-react";
import { useLocation } from "wouter";
import { useLang }       from "@/lib/language";
import { fetchDiscover } from "@/lib/tmdb";

const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

export const GENRES = [
  { id: 28, nameAr: "أكشن", nameEn: "Action", emoji: "⚡" },
  { id: 35, nameAr: "كوميديا", nameEn: "Comedy", emoji: "😂" },
  { id: 27, nameAr: "رعب", nameEn: "Horror", emoji: "👻" },
  { id: 878, nameAr: "خيال علمي", nameEn: "Sci-Fi", emoji: "🚀" },
  { id: 10749, nameAr: "رومانسي", nameEn: "Romance", emoji: "💕" },
  { id: 18, nameAr: "دراما", nameEn: "Drama", emoji: "🎭" },
  { id: 80, nameAr: "جريمة", nameEn: "Crime", emoji: "🔍" },
  { id: 53, nameAr: "إثارة", nameEn: "Thriller", emoji: "🔥" },
  { id: 12, nameAr: "مغامرة", nameEn: "Adventure", emoji: "🗺️" },
  { id: 16, nameAr: "رسوم متحركة", nameEn: "Animation", emoji: "🎨" },
  { id: 99, nameAr: "وثائقي", nameEn: "Documentary", emoji: "🎬" },
  { id: 14, nameAr: "فانتازيا", nameEn: "Fantasy", emoji: "🧙" },
];

interface GenreBarProps {
  selectedGenreId: number | null;
  onSelectGenre: (id: number | null, name: string) => void;
}

export function GenreBar({ selectedGenreId, onSelectGenre }: GenreBarProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { t, isRTL } = useLang();

  const scroll = (dir: "left" | "right") => {
    rowRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
  };

  return (
    <div className="mb-4 group/genrebar">
      <h2
        className={`text-lg font-bold text-white mb-4 px-4 md:px-8 flex items-center gap-2 ${
          isRTL ? "flex-row-reverse text-right" : ""
        }`}
      >
        <Clapperboard size={18} className="text-primary" />
        {t("تصفح حسب النوع", "Browse by Genre")}
      </h2>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/80 text-white opacity-0 group-hover/genrebar:opacity-100 transition-opacity hidden md:flex"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/80 text-white opacity-0 group-hover/genrebar:opacity-100 transition-opacity hidden md:flex"
        >
          <ChevronRight size={16} />
        </button>

        <div
          ref={rowRef}
          className="flex gap-2 overflow-x-auto px-4 md:px-8 pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {/* All chip */}
          <button
            data-testid="genre-chip-all"
            onClick={() => onSelectGenre(null, "")}
            className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200 whitespace-nowrap ${
              selectedGenreId === null
                ? "bg-primary text-primary-foreground border-primary shadow-[0_0_16px_rgba(212,175,55,0.35)]"
                : "bg-zinc-900 text-white/70 border-white/10 hover:border-primary/40 hover:text-white"
            }`}
          >
            {t("الكل", "All")}
          </button>

          {GENRES.map(({ id, nameAr, nameEn, emoji }) => (
            <button
              key={id}
              data-testid={`genre-chip-${id}`}
              onClick={() => onSelectGenre(id, t(nameAr, nameEn))}
              className={`flex-shrink-0 flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200 whitespace-nowrap ${
                selectedGenreId === id
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_16px_rgba(212,175,55,0.35)]"
                  : "bg-zinc-900 text-white/70 border-white/10 hover:border-primary/40 hover:text-white"
            }`}
            >
              <span aria-hidden>{emoji}</span>
              {t(nameAr, nameEn)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface GenreMoviesRowProps {
  genreId: number;
  genreName: string;
}

interface TmdbMovie {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
}

export function GenreMoviesRow({ genreId, genreName }: GenreMoviesRowProps) {
  const [movies, setMovies] = useState<TmdbMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const rowRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { isRTL } = useLang();

  useEffect(() => {
    setLoading(true);
    setMovies([]);
    fetchDiscover(genreId)
      .then((data) => {
        // 🛡️ الحماية الأساسية هنا: التأكد من أن النتائج مصفوفة صالحة قبل خزنها
        const safeMovies = Array.isArray(data?.results) ? data.results : [];
        setMovies(safeMovies);
      })
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [genreId]);

  const scroll = (dir: "left" | "right") => {
    rowRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="mb-8">
        <div className="h-6 w-40 bg-zinc-900 rounded animate-pulse mb-4 mx-4 md:mx-8" />
        <div className="flex gap-3 overflow-hidden px-4 md:px-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-36 bg-zinc-900 rounded-lg animate-pulse"
              style={{ aspectRatio: "2/3" }}
            />
          ))}
        </div>
      </div>
    );
  }

  // 🛡️ حماية العرض: إذا كانت المصفوفة فارغة أو غير صالحة لا تعرض شيئاً لتجنب الكراش
  if (!Array.isArray(movies) || movies.length === 0) return null;

  return (
    <div className="mb-8 group/genrerow">
      <h2
        className={`text-lg font-bold text-white mb-4 px-4 md:px-8 ${
          isRTL ? "text-right" : ""
        }`}
      >
        {genreName}
      </h2>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/80 text-white opacity-0 group-hover/genrerow:opacity-100 transition-opacity hidden md:flex"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/80 text-white opacity-0 group-hover/genrerow:opacity-100 transition-opacity hidden md:flex"
        >
          <ChevronRight size={18} />
        </button>

        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {movies.map((m) => (
            <button
              key={m?.id}
              data-testid={`genre-movie-${m?.id}`}
              onClick={() => navigate(`/watch/${m?.id}`)}
              className="relative flex-shrink-0 w-36 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 hover:border-primary/50 hover:scale-105 transition-all duration-200 group/card text-left"
              style={{ aspectRatio: "2/3" }}
            >
              {m?.poster_path ? (
                <img
                  src={`${TMDB_IMG}${m.poster_path}`}
                  alt={m?.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center p-2">
                  <span className="text-white/30 text-xs text-center">{m?.title}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-primary/90 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/60 to-transparent p-2 pt-6">
                <p className="text-white text-xs font-medium line-clamp-2 leading-tight">
                  {m?.title}
                </p>
                {m?.vote_average > 0 && (
                  <p className="flex items-center gap-0.5 text-primary text-[10px] mt-0.5">
                    <Star size={8} fill="currentColor" />
                    {m.vote_average.toFixed(1)}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        <div
          className={`absolute top-0 ${isRTL ? "right-0" : "left-0"} w-8 h-full bg-gradient-to-r from-black to-transparent pointer-events-none`}
        />
        <div
          className={`absolute top-0 ${isRTL ? "left-0" : "right-0"} w-8 h-full bg-gradient-to-l from-black to-transparent pointer-events-none`}
        />
      </div>
    </div>
  );
}
