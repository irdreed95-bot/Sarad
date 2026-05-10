import { useGetFeaturedContent, useGetTmdbTrending, useListAds } from "@workspace/api-client-react";
import { HeroSlider } from "@/components/hero-slider";
import { AnnouncementTicker } from "@/components/announcement-ticker";
import { TmdbRow } from "@/components/tmdb-row";
import { useLang } from "@/lib/language";
import { getCustomAds } from "@/lib/admin-store";

const TMDB_BG = "https://image.tmdb.org/t/p/original";
const TMDB_W780 = "https://image.tmdb.org/t/p/w780";

export default function HomePage() {
  const { t } = useLang();
  const { data: featured } = useGetFeaturedContent();
  const { data: trending } = useGetTmdbTrending();
  const { data: dbAds } = useListAds();
  const customAds = getCustomAds().filter(a => a.isActive && a.imageUrl);

  // Hero: DB featured items → TMDB trending fallback
  const heroItems =
    featured && featured.length > 0
      ? featured
      : (trending?.results || []).slice(0, 5).map((m: any) => ({
          id: m.id,
          title: m.title || m.name || "",
          titleAr: null,
          description: m.overview,
          descriptionAr: null,
          backdropUrl: m.backdrop_path ? `${TMDB_BG}${m.backdrop_path}` : null,
          posterUrl: m.poster_path ? `${TMDB_W780}${m.poster_path}` : null,
          rating: m.vote_average,
          year: (() => {
            const d = m.release_date || m.first_air_date || "";
            return d ? parseInt(d.slice(0, 4)) : null;
          })(),
          quality: "4K",
        }));

  const bannerAds = [
    ...(dbAds || []).filter(a => a.type === "banner"),
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <AnnouncementTicker />

      {/* Hero Slider */}
      <HeroSlider items={heroItems} />

      {/* Ad Banners */}
      {(bannerAds.length > 0 || customAds.length > 0) && (
        <div className="px-4 md:px-8 py-5">
          <div
            className="flex gap-3 overflow-x-auto"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}
          >
            {bannerAds.map(ad => (
              <a
                key={ad.id}
                href={ad.linkUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 rounded-2xl overflow-hidden border border-primary/20 hover:border-primary/60 transition-colors shadow-lg"
                style={{ width: 320, height: 100 }}
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
            {customAds.map(ad => (
              <a
                key={ad.id}
                href={ad.linkUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 rounded-2xl overflow-hidden border border-primary/20 hover:border-primary/60 transition-colors shadow-lg"
                style={{ width: 320, height: 100 }}
              >
                <img src={ad.imageUrl!} alt={ad.title} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ===== NETFLIX-STYLE CONTENT ROWS ===== */}
      <div className="pb-28 md:pb-10 pt-4 space-y-1">
        <TmdbRow
          titleEn="🔥 Trending Now"
          titleAr="🔥 الأكثر رواجاً الآن"
          category="trending"
        />
        <TmdbRow
          titleEn="⚡ Action & Adventure"
          titleAr="⚡ أكشن ومغامرات"
          category="action"
          mediaType="movie"
        />
        <TmdbRow
          titleEn="👻 Horror"
          titleAr="👻 رعب"
          category="horror"
          mediaType="movie"
        />
        <TmdbRow
          titleEn="😂 Comedy"
          titleAr="😂 كوميديا"
          category="comedy"
          mediaType="movie"
        />
        <TmdbRow
          titleEn="⭐ Top Rated Series"
          titleAr="⭐ أعلى المسلسلات تقييماً"
          category="top-rated-series"
          mediaType="tv"
        />
      </div>
    </div>
  );
}
