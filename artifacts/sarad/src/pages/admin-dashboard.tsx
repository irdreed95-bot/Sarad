import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useVerifyAdmin, getVerifyAdminQueryKey,
  useGetHomeStats, getGetHomeStatsQueryKey,
  useListContent, getListContentQueryKey,
  useCreateContent, useUpdateContent, useDeleteContent,
  useListAds, getListAdsQueryKey,
  useCreateAd, useDeleteAd,
  useListAnnouncements, getListAnnouncementsQueryKey,
  useCreateAnnouncement, useDeleteAnnouncement,
  useSearchTmdb, getSearchTmdbQueryKey,
} from "@workspace/api-client-react";
import { getAdminToken, clearAdminToken, buildAuthHeaders } from "@/lib/auth";
import { useLang } from "@/lib/language";
import { Film, Megaphone, LayoutGrid, LogOut, Plus, Trash2, Edit, Star, Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

type Tab = "content" | "ads" | "announcements";

function useAdminFetch() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminDashboardPage() {
  const [, navigate] = useLocation();
  const { t, isRTL } = useLang();
  const [tab, setTab] = useState<Tab>("content");
  const qc = useQueryClient();
  const headers = useAdminFetch();

  // Verify admin
  const { data: verify, isLoading: verifying } = useVerifyAdmin({
    query: { queryKey: getVerifyAdminQueryKey(), enabled: !!getAdminToken() }
  });

  useEffect(() => {
    if (!verifying && !verify?.isAdmin) {
      navigate("/admin");
    }
  }, [verify, verifying, navigate]);

  const { data: stats } = useGetHomeStats({ query: { queryKey: getGetHomeStatsQueryKey() } });
  const { data: allContent } = useListContent({ query: { queryKey: getListContentQueryKey() } });
  const { data: ads } = useListAds({ query: { queryKey: getListAdsQueryKey() } });
  const { data: announcements } = useListAnnouncements({ query: { queryKey: getListAnnouncementsQueryKey() } });

  const createContent = useCreateContent();
  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();
  const createAd = useCreateAd();
  const deleteAd = useDeleteAd();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  // Content form state
  const [showContentForm, setShowContentForm] = useState(false);
  const [contentForm, setContentForm] = useState({ title: "", titleAr: "", type: "movie", description: "", descriptionAr: "", posterUrl: "", backdropUrl: "", videoUrl: "", trailerUrl: "", rating: "", year: "", duration: "", genres: "", language: "en", quality: "HD", isFeatured: false, isActive: true });
  const [editingContentId, setEditingContentId] = useState<number | null>(null);

  // TMDB search for content form
  const [tmdbQuery, setTmdbQuery] = useState("");
  const debouncedTmdb = useDebounce(tmdbQuery, 400);
  const { data: tmdbResults } = useSearchTmdb(
    { query: debouncedTmdb, type: "multi" },
    { query: { enabled: debouncedTmdb.length > 1, queryKey: getSearchTmdbQueryKey({ query: debouncedTmdb, type: "multi" }) } }
  );

  // Ad form
  const [showAdForm, setShowAdForm] = useState(false);
  const [adForm, setAdForm] = useState({ title: "", titleAr: "", type: "banner" as "banner" | "video", imageUrl: "", videoUrl: "", linkUrl: "", isActive: true, order: 0 });

  // Announcement form
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annForm, setAnnForm] = useState({ text: "", textAr: "", isActive: true });

  const handleLogout = () => {
    clearAdminToken();
    navigate("/");
  };

  const fillFromTmdb = (m: any) => {
    setContentForm((f) => ({
      ...f,
      title: m.title || m.name || "",
      description: m.overview || "",
      posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "",
      backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : "",
      rating: m.vote_average?.toString() || "",
      year: (m.release_date || m.first_air_date || "").split("-")[0] || "",
      type: m.media_type === "tv" ? "series" : "movie",
      genres: "",
    }));
    setTmdbQuery("");
  };

  const handleSaveContent = () => {
    const data = {
      title: contentForm.title,
      titleAr: contentForm.titleAr || undefined,
      type: contentForm.type as "movie" | "series",
      description: contentForm.description || undefined,
      descriptionAr: contentForm.descriptionAr || undefined,
      posterUrl: contentForm.posterUrl || undefined,
      backdropUrl: contentForm.backdropUrl || undefined,
      videoUrl: contentForm.videoUrl || undefined,
      trailerUrl: contentForm.trailerUrl || undefined,
      rating: contentForm.rating ? parseFloat(contentForm.rating) : undefined,
      year: contentForm.year ? parseInt(contentForm.year) : undefined,
      duration: contentForm.duration ? parseInt(contentForm.duration) : undefined,
      genres: contentForm.genres || undefined,
      language: contentForm.language || "en",
      quality: contentForm.quality || "HD",
      isFeatured: contentForm.isFeatured,
      isActive: contentForm.isActive,
    };

    if (editingContentId) {
      updateContent.mutate({ id: editingContentId, data }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListContentQueryKey() });
          setShowContentForm(false);
          setEditingContentId(null);
        }
      });
    } else {
      createContent.mutate({ data }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListContentQueryKey() });
          setShowContentForm(false);
        }
      });
    }
  };

  if (verifying) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const tabs: { key: Tab; icon: any; labelAr: string; labelEn: string }[] = [
    { key: "content", icon: Film, labelAr: "المحتوى", labelEn: "Content" },
    { key: "ads", icon: LayoutGrid, labelAr: "الإعلانات", labelEn: "Ads" },
    { key: "announcements", icon: Megaphone, labelAr: "الإشعارات", labelEn: "Announcements" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-zinc-950 border-b border-white/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg text-white">
            <span className="text-primary">سرّاد</span> — {t("لوحة التحكم", "Admin Dashboard")}
          </h1>
        </div>
        <button
          data-testid="button-logout"
          onClick={handleLogout}
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
        >
          <LogOut size={16} />
          {t("خروج", "Logout")}
        </button>
      </header>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-4 md:px-8 py-4">
          {[
            { labelAr: "أفلام", labelEn: "Movies", value: stats.totalMovies },
            { labelAr: "مسلسلات", labelEn: "Series", value: stats.totalSeries },
            { labelAr: "مميزة", labelEn: "Featured", value: stats.featuredCount },
            { labelAr: "إعلانات", labelEn: "Ads", value: stats.totalAds },
            { labelAr: "إشعارات", labelEn: "Announcements", value: stats.totalAnnouncements },
          ].map((s) => (
            <div key={s.labelEn} className="bg-zinc-900 rounded-xl p-4 border border-white/5">
              <p className="text-white/50 text-xs mb-1">{t(s.labelAr, s.labelEn)}</p>
              <p className="text-2xl font-bold text-primary">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-4 md:px-8 pb-0 border-b border-white/10">
        {tabs.map(({ key, icon: Icon, labelAr, labelEn }) => (
          <button
            key={key}
            data-testid={`tab-${key}`}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-primary text-primary" : "border-transparent text-white/50 hover:text-white"}`}
          >
            <Icon size={16} />
            {t(labelAr, labelEn)}
          </button>
        ))}
      </div>

      <div className="px-4 md:px-8 py-6">

        {/* CONTENT TAB */}
        {tab === "content" && (
          <div>
            <div className={`flex items-center justify-between mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <h2 className="text-lg font-semibold">{t("إدارة المحتوى", "Content Management")}</h2>
              <button
                data-testid="button-add-content"
                onClick={() => { setEditingContentId(null); setContentForm({ title: "", titleAr: "", type: "movie", description: "", descriptionAr: "", posterUrl: "", backdropUrl: "", videoUrl: "", trailerUrl: "", rating: "", year: "", duration: "", genres: "", language: "en", quality: "HD", isFeatured: false, isActive: true }); setShowContentForm(true); }}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus size={16} />
                {t("إضافة محتوى", "Add Content")}
              </button>
            </div>

            {/* Content Form */}
            {showContentForm && (
              <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 mb-6">
                <h3 className="font-semibold mb-4">{editingContentId ? t("تعديل", "Edit Content") : t("إضافة محتوى جديد", "Add New Content")}</h3>

                {/* TMDB Search */}
                <div className="mb-4 relative">
                  <label className="text-xs text-white/50 mb-1 block">{t("بحث في TMDB للملء التلقائي", "Search TMDB to auto-fill")}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                    <input
                      data-testid="input-tmdb-search"
                      value={tmdbQuery}
                      onChange={(e) => setTmdbQuery(e.target.value)}
                      placeholder={t("ابحث في TMDB...", "Search TMDB...")}
                      className="w-full bg-zinc-800 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/40"
                    />
                  </div>
                  {tmdbResults && debouncedTmdb.length > 1 && (
                    <div className="absolute z-20 left-0 right-0 bg-zinc-800 border border-white/10 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-xl">
                      {tmdbResults.results.slice(0, 8).map((m: any) => (
                        <button
                          key={m.id}
                          data-testid={`button-tmdb-pick-${m.id}`}
                          onClick={() => fillFromTmdb(m)}
                          className={`w-full text-left px-4 py-3 text-sm hover:bg-zinc-700 transition-colors flex items-center gap-3 ${isRTL ? "flex-row-reverse text-right" : ""}`}
                        >
                          {m.poster_path && <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} className="w-8 h-12 object-cover rounded" alt="" />}
                          <span className="text-white">{m.title || m.name}</span>
                          <span className="text-white/40 text-xs ms-auto">{(m.release_date || m.first_air_date || "").slice(0, 4)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "title", labelAr: "العنوان (إنجليزي)", labelEn: "Title (English)", required: true },
                    { key: "titleAr", labelAr: "العنوان (عربي)", labelEn: "Title (Arabic)" },
                    { key: "videoUrl", labelAr: "رابط الفيديو (HLS/MP4)", labelEn: "Video URL (HLS/MP4)" },
                    { key: "posterUrl", labelAr: "رابط البوستر", labelEn: "Poster URL" },
                    { key: "backdropUrl", labelAr: "رابط الخلفية", labelEn: "Backdrop URL" },
                    { key: "rating", labelAr: "التقييم", labelEn: "Rating" },
                    { key: "year", labelAr: "السنة", labelEn: "Year" },
                    { key: "duration", labelAr: "المدة (دقيقة)", labelEn: "Duration (min)" },
                    { key: "genres", labelAr: "الأنواع (مفصولة بفاصلة)", labelEn: "Genres (comma-separated)" },
                    { key: "quality", labelAr: "الجودة", labelEn: "Quality" },
                  ].map(({ key, labelAr, labelEn }) => (
                    <div key={key}>
                      <label className="text-xs text-white/50 mb-1 block">{t(labelAr, labelEn)}</label>
                      <input
                        data-testid={`input-content-${key}`}
                        value={(contentForm as any)[key]}
                        onChange={(e) => setContentForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/40"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="text-xs text-white/50 mb-1 block">{t("النوع", "Type")}</label>
                    <select
                      data-testid="select-content-type"
                      value={contentForm.type}
                      onChange={(e) => setContentForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="movie">{t("فيلم", "Movie")}</option>
                      <option value="series">{t("مسلسل", "Series")}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={contentForm.isFeatured} onChange={(e) => setContentForm((f) => ({ ...f, isFeatured: e.target.checked }))} className="accent-primary" />
                    <span className="text-sm text-white/70">{t("مميز", "Featured")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={contentForm.isActive} onChange={(e) => setContentForm((f) => ({ ...f, isActive: e.target.checked }))} className="accent-primary" />
                    <span className="text-sm text-white/70">{t("نشط", "Active")}</span>
                  </label>
                </div>

                <div className={`flex gap-3 mt-6 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <button
                    data-testid="button-save-content"
                    onClick={handleSaveContent}
                    disabled={createContent.isPending || updateContent.isPending}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {t("حفظ", "Save")}
                  </button>
                  <button onClick={() => { setShowContentForm(false); setEditingContentId(null); }} className="bg-zinc-800 text-white/70 px-6 py-2 rounded-lg text-sm hover:bg-zinc-700">
                    {t("إلغاء", "Cancel")}
                  </button>
                </div>
              </div>
            )}

            {/* Content Table */}
            <div className="space-y-2">
              {(allContent || []).map((item) => (
                <div key={item.id} data-testid={`row-content-${item.id}`} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 border border-white/5">
                  {item.posterUrl && <img src={item.posterUrl} alt="" className="w-10 h-14 object-cover rounded flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/40 uppercase">{item.type}</span>
                      {item.isFeatured && <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded">{t("مميز", "Featured")}</span>}
                      {item.rating && <span className="flex items-center gap-0.5 text-[10px] text-primary"><Star size={9} fill="currentColor" />{item.rating}</span>}
                      {item.videoUrl && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 rounded">{t("فيديو", "Video")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      data-testid={`button-edit-content-${item.id}`}
                      onClick={() => {
                        setEditingContentId(item.id);
                        setContentForm({
                          title: item.title || "",
                          titleAr: item.titleAr || "",
                          type: item.type || "movie",
                          description: item.description || "",
                          descriptionAr: item.descriptionAr || "",
                          posterUrl: item.posterUrl || "",
                          backdropUrl: item.backdropUrl || "",
                          videoUrl: item.videoUrl || "",
                          trailerUrl: item.trailerUrl || "",
                          rating: item.rating?.toString() || "",
                          year: item.year?.toString() || "",
                          duration: item.duration?.toString() || "",
                          genres: item.genres || "",
                          language: item.language || "en",
                          quality: item.quality || "HD",
                          isFeatured: item.isFeatured || false,
                          isActive: item.isActive !== false,
                        });
                        setShowContentForm(true);
                      }}
                      className="p-2 text-white/40 hover:text-white transition-colors"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      data-testid={`button-delete-content-${item.id}`}
                      onClick={() => deleteContent.mutate({ id: item.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListContentQueryKey() }) })}
                      className="p-2 text-white/40 hover:text-destructive transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADS TAB */}
        {tab === "ads" && (
          <div>
            <div className={`flex items-center justify-between mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <h2 className="text-lg font-semibold">{t("إدارة الإعلانات", "Ads Management")}</h2>
              <button
                data-testid="button-add-ad"
                onClick={() => setShowAdForm(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Plus size={16} />
                {t("إضافة إعلان", "Add Ad")}
              </button>
            </div>

            {showAdForm && (
              <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 mb-6">
                <h3 className="font-semibold mb-4">{t("إعلان جديد", "New Ad")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "title", labelAr: "العنوان (إنجليزي)", labelEn: "Title (English)" },
                    { key: "titleAr", labelAr: "العنوان (عربي)", labelEn: "Title (Arabic)" },
                    { key: "imageUrl", labelAr: "رابط الصورة", labelEn: "Image URL" },
                    { key: "videoUrl", labelAr: "رابط الفيديو", labelEn: "Video URL" },
                    { key: "linkUrl", labelAr: "رابط التوجيه", labelEn: "Link URL" },
                  ].map(({ key, labelAr, labelEn }) => (
                    <div key={key}>
                      <label className="text-xs text-white/50 mb-1 block">{t(labelAr, labelEn)}</label>
                      <input
                        data-testid={`input-ad-${key}`}
                        value={(adForm as any)[key] || ""}
                        onChange={(e) => setAdForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/40"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">{t("النوع", "Type")}</label>
                    <select value={adForm.type} onChange={(e) => setAdForm((f) => ({ ...f, type: e.target.value as "banner" | "video" }))} className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="banner">{t("بانر", "Banner")}</option>
                      <option value="video">{t("فيديو", "Video")}</option>
                    </select>
                  </div>
                </div>
                <div className={`flex gap-3 mt-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <button
                    data-testid="button-save-ad"
                    onClick={() => createAd.mutate({ data: adForm }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAdsQueryKey() }); setShowAdForm(false); } })}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm"
                  >
                    {t("حفظ", "Save")}
                  </button>
                  <button onClick={() => setShowAdForm(false)} className="bg-zinc-800 text-white/70 px-6 py-2 rounded-lg text-sm">{t("إلغاء", "Cancel")}</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {(ads || []).map((ad) => (
                <div key={ad.id} data-testid={`row-ad-${ad.id}`} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 border border-white/5">
                  {ad.imageUrl && <img src={ad.imageUrl} alt="" className="w-16 h-10 object-cover rounded flex-shrink-0" />}
                  <div className="flex-1">
                    <p className="text-white text-sm">{ad.title}</p>
                    <p className="text-white/40 text-xs">{ad.type}</p>
                  </div>
                  <button
                    data-testid={`button-delete-ad-${ad.id}`}
                    onClick={() => deleteAd.mutate({ id: ad.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListAdsQueryKey() }) })}
                    className="p-2 text-white/40 hover:text-destructive"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {tab === "announcements" && (
          <div>
            <div className={`flex items-center justify-between mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <h2 className="text-lg font-semibold">{t("إدارة الإشعارات", "Announcements")}</h2>
              <button
                data-testid="button-add-announcement"
                onClick={() => setShowAnnForm(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Plus size={16} />
                {t("إضافة إشعار", "Add Announcement")}
              </button>
            </div>

            {showAnnForm && (
              <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 mb-6">
                <h3 className="font-semibold mb-4">{t("إشعار جديد", "New Announcement")}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">{t("النص (إنجليزي)", "Text (English)")}</label>
                    <input data-testid="input-ann-text" value={annForm.text} onChange={(e) => setAnnForm((f) => ({ ...f, text: e.target.value }))} className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/40" />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">{t("النص (عربي)", "Text (Arabic)")}</label>
                    <input data-testid="input-ann-text-ar" value={annForm.textAr} onChange={(e) => setAnnForm((f) => ({ ...f, textAr: e.target.value }))} className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/40 text-right" dir="rtl" />
                  </div>
                </div>
                <div className={`flex gap-3 mt-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <button
                    data-testid="button-save-announcement"
                    onClick={() => createAnnouncement.mutate({ data: annForm }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() }); setShowAnnForm(false); setAnnForm({ text: "", textAr: "", isActive: true }); } })}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm"
                  >
                    {t("حفظ", "Save")}
                  </button>
                  <button onClick={() => setShowAnnForm(false)} className="bg-zinc-800 text-white/70 px-6 py-2 rounded-lg text-sm">{t("إلغاء", "Cancel")}</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {(announcements || []).map((ann) => (
                <div key={ann.id} data-testid={`row-ann-${ann.id}`} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 border border-white/5">
                  <div className="flex-1">
                    <p className="text-white text-sm">{ann.text}</p>
                    {ann.textAr && <p className="text-white/50 text-xs mt-0.5" dir="rtl">{ann.textAr}</p>}
                  </div>
                  <button
                    data-testid={`button-delete-ann-${ann.id}`}
                    onClick={() => deleteAnnouncement.mutate({ id: ann.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() }) })}
                    className="p-2 text-white/40 hover:text-destructive"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
