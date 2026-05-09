import { useState } from "react";
import { Search, X } from "lucide-react";
import { useSearchTmdb, getSearchTmdbQueryKey, useListContent } from "@workspace/api-client-react";
import { ContentCard } from "@/components/content-card";
import { useLang } from "@/lib/language";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";

type FilterType = "all" | "movie" | "series";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const { t, isRTL } = useLang();
  const debouncedQuery = useDebounce(query, 400);

  const { data: tmdbResults, isLoading: tmdbLoading } = useSearchTmdb(
    { query: debouncedQuery, type: "multi" },
    { query: { enabled: debouncedQuery.length > 1, queryKey: getSearchTmdbQueryKey({ query: debouncedQuery, type: "multi" }) } }
  );

  const { data: localContent } = useListContent();

  const localMatches = debouncedQuery.length > 1
    ? (localContent || []).filter((c) =>
        c.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        (c.titleAr && c.titleAr.includes(debouncedQuery))
      )
    : [];

  const tmdbItems = (tmdbResults?.results || [])
    .filter((m: any) => filter === "all" || m.media_type === filter || (filter === "series" && m.media_type === "tv"))
    .slice(0, 20);

  const filterTabs: { key: FilterType; labelAr: string; labelEn: string }[] = [
    { key: "all", labelAr: "الكل", labelEn: "All" },
    { key: "movie", labelAr: "أفلام", labelEn: "Movies" },
    { key: "series", labelAr: "مسلسلات", labelEn: "Series" },
  ];

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-24 md:pb-8 px-4 md:px-8">
      {/* Search bar */}
      <div className="max-w-2xl mx-auto mt-8 mb-8">
        <div className="relative flex items-center">
          <Search className="absolute start-4 text-white/40" size={20} />
          <input
            data-testid="input-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("ابحث عن فيلم أو مسلسل...", "Search for a movie or series...")}
            className={`w-full bg-zinc-900 border border-white/10 rounded-xl py-4 text-white placeholder-white/40 focus:outline-none focus:border-primary/50 transition-colors ${isRTL ? "pr-12 pl-12 text-right" : "pl-12 pr-12"}`}
          />
          {query && (
            <button
              data-testid="button-clear-search"
              onClick={() => setQuery("")}
              className="absolute end-4 text-white/40 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className={`flex gap-2 mb-6 ${isRTL ? "justify-end" : "justify-start"}`}>
        {filterTabs.map(({ key, labelAr, labelEn }) => (
          <button
            key={key}
            data-testid={`button-filter-${key}`}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === key ? "bg-primary text-primary-foreground" : "bg-zinc-900 text-white/60 hover:text-white border border-white/10"}`}
          >
            {t(labelAr, labelEn)}
          </button>
        ))}
      </div>

      {/* Local matches */}
      {localMatches.length > 0 && (
        <div className="mb-8">
          <h3 className={`text-base font-semibold text-white/80 mb-4 ${isRTL ? "text-right" : "text-left"}`}>
            {t("من مكتبتنا", "From Our Library")}
          </h3>
          <div className="flex flex-wrap gap-3">
            {localMatches.map((item) => (
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
              />
            ))}
          </div>
        </div>
      )}

      {/* TMDB results */}
      {debouncedQuery.length > 1 && (
        <div>
          <h3 className={`text-base font-semibold text-white/80 mb-4 ${isRTL ? "text-right" : "text-left"}`}>
            {t("نتائج البحث", "Search Results")}
          </h3>
          {tmdbLoading ? (
            <div className="flex flex-wrap gap-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="w-36 h-52 rounded-lg bg-zinc-900" />
              ))}
            </div>
          ) : tmdbItems.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {tmdbItems.map((m: any) => (
                <div
                  key={m.id}
                  data-testid={`card-tmdb-${m.id}`}
                  className="relative flex-shrink-0 w-36 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 hover:border-primary/40 transition-colors cursor-pointer"
                  style={{ aspectRatio: "2/3" }}
                >
                  {m.poster_path ? (
                    <img
                      src={`${TMDB_IMG}${m.poster_path}`}
                      alt={m.title || m.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2">
                      <span className="text-white/40 text-xs text-center">{m.title || m.name}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <p className="text-white text-xs font-medium line-clamp-2">{m.title || m.name}</p>
                    {m.vote_average > 0 && (
                      <p className="text-primary text-[10px] mt-0.5">{m.vote_average.toFixed(1)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/40 text-sm">{t("لا توجد نتائج", "No results found")}</p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!debouncedQuery && (
        <div className="flex flex-col items-center justify-center mt-20 text-center">
          <Search size={48} className="text-white/20 mb-4" />
          <p className="text-white/40 text-lg">{t("ابدأ بالبحث عن محتوى", "Start searching for content")}</p>
          <p className="text-white/25 text-sm mt-1">{t("أفلام، مسلسلات، وأكثر", "Movies, series, and more")}</p>
        </div>
      )}
    </div>
  );
}
