import { useState } from "react";
import {
  useGetFeaturedContent,
  useGetTmdbTrending,
  useListAds,
  useListContent,
} from "@workspace/api-client-react";
import { HeroSlider } from "@/components/hero-slider";
import { AnnouncementTicker } from "@/components/announcement-ticker";
import { CategoryRow } from "@/components/category-row";
import { GenreBar, GenreMoviesRow } from "@/components/genre-bar";
import { useLang } from "@/lib/language";
import { Skeleton } from "@/components/ui/skeleton";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export default function HomePage() {
  const { t } = useLang();
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [selectedGenreName, setSelectedGenreName] = useState("");

  const { data: featured, isLoading: featLoading } = useGetFeaturedContent();
  const { data: trending } = useGetTmdbTrending();
  const { data: ads } = useListAds();
  const { data: allContent } = useListContent();

  // Hero items: DB featured → TMDB trending fallback
  const heroItems =
    featured && featured.length > 0
      ? featured
      : (trending?.results || []).slice(0, 5).map((m: any) => ({
          id: m.id,
          title: m.title || m.name || "",
          titleAr: null,
          description: m.overview,
          descriptionAr: null,
          backdropUrl: m.backdrop_path
            ? `https://image.tmdb.org/t/p/original${m.backdrop_path}`
            : null,
          posterUrl: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
          rating: m.vote_average,
          year: m.release_date ? new Date(m.release_date).getFullYear() : null,
          quality: "4K",
        }));

  const bannerAds = (ads || []).filter((a) => a.type === "banner");
  const movies = (allContent || []).filter((c) => c.type === "movie");
  const series = (allContent || []).filter((c) => c.type === "series");

  // TMDB trending row items (use TMDB id directly for navigation)
  const tmdbRow = (trending?.results || []).slice(0, 20).map((m: any) => ({
    id: m.id,
    title: m.title || m.name || "",
    titleAr: null as null,
    posterUrl: null as null,
    rating: m.vote_average as number,
    year: m.release_date
      ? (new Date(m.release_date).getFullYear() as number)
      : (null as null),
    type: (m.media_type || "movie") as string,
    quality: "HD" as string,
    poster_path: m.poster_path as string,
  }));

  const handleGenreSelect = (id: number | null, name: string) => {
    setSelectedGenreId(id);
    setSelectedGenreName(name);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AnnouncementTicker />

      {/* Hero slider */}
      {featLoading ? (
        <div className="w-full h-[75vh] bg-zinc-900 animate-pulse" />
      ) : (
        <HeroSlider items={heroItems} />
      )}

      {/* Ad banners */}
      {bannerAds.length > 0 && (
        <div className="px-4 md:px-8 py-4">
          <div
            className="flex gap-3 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {bannerAds.map((ad) => (
              <a
                key={ad.id}
                href={ad.linkUrl || "#"}
                data-testid={`ad-banner-${ad.id}`}
                className="flex-shrink-0 rounded-xl overflow-hidden border border-primary/20 hover:border-primary/60 transition-colors"
                style={{ width: 280, height: 90 }}
              >
                {ad.imageUrl ? (
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-zinc-900 to-zinc-800">
                    <span className="text-primary font-semibold text-sm">
                      {ad.title}
                    </span>
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="pb-24 md:pb-8 pt-4">
        {/* Genre bar — always visible */}
        <GenreBar
          selectedGenreId={selectedGenreId}
          onSelectGenre={handleGenreSelect}
        />

        {/* Genre-filtered movies from TMDB */}
        {selectedGenreId !== null && (
          <GenreMoviesRow
            genreId={selectedGenreId}
            genreName={selectedGenreName}
          />
        )}

        {/* Default content rows (shown when no genre selected) */}
        {selectedGenreId === null && (
          <>
            {movies.length > 0 && (
              <CategoryRow titleAr="أفلام" titleEn="Movies" items={movies} />
            )}

            {series.length > 0 && (
              <CategoryRow
                titleAr="مسلسلات"
                titleEn="Series"
                items={series}
              />
            )}

            {/* TMDB Trending */}
            {tmdbRow.length > 0 && (
              <CategoryRow
                titleAr="الأكثر رواجاً"
                titleEn="Trending Now"
                items={tmdbRow}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
