import { HeroSlider } from "@/components/hero-slider";
import { AnnouncementTicker } from "@/components/announcement-ticker";
import { TmdbRow } from "@/components/tmdb-row";
import { GenreBar, GenreMoviesRow } from "@/components/genre-bar";
import { Footer } from "@/components/footer";
import { useLang } from "@/lib/language";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Tv, Radio } from "lucide-react";
import { fetchCategory } from "@/lib/tmdb";

const TMDB_BG   = "https://image.tmdb.org/t/p/original";
const TMDB_W780 = "https://image.tmdb.org/t/p/w780";

export default function HomePage() {
  const { t, isRTL } = useLang();
  const [trending, setTrending] = useState<any[]>([]);
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [selectedGenreName, setSelectedGenreName] = useState("");

  // جلب الأفلام للواجهة العلوية مباشرة من الإنترنت (TMDB) بدل السيرفر المفقود
  useEffect(() => {
    fetchCategory("trending")
      .then(data => {
        if (data && Array.isArray(data.results)) {
          setTrending(data.results);
        }
      })
      .catch(err => console.error("Error fetching trending:", err));
  }, []);

  const heroItems = trending.slice(0, 5).map((m: any) => ({
    id: m.id,
    title: m.title || m.name || "",
    titleAr: null,
    description: m.overview,
    descriptionAr: null,
    backdropUrl: m.backdrop_path ? `${TMDB_BG}${m.backdrop_path}` : null,
    posterUrl: m.poster_path ? `${TMDB_W780}${m.poster_path}` : null,
    rating: m.vote_average,
    year: (() => { const d = m.release_date || m.first_air_date || ""; return d ? parseInt(d.slice(0, 4)) : null; })(),
    quality: "4K",
  }));

  return (
    <div className="min-h-screen bg-black text-white">
      <AnnouncementTicker />
      <HeroSlider items={heroItems} />

      {/* Live TV banner */}
      <div className="px-4 md:px-8 py-4">
        <Link href="/live">
          <div className="flex items-center gap-4 bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-900 border border-red-500/25 rounded-2xl px-5 py-4 cursor-pointer hover:border-red-500/50 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-red-500/25 transition-colors">
              <Radio size={18} className="text-red-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-xs font-bold uppercase tracking-wide">{t("بث مباشر", "LIVE NOW")}</span>
              </div>
              <p className="text-white font-semibold text-sm">{t("قنوات كرة القدم المباشرة — beIN • FIFA WC 2026", "Live Football Channels — beIN • FIFA WC 2026")}</p>
            </div>
            <Tv size={18} className="text-white/30 group-hover:text-red-400 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Genre Bar */}
      <div className="pt-4">
        <GenreBar
          selectedGenreId={selectedGenreId}
          onSelectGenre={(id, name) => {
            setSelectedGenreId(id);
            setSelectedGenreName(name);
          }}
        />
        {selectedGenreId !== null && (
          <GenreMoviesRow genreId={selectedGenreId} genreName={selectedGenreName} />
        )}
      </div>

      {/* TMDB Rows */}
      <div className="pb-4 pt-2 space-y-1">
        <TmdbRow titleEn="🔥 Trending Now"          titleAr="🔥 الأكثر رواجاً الآن"           category="trending" />
        <TmdbRow titleEn="⚡ Action & Adventure"     titleAr="⚡ أكشن ومغامرات"               category="action"           mediaType="movie" />
        <TmdbRow titleEn="👻 Horror"                 titleAr="👻 رعب"                          category="horror"           mediaType="movie" />
        <TmdbRow titleEn="😂 Comedy"                 titleAr="😂 كوميديا"                      category="comedy"           mediaType="movie" />
        <TmdbRow titleEn="⭐ Top Rated Series"       titleAr="⭐ أعلى المسلسلات تقييماً"       category="top-rated-series" mediaType="tv" />
      </div>

      <Footer />
    </div>
  );
}
