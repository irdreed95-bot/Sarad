import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { ContentCard } from "./content-card";
import { useLang } from "@/lib/language";

interface Item {
  id: number;
  title: string;
  titleAr?: string | null;
  posterUrl?: string | null;
  rating?: number | null;
  year?: number | null;
  type?: string;
  quality?: string | null;
  tmdbId?: number | null;
  poster_path?: string | null;
}

interface CategoryRowProps {
  titleAr: string;
  titleEn: string;
  items: Item[];
}

export function CategoryRow({ titleAr, titleEn, items }: CategoryRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { t, isRTL } = useLang();

  const scroll = (dir: "left" | "right") => {
    const el = rowRef.current;
    if (!el) return;
    const amount = 300;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <div className="mb-8 group/row">
      <h2 className={`text-lg font-bold text-white mb-4 px-4 md:px-8 ${isRTL ? "text-right" : "text-left"}`}>
        {t(titleAr, titleEn)}
        <span className="text-primary/60 ms-2 text-sm font-normal">{t("يستعرض الكل", "View All")}</span>
      </h2>
      <div className="relative">
        {/* Scroll buttons */}
        <button
          data-testid={`button-scroll-left-${titleEn.toLowerCase().replace(/\s/g, "-")}`}
          onClick={() => scroll("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          data-testid={`button-scroll-right-${titleEn.toLowerCase().replace(/\s/g, "-")}`}
          onClick={() => scroll("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/80 text-white opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-black"
        >
          <ChevronRight size={18} />
        </button>

        {/* Row */}
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item) => (
            <ContentCard
              key={item.id}
              id={item.id}
              title={item.title}
              titleAr={item.titleAr}
              posterUrl={item.posterUrl}
              rating={item.rating}
              year={item.year}
              type={item.type}
              quality={item.quality}
              tmdbId={item.tmdbId}
              tmdbPoster={item.poster_path}
            />
          ))}
        </div>

        {/* Fade edges */}
        <div className={`absolute top-0 ${isRTL ? "right-0" : "left-0"} w-8 h-full bg-gradient-to-r from-black to-transparent pointer-events-none z-5`} />
        <div className={`absolute top-0 ${isRTL ? "left-0" : "right-0"} w-8 h-full bg-gradient-to-l from-black to-transparent pointer-events-none z-5`} />
      </div>
    </div>
  );
}
