import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Star, Play } from "lucide-react";
import { useLang }        from "@/lib/language";
import { fetchCategory }  from "@/lib/tmdb";

const IMG_W780 = "https://image.tmdb.org/t/p/w780";

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

interface TmdbRowProps {
  titleEn: string;
  titleAr: string;
  category: string;
  mediaType?: "movie" | "tv";
}

export function TmdbRow({ titleEn, titleAr, category, mediaType }: TmdbRowProps) {
  const [items, setItems] = useState<TmdbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const rowRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { t, isRTL } = useLang();

  useEffect(() => {
    setLoading(true);
    fetchCategory(category)
      .then(data => {
        // 🛡️ حماية: تأكد أن النتائج عبارة عن مصفوفة صالحة قبل الاستخدام
        const safeResults = Array.isArray(data?.results) ? data.results : [];
        setItems(safeResults.slice(0, 24));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [category]);

  const scroll = (dir: "left" | "right") => {
    rowRef.current?.scrollBy({ left: dir === "left" ? -420 : 420, behavior: "smooth" });
  };

  const handleClick = (item: TmdbItem) => {
    const type = mediaType || item.media_type || "movie";
    navigate(`/watch/${item.id}?type=${type}`);
  };

  if (loading) {
    return (
      <div className="mb-8">
        <div className="h-6 w-52 bg-zinc-900 rounded-md animate-pulse mb-4 mx-4 md:mx-8" />
        <div className="flex gap-3 overflow-hidden px-4 md:px-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-36 md:w-44 bg-zinc-900 rounded-xl animate-pulse" style={{ aspectRatio: "2/3" }} />
          ))}
        </div>
      </div>
    );
  }

  // إذا لم يكن هناك عناصر (أو فشل السيرفر في جلبها)، لا نعرض السطر لتجنب الانهيار
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="mb-8 group/tmdbrow">
      <div className={`flex items-center gap-3 mb-4 px-4 md:px-8 ${isRTL ? "flex-row-reverse" : ""}`}>
        <h2 className="text-lg font-bold text-white">{t(titleAr, titleEn)}</h2>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-black/90 border border-white/10 text-white opacity-0 group-hover/tmdbrow:opacity-100 transition-all duration-200 hidden md:flex hover:bg-zinc-900 hover:border-primary/40 hover:text-primary"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-black/90 border border-white/10 text-white opacity-0 group-hover/tmdbrow:opacity-100 transition-all duration-200 hidden md:flex hover:bg-zinc-900 hover:border-primary/40 hover:text-primary"
        >
          <ChevronRight size={18} />
        </button>

        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          {items.map(item => {
            const title = item?.title || item?.name || "";
            const year = (item?.release_date || item?.first_air_date || "").slice(0, 4);
            const poster = item?.poster_path ? `${IMG_W780}${item.poster_path}` : null;

            return (
              <button
                key={item?.id}
                onClick={() => handleClick(item)}
                className="relative flex-shrink-0 w-36 md:w-44 rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-primary/60 hover:scale-105 transition-all duration-200 group/card text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{ aspectRatio: "2/3" }}
              >
                {poster ? (
                  <img
                    src={poster}
                    alt={title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center p-3">
                    <span className="text-white/30 text-xs text-center leading-tight">{title}</span>
                  </div>
                )}

                {/* Always-visible gradient at bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-8 pb-2 px-2">
                  <p className="text-white text-[11px] font-semibold line-clamp-2 leading-tight">{title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {item?.vote_average && item.vote_average > 0 ? (
                      <span className="flex items-center gap-0.5 text-primary text-[10px]">
                        <Star size={8} fill="currentColor" />
                        {item.vote_average.toFixed(1)}
                      </span>
                    ) : null}
                    {year && <span className="text-white/40 text-[10px]">{year}</span>}
                  </div>
                </div>

                {/* Hover play button */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary shadow-[0_0_20px_rgba(212,175,55,0.6)] flex items-center justify-center">
                    <Play size={14} fill="black" className="ml-0.5" />
                  </div>
                </div>

                {/* Gold border */}
                <div className="absolute inset-0 rounded-xl border border-transparent group-hover/card:border-primary/50 transition-colors duration-300 pointer-events-none" />
              </button>
            );
          })}
        </div>

        <div className={`absolute top-0 ${isRTL ? "right-0" : "left-0"} w-10 h-full bg-gradient-to-r from-black to-transparent pointer-events-none z-[1]`} />
        <div className={`absolute top-0 ${isRTL ? "left-0" : "right-0"} w-10 h-full bg-gradient-to-l from-black to-transparent pointer-events-none z-[1]`} />
      </div>
    </div>
  );
}
