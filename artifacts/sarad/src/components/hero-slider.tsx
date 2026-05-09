import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Play, Info, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/language";

interface SlideItem {
  id: number;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  backdropUrl?: string | null;
  posterUrl?: string | null;
  rating?: number | null;
  year?: number | null;
  genres?: string | null;
  quality?: string | null;
  isTmdb?: boolean;
}

const TMDB_BG = "https://image.tmdb.org/t/p/original";

export function HeroSlider({ items }: { items: SlideItem[] }) {
  const [index, setIndex] = useState(0);
  const [, navigate] = useLocation();
  const { t, isRTL } = useLang();

  const next = useCallback(() => setIndex((i) => (i + 1) % items.length), [items.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + items.length) % items.length), [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, items.length]);

  if (!items.length) return null;

  const item = items[index];
  const bg = item.backdropUrl || (item.posterUrl?.startsWith("http") ? item.posterUrl : null);

  return (
    <div className="relative w-full h-[75vh] min-h-[500px] overflow-hidden bg-zinc-950">
      {/* Background */}
      <AnimatePresence mode="crossfade">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {bg && (
            <img
              src={bg.startsWith("/") ? `${TMDB_BG}${bg}` : bg}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          )}
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
          <div className={`absolute inset-0 bg-gradient-to-r ${isRTL ? "from-black via-black/40 to-transparent" : "from-black via-black/40 to-transparent"}`} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 flex items-end pb-16 md:pb-20">
        <div className={`px-6 md:px-16 max-w-2xl ${isRTL ? "text-right" : "text-left"}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
            >
              {/* Quality badge */}
              {item.quality && (
                <span className="inline-block bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded mb-3">
                  {item.quality}
                </span>
              )}

              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 leading-tight">
                {t(item.titleAr || item.title, item.title)}
              </h1>

              <div className={`flex items-center gap-3 mb-4 ${isRTL ? "flex-row-reverse justify-end" : ""}`}>
                {item.rating && (
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <Star size={14} fill="currentColor" />
                    {item.rating.toFixed(1)}
                  </span>
                )}
                {item.year && <span className="text-white/60 text-sm">{item.year}</span>}
                {item.genres && (
                  <span className="text-white/50 text-sm">{item.genres.split(",")[0]?.trim()}</span>
                )}
              </div>

              {(item.description || item.descriptionAr) && (
                <p className="text-white/70 text-sm md:text-base line-clamp-3 mb-6 max-w-lg">
                  {t(item.descriptionAr || "", item.description || "")}
                </p>
              )}

              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <button
                  data-testid={`button-watch-${item.id}`}
                  onClick={() => navigate(`/watch/${item.id}`)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  <Play size={16} fill="currentColor" />
                  {t("شاهد الآن", "Watch Now")}
                </button>
                <button
                  data-testid={`button-info-${item.id}`}
                  onClick={() => navigate(`/watch/${item.id}`)}
                  className="flex items-center gap-2 bg-white/10 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/20"
                >
                  <Info size={16} />
                  {t("مزيد من التفاصيل", "More Info")}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Arrows */}
      {items.length > 1 && (
        <>
          <button
            data-testid="button-hero-prev"
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors hidden md:flex"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            data-testid="button-hero-next"
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors hidden md:flex"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              data-testid={`button-dot-${i}`}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all duration-300 ${i === index ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-white/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
