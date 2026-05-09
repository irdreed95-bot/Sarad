import { useGetFeaturedContent, useGetTmdbTrending, useListAds, useGetContentCategories, useListContent } from "@workspace/api-client-react";
import { HeroSlider } from "@/components/hero-slider";
import { AnnouncementTicker } from "@/components/announcement-ticker";
import { CategoryRow } from "@/components/category-row";
import { useLang } from "@/lib/language";
import { Skeleton } from "@/components/ui/skeleton";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export default function HomePage() {
  const { t } = useLang();
  const { data: featured, isLoading: featLoading } = useGetFeaturedContent();
  const { data: trending } = useGetTmdbTrending();
  const { data: ads } = useListAds();
  const { data: categories } = useGetContentCategories();
  const { data: allContent } = useListContent();

  // Hero items: use featured DB content, fall back to TMDB trending
  const heroItems = (featured && featured.length > 0)
    ? featured
    : (trending?.results || []).slice(0, 5).map((m: any) => ({
        id: m.id,
        title: m.title || m.name || "",
        titleAr: null,
        description: m.overview,
        descriptionAr: null,
        backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : null,
        posterUrl: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
        rating: m.vote_average,
        year: m.release_date ? new Date(m.release_date).getFullYear() : null,
        quality: "4K",
      }));

  // Banner ads
  const bannerAds = ads?.filter((a) => a.type === "banner") || [];

  // Content by category
  const movies = (allContent || []).filter((c) => c.type === "movie");
  const series = (allContent || []).filter((c) => c.type === "series");

  // TMDB trending as a row (mapped to ContentCard-compatible shape)
  const tmdbRow = (trending?.results || []).slice(0, 20).map((m: any) => ({
    id: m.id * 1000000 + 1, // avoid collision with DB ids — these are TMDB-only display cards
    title: m.title || m.name || "",
    titleAr: null,
    posterUrl: null,
    rating: m.vote_average,
    year: m.release_date ? new Date(m.release_date).getFullYear() : null,
    type: m.media_type || "movie",
    quality: "HD",
    poster_path: m.poster_path,
  }));

  return (
    <div className="min-h-screen bg-black text-white">
      <AnnouncementTicker />

      {/* Hero */}
      {featLoading ? (
        <div className="w-full h-[75vh] bg-zinc-900 animate-pulse" />
      ) : (
        <HeroSlider items={heroItems} />
      )}

      {/* Ads Banner */}
      {bannerAds.length > 0 && (
        <div className="px-4 md:px-8 py-4">
          <div className="flex gap-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {bannerAds.map((ad) => (
              <a
                key={ad.id}
                href={ad.linkUrl || "#"}
                data-testid={`ad-banner-${ad.id}`}
                className="flex-shrink-0 rounded-xl overflow-hidden border border-primary/20 hover:border-primary/60 transition-colors"
                style={{ width: 280, height: 100 }}
              >
                {ad.imageUrl ? (
                  <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-zinc-900 to-zinc-800">
                    <span className="text-primary font-semibold text-sm">{ad.title}</span>
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="pb-24 md:pb-8 pt-4">
        {/* Movies row */}
        {movies.length > 0 && (
          <CategoryRow
            titleAr="أفلام"
            titleEn="Movies"
            items={movies}
          />
        )}

        {/* Series row */}
        {series.length > 0 && (
          <CategoryRow
            titleAr="مسلسلات"
            titleEn="Series"
            items={series}
          />
        )}

        {/* Category rows */}
        {categories && categories.slice(0, 4).map((cat) => {
          const catItems = (allContent || []).filter(
            (c) => c.genres && c.genres.toLowerCase().includes(cat.name.toLowerCase())
          );
          if (catItems.length < 2) return null;
          return (
            <CategoryRow
              key={cat.name}
              titleAr={cat.name}
              titleEn={cat.name}
              items={catItems}
            />
          );
        })}

        {/* TMDB Trending row */}
        {tmdbRow.length > 0 && (
          <CategoryRow
            titleAr="الأكثر رواجاً"
            titleEn="Trending Now"
            items={tmdbRow}
          />
        )}
      </div>
    </div>
  );
}
