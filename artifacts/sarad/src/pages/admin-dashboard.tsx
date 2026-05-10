import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Film, Image, Layers, LogOut, Plus, Trash2, Star, Search, Tag,
  CheckCircle, Video,
} from "lucide-react";
import {
  isClientAdmin, clearAdminToken,
  getAdminToken,
} from "@/lib/auth";
import {
  getCustomContent, addCustomContent, deleteCustomContent,
  getCustomAds, addCustomAd, deleteCustomAd,
  getCustomCategories, addCustomCategory, deleteCustomCategory,
  type CustomContent, type CustomAd, type CustomCategory,
} from "@/lib/admin-store";
import { useLang } from "@/lib/language";

type Tab = "content" | "ads" | "categories";

const TMDB_W92 = "https://image.tmdb.org/t/p/w92";

// ── Small helpers ────────────────────────────────────────────────────────────
function isAdminAuthenticated(): boolean {
  const token = getAdminToken();
  if (!token) return false;
  return isClientAdmin() || token.length > 20;
}

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ── Default form states ──────────────────────────────────────────────────────
const defaultContent = (): Omit<CustomContent, "id" | "createdAt"> => ({
  title: "", titleAr: "", type: "movie", description: "", descriptionAr: "",
  posterUrl: "", backdropUrl: "", videoUrl: "", rating: undefined, year: undefined,
  genres: "", quality: "HD", isFeatured: false,
});

const defaultAd = (): Omit<CustomAd, "id" | "createdAt"> => ({
  title: "", type: "banner", imageUrl: "", videoUrl: "", linkUrl: "", isActive: true,
});

const defaultCategory = (): Omit<CustomCategory, "id" | "createdAt"> => ({
  nameEn: "", nameAr: "", tmdbCategoryType: "",
});

// ── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [, navigate] = useLocation();
  const { t, isRTL } = useLang();
  const [tab, setTab] = useState<Tab>("content");

  // Auth guard
  useEffect(() => {
    if (!isAdminAuthenticated()) navigate("/admin");
  }, [navigate]);

  // ── Content state ──────────────────────────────────────────────────────────
  const [content, setContent] = useState<CustomContent[]>(() => getCustomContent());
  const [showContentForm, setShowContentForm] = useState(false);
  const [contentForm, setContentForm] = useState(defaultContent());
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const debouncedQuery = useDebounce(tmdbQuery, 450);

  useEffect(() => {
    if (debouncedQuery.length < 2) { setTmdbResults([]); return; }
    fetch(`/api/tmdb/search?query=${encodeURIComponent(debouncedQuery)}&type=multi`)
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setTmdbResults((d.results || []).slice(0, 8)))
      .catch(() => setTmdbResults([]));
  }, [debouncedQuery]);

  const fillFromTmdb = (m: any) => {
    setContentForm(f => ({
      ...f,
      title: m.title || m.name || "",
      description: m.overview || "",
      posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w780${m.poster_path}` : "",
      backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : "",
      rating: m.vote_average,
      year: parseInt((m.release_date || m.first_air_date || "").slice(0, 4)) || undefined,
      type: m.media_type === "tv" ? "series" : "movie",
      tmdbId: m.id,
    }));
    setTmdbQuery("");
    setTmdbResults([]);
  };

  const handleSaveContent = () => {
    if (!contentForm.title.trim()) return;
    const newItem = addCustomContent(contentForm);
    setContent(c => [newItem, ...c]);
    setShowContentForm(false);
    setContentForm(defaultContent());
  };

  // ── Ads state ──────────────────────────────────────────────────────────────
  const [ads, setAds] = useState<CustomAd[]>(() => getCustomAds());
  const [showAdForm, setShowAdForm] = useState(false);
  const [adForm, setAdForm] = useState(defaultAd());

  const handleSaveAd = () => {
    if (!adForm.title.trim()) return;
    const newAd = addCustomAd(adForm);
    setAds(a => [newAd, ...a]);
    setShowAdForm(false);
    setAdForm(defaultAd());
  };

  // ── Categories state ───────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CustomCategory[]>(() => getCustomCategories());
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState(defaultCategory());

  const handleSaveCat = () => {
    if (!catForm.nameEn.trim()) return;
    const newCat = addCustomCategory(catForm);
    setCategories(c => [newCat, ...c]);
    setShowCatForm(false);
    setCatForm(defaultCategory());
  };

  const TMDB_CATEGORY_OPTIONS = [
    { value: "trending",         label: "Trending Now" },
    { value: "action",           label: "Action & Adventure" },
    { value: "horror",           label: "Horror" },
    { value: "comedy",           label: "Comedy" },
    { value: "top-rated-series", label: "Top Rated Series" },
    { value: "top-rated",        label: "Top Rated Movies" },
    { value: "drama",            label: "Drama" },
    { value: "sci-fi",           label: "Sci-Fi" },
  ];

  const tabs = [
    { key: "content" as Tab, icon: Film,   labelEn: "Content",    labelAr: "المحتوى" },
    { key: "ads"     as Tab, icon: Image,  labelEn: "Ads Manager",labelAr: "مدير الإعلانات" },
    { key: "categories" as Tab, icon: Layers, labelEn: "Categories", labelAr: "الأقسام" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── Admin Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/8 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Star size={14} className="text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white leading-none">
              <span className="text-primary">سرّاد</span>
              <span className="text-white/40 mx-1.5">|</span>
              {t("لوحة التحكم", "Admin Dashboard")}
            </h1>
            <p className="text-white/30 text-[11px] mt-0.5">{t("مرحباً، المسؤول", "Welcome, Administrator")}</p>
          </div>
        </div>
        <button
          data-testid="button-logout"
          onClick={() => { clearAdminToken(); navigate("/"); }}
          className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-medium transition-colors bg-zinc-900 hover:bg-zinc-800 px-3 py-2 rounded-lg border border-white/8"
        >
          <LogOut size={13} />
          {t("خروج", "Logout")}
        </button>
      </header>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-white/8 bg-black/40 px-4 md:px-8 overflow-x-auto">
        {tabs.map(({ key, icon: Icon, labelEn, labelAr }) => (
          <button
            key={key}
            data-testid={`tab-${key}`}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              tab === key
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-white/40 hover:text-white hover:border-white/20"
            }`}
          >
            <Icon size={15} />
            {t(labelAr, labelEn)}
          </button>
        ))}
      </div>

      <div className="px-4 md:px-8 py-6 max-w-6xl">

        {/* ════════════════════════ CONTENT TAB ════════════════════════ */}
        {tab === "content" && (
          <div>
            <div className={`flex items-center justify-between mb-5 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div>
                <h2 className="text-lg font-bold text-white">{t("إدارة المحتوى", "Content Management")}</h2>
                <p className="text-white/30 text-xs mt-0.5">{t("أضف أفلاماً ومسلسلات مخصصة", "Add custom movies and series")}</p>
              </div>
              <button
                data-testid="button-add-content"
                onClick={() => { setShowContentForm(true); setContentForm(defaultContent()); }}
                className="flex items-center gap-2 bg-primary text-black px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-[0_0_14px_rgba(212,175,55,0.3)]"
              >
                <Plus size={15} />
                {t("إضافة محتوى", "Add Content")}
              </button>
            </div>

            {/* Content form */}
            {showContentForm && (
              <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6 mb-6 shadow-xl">
                <h3 className="font-bold text-white mb-5">{t("إضافة محتوى جديد", "Add New Content")}</h3>

                {/* TMDB auto-fill */}
                <div className="mb-5 relative">
                  <label className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2 block">
                    {t("بحث في TMDB للملء التلقائي", "Search TMDB to auto-fill")}
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      value={tmdbQuery}
                      onChange={e => setTmdbQuery(e.target.value)}
                      placeholder={t("اسم الفيلم أو المسلسل...", "Movie or series name...")}
                      className="w-full bg-zinc-800 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  {tmdbResults.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 bg-zinc-800 border border-white/10 rounded-xl mt-1 max-h-52 overflow-y-auto shadow-2xl">
                      {tmdbResults.map(m => (
                        <button
                          key={m.id}
                          onClick={() => fillFromTmdb(m)}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-zinc-700 transition-colors flex items-center gap-3"
                        >
                          {m.poster_path && (
                            <img src={`${TMDB_W92}${m.poster_path}`} className="w-8 h-11 object-cover rounded-md flex-shrink-0" alt="" />
                          )}
                          <div>
                            <p className="text-white font-medium">{m.title || m.name}</p>
                            <p className="text-white/30 text-xs">{(m.release_date || m.first_air_date || "").slice(0, 4)} · {m.media_type}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "title",       label: "Title (English)",      required: true },
                    { key: "titleAr",     label: "العنوان (عربي)" },
                    { key: "posterUrl",   label: "Poster Image URL" },
                    { key: "backdropUrl", label: "Backdrop Image URL" },
                    { key: "videoUrl",    label: "Custom Video URL (optional)" },
                    { key: "genres",      label: "Genres (comma-separated)" },
                    { key: "rating",      label: "Rating (e.g. 8.5)" },
                    { key: "year",        label: "Year" },
                    { key: "quality",     label: "Quality (e.g. 4K, HD)" },
                  ].map(({ key, label, required }) => (
                    <div key={key}>
                      <label className="text-xs text-white/40 font-medium mb-1.5 block">{label}{required && " *"}</label>
                      <input
                        value={(contentForm as any)[key] ?? ""}
                        onChange={e => setContentForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-white/15"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">Type</label>
                    <select
                      value={contentForm.type}
                      onChange={e => setContentForm(f => ({ ...f, type: e.target.value as "movie" | "series" }))}
                      className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                    >
                      <option value="movie">🎬 Movie</option>
                      <option value="series">📺 Series</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contentForm.isFeatured || false}
                      onChange={e => setContentForm(f => ({ ...f, isFeatured: e.target.checked }))}
                      className="accent-primary w-4 h-4"
                    />
                    <span className="text-sm text-white/60">{t("عرض في الواجهة الرئيسية", "Feature on Home")}</span>
                  </label>
                </div>

                <div className={`flex gap-3 mt-6 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <button
                    onClick={handleSaveContent}
                    className="bg-primary text-black px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 flex items-center gap-2"
                  >
                    <CheckCircle size={15} />
                    {t("حفظ", "Save")}
                  </button>
                  <button
                    onClick={() => { setShowContentForm(false); setContentForm(defaultContent()); }}
                    className="bg-zinc-800 text-white/60 px-6 py-2.5 rounded-xl text-sm hover:bg-zinc-700"
                  >
                    {t("إلغاء", "Cancel")}
                  </button>
                </div>
              </div>
            )}

            {/* Content list */}
            {content.length === 0 && !showContentForm && (
              <div className="text-center py-16 text-white/30">
                <Film size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("لا يوجد محتوى مخصص بعد", "No custom content yet")}</p>
              </div>
            )}
            <div className="space-y-2">
              {content.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 border border-white/5 hover:border-white/10 transition-colors">
                  {item.posterUrl ? (
                    <img src={item.posterUrl} alt="" className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-14 bg-zinc-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <Film size={14} className="text-white/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/40 uppercase bg-zinc-800 px-1.5 py-0.5 rounded">{item.type}</span>
                      {item.isFeatured && <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">{t("مميز", "Featured")}</span>}
                      {item.rating && (
                        <span className="flex items-center gap-0.5 text-[10px] text-primary">
                          <Star size={8} fill="currentColor" />{item.rating}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { deleteCustomContent(item.id); setContent(getCustomContent()); }}
                    className="p-2 text-white/25 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════ ADS TAB ════════════════════════ */}
        {tab === "ads" && (
          <div>
            <div className={`flex items-center justify-between mb-5 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div>
                <h2 className="text-lg font-bold text-white">{t("مدير الإعلانات", "Ads Manager")}</h2>
                <p className="text-white/30 text-xs mt-0.5">{t("أضف إعلانات بانر أو فيديو", "Add banner or video ads")}</p>
              </div>
              <button
                data-testid="button-add-ad"
                onClick={() => { setShowAdForm(true); setAdForm(defaultAd()); }}
                className="flex items-center gap-2 bg-primary text-black px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                <Plus size={15} />
                {t("إضافة إعلان", "Add Ad")}
              </button>
            </div>

            {showAdForm && (
              <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6 mb-6">
                <h3 className="font-bold text-white mb-5">{t("إعلان جديد", "New Ad")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">Title *</label>
                    <input
                      value={adForm.title}
                      onChange={e => setAdForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">Type</label>
                    <select
                      value={adForm.type}
                      onChange={e => setAdForm(f => ({ ...f, type: e.target.value as "banner" | "video" }))}
                      className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white"
                    >
                      <option value="banner">🖼 Banner Image Ad</option>
                      <option value="video">🎬 Video Ad</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">
                      {adForm.type === "banner" ? "Banner Image URL *" : "Video URL *"}
                    </label>
                    {adForm.type === "banner" ? (
                      <input
                        value={adForm.imageUrl || ""}
                        onChange={e => setAdForm(f => ({ ...f, imageUrl: e.target.value }))}
                        placeholder="https://example.com/banner.jpg"
                        className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                      />
                    ) : (
                      <input
                        value={adForm.videoUrl || ""}
                        onChange={e => setAdForm(f => ({ ...f, videoUrl: e.target.value }))}
                        placeholder="https://example.com/ad.mp4"
                        className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                      />
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">Link URL (optional)</label>
                    <input
                      value={adForm.linkUrl || ""}
                      onChange={e => setAdForm(f => ({ ...f, linkUrl: e.target.value }))}
                      placeholder="https://example.com"
                      className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                {/* Preview */}
                {adForm.imageUrl && (
                  <div className="mt-4">
                    <p className="text-xs text-white/30 mb-2">Preview:</p>
                    <img src={adForm.imageUrl} alt="preview" className="h-20 rounded-xl object-cover border border-white/10" />
                  </div>
                )}

                <div className={`flex gap-3 mt-5 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <button onClick={handleSaveAd} className="bg-primary text-black px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
                    <CheckCircle size={15} />{t("حفظ", "Save")}
                  </button>
                  <button onClick={() => setShowAdForm(false)} className="bg-zinc-800 text-white/60 px-6 py-2.5 rounded-xl text-sm">
                    {t("إلغاء", "Cancel")}
                  </button>
                </div>
              </div>
            )}

            {ads.length === 0 && !showAdForm && (
              <div className="text-center py-16 text-white/30">
                <Image size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("لا توجد إعلانات بعد", "No ads yet")}</p>
              </div>
            )}
            <div className="space-y-2">
              {ads.map(ad => (
                <div key={ad.id} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 border border-white/5">
                  {ad.imageUrl ? (
                    <img src={ad.imageUrl} alt="" className="w-20 h-12 object-cover rounded-lg flex-shrink-0 border border-white/10" />
                  ) : (
                    <div className="w-20 h-12 bg-zinc-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <Video size={16} className="text-white/20" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{ad.title}</p>
                    <span className="text-[10px] text-white/40 uppercase bg-zinc-800 px-1.5 py-0.5 rounded">{ad.type}</span>
                  </div>
                  <button
                    onClick={() => { deleteCustomAd(ad.id); setAds(getCustomAds()); }}
                    className="p-2 text-white/25 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════ CATEGORIES TAB ════════════════════════ */}
        {tab === "categories" && (
          <div>
            <div className={`flex items-center justify-between mb-5 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div>
                <h2 className="text-lg font-bold text-white">{t("إدارة الأقسام", "Category Manager")}</h2>
                <p className="text-white/30 text-xs mt-0.5">{t("أنشئ أقساماً مخصصة على الصفحة الرئيسية", "Create custom sections on the home page")}</p>
              </div>
              <button
                data-testid="button-add-category"
                onClick={() => { setShowCatForm(true); setCatForm(defaultCategory()); }}
                className="flex items-center gap-2 bg-primary text-black px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                <Plus size={15} />
                {t("إضافة قسم", "Add Category")}
              </button>
            </div>

            {showCatForm && (
              <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6 mb-6">
                <h3 className="font-bold text-white mb-5">{t("قسم جديد", "New Category")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">Category Name (English) *</label>
                    <input
                      value={catForm.nameEn}
                      onChange={e => setCatForm(f => ({ ...f, nameEn: e.target.value }))}
                      placeholder="e.g. Romance"
                      className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">اسم القسم (عربي)</label>
                    <input
                      value={catForm.nameAr}
                      onChange={e => setCatForm(f => ({ ...f, nameAr: e.target.value }))}
                      placeholder="مثال: رومانسي"
                      className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">TMDB Content Source</label>
                    <select
                      value={catForm.tmdbCategoryType || ""}
                      onChange={e => setCatForm(f => ({ ...f, tmdbCategoryType: e.target.value }))}
                      className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white"
                    >
                      <option value="">-- Select source --</option>
                      {TMDB_CATEGORY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <p className="text-white/25 text-xs mt-1.5">
                      This will pull real TMDB content for this category row on the home page.
                    </p>
                  </div>
                </div>
                <div className={`flex gap-3 mt-5 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <button onClick={handleSaveCat} className="bg-primary text-black px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
                    <CheckCircle size={15} />{t("حفظ", "Save")}
                  </button>
                  <button onClick={() => setShowCatForm(false)} className="bg-zinc-800 text-white/60 px-6 py-2.5 rounded-xl text-sm">
                    {t("إلغاء", "Cancel")}
                  </button>
                </div>
              </div>
            )}

            {/* Default built-in categories */}
            <div className="mb-4">
              <p className="text-xs text-white/30 font-semibold uppercase tracking-wider mb-3">{t("الأقسام الافتراضية (نشطة)", "Default Sections (Active)")}</p>
              <div className="space-y-2">
                {[
                  { nameEn: "🔥 Trending Now",         nameAr: "🔥 الأكثر رواجاً الآن" },
                  { nameEn: "⚡ Action & Adventure",    nameAr: "⚡ أكشن ومغامرات" },
                  { nameEn: "👻 Horror",                nameAr: "👻 رعب" },
                  { nameEn: "😂 Comedy",                nameAr: "😂 كوميديا" },
                  { nameEn: "⭐ Top Rated Series",      nameAr: "⭐ أعلى المسلسلات تقييماً" },
                ].map(cat => (
                  <div key={cat.nameEn} className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <p className="text-white/80 text-sm flex-1">{isRTL ? cat.nameAr : cat.nameEn}</p>
                    <span className="text-[10px] text-primary/60 bg-primary/10 px-2 py-0.5 rounded">{t("افتراضي", "Default")}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom categories */}
            {categories.length > 0 && (
              <div>
                <p className="text-xs text-white/30 font-semibold uppercase tracking-wider mb-3 mt-6">{t("الأقسام المخصصة", "Custom Sections")}</p>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 border border-white/5">
                      <Tag size={16} className="text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{cat.nameEn}</p>
                        {cat.nameAr && <p className="text-white/40 text-xs">{cat.nameAr}</p>}
                        {cat.tmdbCategoryType && (
                          <p className="text-primary/50 text-[10px] mt-0.5">TMDB: {cat.tmdbCategoryType}</p>
                        )}
                      </div>
                      <button
                        onClick={() => { deleteCustomCategory(cat.id); setCategories(getCustomCategories()); }}
                        className="p-2 text-white/25 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {categories.length === 0 && !showCatForm && (
              <div className="text-center py-10 text-white/30 mt-4">
                <Layers size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("لا توجد أقسام مخصصة — الأقسام الافتراضية نشطة", "No custom categories — defaults are active")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
