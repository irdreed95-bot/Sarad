import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Film, Image, Layers, LogOut, Plus, Trash2, Star, Search, Tag,
  CheckCircle, Video, Radio, Settings2, Megaphone, Pencil, Save,
  Globe, Download, Bell, Eye, EyeOff, Server, Zap,
} from "lucide-react";
import { isClientAdmin, clearAdminToken, getAdminToken } from "@/lib/auth";
import {
  getCustomContent, addCustomContent, deleteCustomContent,
  getCustomAds, addCustomAd, deleteCustomAd,
  getCustomCategories, addCustomCategory, deleteCustomCategory,
  type CustomContent, type CustomAd, type CustomCategory,
} from "@/lib/admin-store";
import {
  getStreamServers, addStreamServer, updateStreamServer, deleteStreamServer,
  getAppConfig, saveAppConfig,
  getHiddenTmdbIds, hideTmdbId, unhideTmdbId,
  type StreamServer, type AppConfig,
} from "@/lib/app-settings";
import { useLang } from "@/lib/language";

type Tab = "content" | "servers" | "ads" | "ticker" | "appsettings" | "categories";

const TMDB_W92 = "https://image.tmdb.org/t/p/w92";

function isAdminAuthenticated(): boolean {
  const token = getAdminToken();
  if (!token) return false;
  return isClientAdmin() || token.length > 20;
}

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDv(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return dv;
}

const defContent = (): Omit<CustomContent, "id" | "createdAt"> => ({
  title: "", titleAr: "", type: "movie", description: "", descriptionAr: "",
  posterUrl: "", backdropUrl: "", videoUrl: "", rating: undefined, year: undefined,
  genres: "", quality: "HD", isFeatured: false,
});
const defAd = (): Omit<CustomAd, "id" | "createdAt"> => ({ title: "", type: "banner", imageUrl: "", videoUrl: "", linkUrl: "", isActive: true });
const defCat = (): Omit<CustomCategory, "id" | "createdAt"> => ({ nameEn: "", nameAr: "", tmdbCategoryType: "" });
const defServer = (): Omit<StreamServer, "id"> => ({
  label: "",
  movieUrl: "https://vidsrc.me/embed/movie?tmdb={id}",
  tvUrl: "https://vidsrc.me/embed/tv?tmdb={id}&season={season}&episode={episode}",
  isActive: true,
});

export default function AdminDashboardPage() {
  const [, navigate] = useLocation();
  const { t, isRTL } = useLang();
  const [tab, setTab] = useState<Tab>("content");

  useEffect(() => { if (!isAdminAuthenticated()) navigate("/admin"); }, [navigate]);

  // ── Content ──────────────────────────────────────────────────────────────
  const [content, setContent] = useState<CustomContent[]>(() => getCustomContent());
  const [showContentForm, setShowContentForm] = useState(false);
  const [contentForm, setContentForm] = useState(defContent());
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

  // Hidden TMDB IDs
  const [hiddenIds, setHiddenIds] = useState<number[]>(() => getHiddenTmdbIds());
  const [hideInput, setHideInput] = useState("");

  const handleHideId = () => {
    const id = parseInt(hideInput.trim(), 10);
    if (isNaN(id)) return;
    hideTmdbId(id);
    setHiddenIds(getHiddenTmdbIds());
    setHideInput("");
  };

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

  // ── Servers ──────────────────────────────────────────────────────────────
  const [servers, setServers] = useState<StreamServer[]>(() => getStreamServers());
  const [showServerForm, setShowServerForm] = useState(false);
  const [serverForm, setServerForm] = useState(defServer());
  const [editingServerId, setEditingServerId] = useState<string | null>(null);

  const handleSaveServer = () => {
    if (!serverForm.label.trim()) return;
    if (editingServerId) {
      updateStreamServer(editingServerId, serverForm);
    } else {
      addStreamServer(serverForm);
    }
    setServers(getStreamServers());
    setShowServerForm(false);
    setServerForm(defServer());
    setEditingServerId(null);
  };

  const startEditServer = (s: StreamServer) => {
    setServerForm({ label: s.label, movieUrl: s.movieUrl, tvUrl: s.tvUrl, isActive: s.isActive });
    setEditingServerId(s.id);
    setShowServerForm(true);
  };

  // ── Ads ──────────────────────────────────────────────────────────────────
  const [ads, setAds] = useState<CustomAd[]>(() => getCustomAds());
  const [showAdForm, setShowAdForm] = useState(false);
  const [adForm, setAdForm] = useState(defAd());

  // ── Ticker / Announcement ─────────────────────────────────────────────────
  const [tickerText, setTickerText] = useState(() => getAppConfig().announcementText);
  const [tickerSaved, setTickerSaved] = useState(false);

  const saveTicker = () => {
    const cfg = getAppConfig();
    saveAppConfig({ ...cfg, announcementText: tickerText });
    setTickerSaved(true);
    setTimeout(() => setTickerSaved(false), 2000);
  };

  // ── App Settings ──────────────────────────────────────────────────────────
  const [appCfg, setAppCfg] = useState<AppConfig>(() => getAppConfig());
  const [cfgSaved, setCfgSaved] = useState(false);

  const saveConfig = () => {
    saveAppConfig(appCfg);
    setCfgSaved(true);
    setTimeout(() => setCfgSaved(false), 2000);
  };

  // ── Categories ────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CustomCategory[]>(() => getCustomCategories());
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState(defCat());

  const TMDB_CATS = [
    { value: "trending", label: "Trending Now" },
    { value: "action", label: "Action & Adventure" },
    { value: "horror", label: "Horror" },
    { value: "comedy", label: "Comedy" },
    { value: "top-rated-series", label: "Top Rated Series" },
    { value: "top-rated", label: "Top Rated Movies" },
    { value: "drama", label: "Drama" },
    { value: "sci-fi", label: "Sci-Fi" },
  ];

  const TABS = [
    { key: "content"     as Tab, icon: Film,      labelEn: "Content",       labelAr: "المحتوى" },
    { key: "servers"     as Tab, icon: Server,     labelEn: "Servers",       labelAr: "الخوادم" },
    { key: "ads"         as Tab, icon: Image,      labelEn: "Ads",           labelAr: "الإعلانات" },
    { key: "ticker"      as Tab, icon: Megaphone,  labelEn: "Ticker",        labelAr: "الشريط" },
    { key: "appsettings" as Tab, icon: Settings2,  labelEn: "App Settings",  labelAr: "إعدادات التطبيق" },
    { key: "categories"  as Tab, icon: Layers,     labelEn: "Categories",    labelAr: "الأقسام" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/8 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Star size={14} className="text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white leading-none">
              <span className="text-primary">سرّاد</span>
              <span className="text-white/40 mx-1.5">|</span>
              {t("لوحة التحكم", "God-Mode Admin")}
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

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/8 bg-black/40 px-4 md:px-8 overflow-x-auto" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
        {TABS.map(({ key, icon: Icon, labelEn, labelAr }) => (
          <button
            key={key}
            data-testid={`tab-${key}`}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 md:px-5 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              tab === key ? "border-primary text-primary bg-primary/5" : "border-transparent text-white/40 hover:text-white hover:border-white/20"
            }`}
          >
            <Icon size={14} />
            {t(labelAr, labelEn)}
          </button>
        ))}
      </div>

      <div className="px-4 md:px-8 py-6 max-w-6xl">

        {/* ══════════════ CONTENT ══════════════ */}
        {tab === "content" && (
          <div>
            <div className={`flex items-center justify-between mb-5 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div>
                <h2 className="text-lg font-bold text-white">{t("إدارة المحتوى", "Content Manager")}</h2>
                <p className="text-white/30 text-xs mt-0.5">{t("أضف أفلاماً ومسلسلات مخصصة", "Add custom movies & series")}</p>
              </div>
              <button
                data-testid="button-add-content"
                onClick={() => { setShowContentForm(true); setContentForm(defContent()); }}
                className="flex items-center gap-2 bg-primary text-black px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                <Plus size={15} />{t("إضافة", "Add Content")}
              </button>
            </div>

            {showContentForm && (
              <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6 mb-6 shadow-xl">
                <h3 className="font-bold text-white mb-5">{t("إضافة محتوى جديد", "Add New Content")}</h3>
                <div className="mb-5 relative">
                  <label className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2 block">{t("بحث TMDB للملء التلقائي", "TMDB Auto-Fill")}</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input value={tmdbQuery} onChange={e => setTmdbQuery(e.target.value)} placeholder={t("اسم الفيلم...", "Movie or series name...")} className="w-full bg-zinc-800 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50" />
                  </div>
                  {tmdbResults.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 bg-zinc-800 border border-white/10 rounded-xl mt-1 max-h-52 overflow-y-auto shadow-2xl">
                      {tmdbResults.map(m => (
                        <button key={m.id} onClick={() => fillFromTmdb(m)} className="w-full text-left px-4 py-3 text-sm hover:bg-zinc-700 transition-colors flex items-center gap-3">
                          {m.poster_path && <img src={`${TMDB_W92}${m.poster_path}`} className="w-8 h-11 object-cover rounded-md flex-shrink-0" alt="" />}
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
                    { key: "title", label: "Title *" }, { key: "titleAr", label: "العنوان عربي" },
                    { key: "posterUrl", label: "Poster URL" }, { key: "backdropUrl", label: "Backdrop URL" },
                    { key: "videoUrl", label: "Custom Video URL" }, { key: "genres", label: "Genres" },
                    { key: "rating", label: "Rating" }, { key: "year", label: "Year" },
                    { key: "quality", label: "Quality" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs text-white/40 font-medium mb-1.5 block">{label}</label>
                      <input value={(contentForm as any)[key] ?? ""} onChange={e => setContentForm(f => ({ ...f, [key]: e.target.value }))} className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-white/15" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">Type</label>
                    <select value={contentForm.type} onChange={e => setContentForm(f => ({ ...f, type: e.target.value as "movie" | "series" }))} className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                      <option value="movie">🎬 Movie</option><option value="series">📺 Series</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input type="checkbox" checked={contentForm.isFeatured || false} onChange={e => setContentForm(f => ({ ...f, isFeatured: e.target.checked }))} className="accent-primary w-4 h-4" />
                  <span className="text-sm text-white/60">{t("عرض في الصفحة الرئيسية", "Feature on Home")}</span>
                </label>
                <div className={`flex gap-3 mt-6 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <button onClick={() => { if (!contentForm.title.trim()) return; const n = addCustomContent(contentForm); setContent(c => [n, ...c]); setShowContentForm(false); setContentForm(defContent()); }} className="bg-primary text-black px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 flex items-center gap-2"><CheckCircle size={15} />{t("حفظ", "Save")}</button>
                  <button onClick={() => { setShowContentForm(false); setContentForm(defContent()); }} className="bg-zinc-800 text-white/60 px-6 py-2.5 rounded-xl text-sm hover:bg-zinc-700">{t("إلغاء", "Cancel")}</button>
                </div>
              </div>
            )}

            {/* Hidden TMDB IDs section */}
            <div className="bg-zinc-900 border border-white/8 rounded-2xl p-4 mb-5">
              <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2"><EyeOff size={14} className="text-red-400" />{t("إخفاء محتوى TMDB", "Hide TMDB Content")}</h3>
              <div className="flex gap-2 mb-3">
                <input value={hideInput} onChange={e => setHideInput(e.target.value)} placeholder={t("أدخل TMDB ID للإخفاء", "Enter TMDB ID to hide")} className="flex-1 bg-zinc-800 border border-white/8 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 placeholder-white/20" />
                <button onClick={handleHideId} className="bg-red-500/15 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-500/25 transition-colors flex items-center gap-1.5"><EyeOff size={13} />{t("إخفاء", "Hide")}</button>
              </div>
              {hiddenIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {hiddenIds.map(id => (
                    <span key={id} className="flex items-center gap-1.5 bg-zinc-800 border border-white/8 text-white/60 text-xs px-3 py-1.5 rounded-full">
                      <Eye size={10} />
                      ID: {id}
                      <button onClick={() => { unhideTmdbId(id); setHiddenIds(getHiddenTmdbIds()); }} className="text-red-400 hover:text-red-300 ml-1">✕</button>
                    </span>
                  ))}
                </div>
              ) : <p className="text-white/25 text-xs">{t("لا توجد عناصر مخفية", "No hidden content")}</p>}
            </div>

            {content.length === 0 && !showContentForm && (
              <div className="text-center py-12 text-white/30"><Film size={36} className="mx-auto mb-3 opacity-30" /><p className="text-sm">{t("لا يوجد محتوى مخصص", "No custom content yet")}</p></div>
            )}
            <div className="space-y-2">
              {content.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 border border-white/5">
                  {item.posterUrl ? <img src={item.posterUrl} alt="" className="w-10 h-14 object-cover rounded-lg flex-shrink-0" /> : <div className="w-10 h-14 bg-zinc-800 rounded-lg flex-shrink-0 flex items-center justify-center"><Film size={14} className="text-white/20" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/40 uppercase bg-zinc-800 px-1.5 py-0.5 rounded">{item.type}</span>
                      {item.isFeatured && <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">{t("مميز", "Featured")}</span>}
                    </div>
                  </div>
                  <button onClick={() => { deleteCustomContent(item.id); setContent(getCustomContent()); }} className="p-2 text-white/25 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ SERVERS ══════════════ */}
        {tab === "servers" && (
          <div>
            <div className={`flex items-center justify-between mb-5 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div>
                <h2 className="text-lg font-bold text-white">{t("إدارة الخوادم", "Servers Manager")}</h2>
                <p className="text-white/30 text-xs mt-0.5">{t("أضف وعدّل خوادم البث العالمية", "Add and manage global streaming servers")}</p>
              </div>
              <button onClick={() => { setShowServerForm(true); setServerForm(defServer()); setEditingServerId(null); }} className="flex items-center gap-2 bg-primary text-black px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                <Plus size={15} />{t("إضافة خادم", "Add Server")}
              </button>
            </div>

            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl px-4 py-3 mb-4">
              <p className="text-white/30 text-xs">{t("الروابط تدعم المتغيرات:", "URL templates support:")} <code className="text-primary/80 bg-zinc-800 px-1.5 py-0.5 rounded">{"{id}"}</code> <code className="text-primary/80 bg-zinc-800 px-1.5 py-0.5 rounded">{"{season}"}</code> <code className="text-primary/80 bg-zinc-800 px-1.5 py-0.5 rounded">{"{episode}"}</code></p>
            </div>

            {showServerForm && (
              <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6 mb-6">
                <h3 className="font-bold text-white mb-4">{editingServerId ? t("تعديل خادم", "Edit Server") : t("خادم جديد", "New Server")}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">Server Label *</label>
                    <input value={serverForm.label} onChange={e => setServerForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Server 4" className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">Movie URL Template</label>
                    <input value={serverForm.movieUrl} onChange={e => setServerForm(f => ({ ...f, movieUrl: e.target.value }))} placeholder="https://example.com/embed/movie?tmdb={id}" className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">TV URL Template</label>
                    <input value={serverForm.tvUrl} onChange={e => setServerForm(f => ({ ...f, tvUrl: e.target.value }))} placeholder="https://example.com/embed/tv?tmdb={id}&season={season}&episode={episode}" className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-primary/50" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={serverForm.isActive} onChange={e => setServerForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-primary w-4 h-4" />
                    <span className="text-sm text-white/60">{t("تفعيل الخادم", "Activate server")}</span>
                  </label>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={handleSaveServer} className="bg-primary text-black px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"><Save size={14} />{t("حفظ", "Save")}</button>
                  <button onClick={() => { setShowServerForm(false); setEditingServerId(null); setServerForm(defServer()); }} className="bg-zinc-800 text-white/60 px-6 py-2.5 rounded-xl text-sm">{t("إلغاء", "Cancel")}</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {servers.map((s, idx) => (
                <div key={s.id} className={`bg-zinc-900 rounded-2xl border px-4 py-4 transition-all ${s.isActive ? "border-white/8" : "border-white/3 opacity-60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${s.isActive ? "bg-primary/15 text-primary border border-primary/30" : "bg-zinc-800 text-white/30"}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{s.label}</p>
                        <p className="text-white/25 text-[10px]">{s.isActive ? t("نشط", "Active") : t("معطّل", "Disabled")}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEditServer(s)} className="p-2 text-white/40 hover:text-primary transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => updateStreamServer(s.id, { isActive: !s.isActive })} className={`p-2 transition-colors ${s.isActive ? "text-green-400 hover:text-green-300" : "text-white/30 hover:text-green-400"}`}><Radio size={14} /></button>
                      <button onClick={() => { deleteStreamServer(s.id); setServers(getStreamServers()); }} className="p-2 text-white/25 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <p className="text-white/30 text-[10px] font-mono truncate">🎬 {s.movieUrl}</p>
                    <p className="text-white/30 text-[10px] font-mono truncate">📺 {s.tvUrl}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ ADS ══════════════ */}
        {tab === "ads" && (
          <div>
            <div className={`flex items-center justify-between mb-5 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div>
                <h2 className="text-lg font-bold text-white">{t("مدير الإعلانات", "Ads Manager")}</h2>
                <p className="text-white/30 text-xs mt-0.5">{t("إعلانات بانر وفيديو", "Banner and video ads")}</p>
              </div>
              <button onClick={() => { setShowAdForm(true); setAdForm(defAd()); }} className="flex items-center gap-2 bg-primary text-black px-4 py-2.5 rounded-xl text-sm font-bold">
                <Plus size={15} />{t("إضافة إعلان", "Add Ad")}
              </button>
            </div>

            {showAdForm && (
              <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6 mb-6">
                <h3 className="font-bold text-white mb-4">{t("إعلان جديد", "New Ad")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs text-white/40 font-medium mb-1.5 block">Title *</label><input value={adForm.title} onChange={e => setAdForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50" /></div>
                  <div><label className="text-xs text-white/40 font-medium mb-1.5 block">Type</label><select value={adForm.type} onChange={e => setAdForm(f => ({ ...f, type: e.target.value as "banner" | "video" }))} className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white"><option value="banner">🖼 Banner</option><option value="video">🎬 Video</option></select></div>
                  <div className="md:col-span-2"><label className="text-xs text-white/40 font-medium mb-1.5 block">{adForm.type === "banner" ? "Banner Image URL" : "Video URL"}</label><input value={adForm.type === "banner" ? (adForm.imageUrl || "") : (adForm.videoUrl || "")} onChange={e => setAdForm(f => adForm.type === "banner" ? { ...f, imageUrl: e.target.value } : { ...f, videoUrl: e.target.value })} className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50" /></div>
                  <div className="md:col-span-2"><label className="text-xs text-white/40 font-medium mb-1.5 block">Link URL</label><input value={adForm.linkUrl || ""} onChange={e => setAdForm(f => ({ ...f, linkUrl: e.target.value }))} className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50" /></div>
                </div>
                {adForm.imageUrl && <div className="mt-3"><p className="text-xs text-white/30 mb-2">Preview:</p><img src={adForm.imageUrl} alt="" className="h-16 rounded-xl object-cover border border-white/10" /></div>}
                <div className="flex gap-3 mt-5">
                  <button onClick={() => { if (!adForm.title.trim()) return; const n = addCustomAd(adForm); setAds(a => [n, ...a]); setShowAdForm(false); setAdForm(defAd()); }} className="bg-primary text-black px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"><CheckCircle size={15} />{t("حفظ", "Save")}</button>
                  <button onClick={() => setShowAdForm(false)} className="bg-zinc-800 text-white/60 px-6 py-2.5 rounded-xl text-sm">{t("إلغاء", "Cancel")}</button>
                </div>
              </div>
            )}

            {ads.length === 0 && !showAdForm && <div className="text-center py-12 text-white/30"><Image size={36} className="mx-auto mb-3 opacity-30" /><p className="text-sm">{t("لا توجد إعلانات", "No ads yet")}</p></div>}
            <div className="space-y-2">
              {ads.map(ad => (
                <div key={ad.id} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 border border-white/5">
                  {ad.imageUrl ? <img src={ad.imageUrl} alt="" className="w-20 h-12 object-cover rounded-lg flex-shrink-0" /> : <div className="w-20 h-12 bg-zinc-800 rounded-lg flex-shrink-0 flex items-center justify-center"><Video size={14} className="text-white/20" /></div>}
                  <div className="flex-1"><p className="text-white text-sm font-medium">{ad.title}</p><span className="text-[10px] text-white/40 bg-zinc-800 px-1.5 py-0.5 rounded">{ad.type}</span></div>
                  <button onClick={() => { deleteCustomAd(ad.id); setAds(getCustomAds()); }} className="p-2 text-white/25 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ TICKER ══════════════ */}
        {tab === "ticker" && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-white mb-1">{t("شريط الإعلانات", "Announcement Ticker")}</h2>
              <p className="text-white/30 text-xs">{t("نص الشريط المتحرك في أعلى الصفحة الرئيسية", "Scrolling text at the top of the home screen")}</p>
            </div>

            <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6">
              <label className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3 block">{t("نص الشريط", "Ticker Text")}</label>
              <textarea
                value={tickerText}
                onChange={e => setTickerText(e.target.value)}
                rows={4}
                placeholder={t("مثال: يتم إرسال إصدار جديد | New version coming soon...", "Example: New version dropping soon...")}
                className="w-full bg-zinc-800 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 resize-none leading-relaxed"
              />
              <p className="text-white/25 text-xs mt-2">{t("يظهر على الصفحة الرئيسية فوراً بعد الحفظ", "Appears on the home screen immediately after saving")}</p>

              <div className="mt-4 p-4 bg-zinc-800 rounded-xl border border-white/5">
                <p className="text-white/30 text-xs mb-2">{t("معاينة:", "Preview:")}</p>
                <div className="overflow-hidden bg-primary text-primary-foreground rounded-lg py-1.5 px-3">
                  <p className="text-sm font-medium truncate">{tickerText || t("(فارغ)", "(empty)")}</p>
                </div>
              </div>

              <button
                onClick={saveTicker}
                className="mt-4 flex items-center gap-2 bg-primary text-black px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                {tickerSaved ? <><CheckCircle size={15} />{t("تم الحفظ!", "Saved!")}</> : <><Save size={15} />{t("حفظ", "Save Ticker")}</>}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ APP SETTINGS ══════════════ */}
        {tab === "appsettings" && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-white mb-1">{t("إعدادات التطبيق", "App Settings")}</h2>
              <p className="text-white/30 text-xs">{t("رابط التحديث وروابط التواصل الاجتماعي", "App update link and social media links")}</p>
            </div>

            <div className="space-y-4">
              {/* APK Download */}
              <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Download size={16} className="text-primary" />{t("رابط تحديث التطبيق", "App Update Link")}</h3>
                <label className="text-xs text-white/40 font-medium mb-1.5 block">APK Download URL</label>
                <input
                  value={appCfg.apkDownloadUrl}
                  onChange={e => setAppCfg(c => ({ ...c, apkDownloadUrl: e.target.value }))}
                  placeholder="https://example.com/sarad-v2.apk"
                  className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                />
                <p className="text-white/25 text-xs mt-2">{t("يظهر في صفحة الإعدادات للمستخدمين", "Shown in Settings page for users to download")}</p>
              </div>

              {/* Social Links */}
              <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Globe size={16} className="text-primary" />{t("روابط التواصل الاجتماعي", "Social Media Links")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "telegram", label: "Telegram URL", placeholder: "https://t.me/sarad_tv", emoji: "✈️" },
                    { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/sarad_tv", emoji: "📸" },
                    { key: "youtube", label: "YouTube URL", placeholder: "https://youtube.com/@sarad_tv", emoji: "▶️" },
                    { key: "twitter", label: "X / Twitter URL", placeholder: "https://x.com/sarad_tv", emoji: "🐦" },
                  ].map(({ key, label, placeholder, emoji }) => (
                    <div key={key}>
                      <label className="text-xs text-white/40 font-medium mb-1.5 block">{emoji} {label}</label>
                      <input
                        value={(appCfg.socialLinks as any)[key] || ""}
                        onChange={e => setAppCfg(c => ({ ...c, socialLinks: { ...c.socialLinks, [key]: e.target.value } }))}
                        placeholder={placeholder}
                        className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Push Notifications */}
              <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Bell size={16} className="text-primary" />{t("الإشعارات", "Push Notifications")}</h3>
                <p className="text-white/40 text-sm mb-4">{t("لإرسال إشعار تجريبي لنفسك، استخدم هذا الزر:", "To send a test notification to yourself, use this button:")}</p>
                <button
                  onClick={() => {
                    if ("Notification" in window && Notification.permission === "granted") {
                      new Notification(t("سرّاد", "Sarad"), { body: t("هذا إشعار تجريبي من لوحة التحكم", "This is a test notification from Admin Dashboard"), icon: "/favicon.svg" });
                    } else {
                      Notification.requestPermission();
                    }
                  }}
                  className="flex items-center gap-2 bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-500/25 transition-colors"
                >
                  <Bell size={15} />
                  {t("إرسال إشعار تجريبي", "Send Test Notification")}
                </button>
                <p className="text-white/20 text-xs mt-3">{t("لدمج Firebase FCM، أضف مفتاح FIREBASE_SERVER_KEY في المتغيرات البيئية", "To integrate Firebase FCM, add FIREBASE_SERVER_KEY to environment variables")}</p>
              </div>

              {/* Debrid Integration */}
              <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                  <Zap size={16} className="text-primary" />
                  {t("تكامل Debrid — بث مباشر", "Debrid Integration — Direct Streaming")}
                </h3>
                <p className="text-white/30 text-xs mb-5">
                  {t(
                    "اربط خدمة Debrid لتشغيل مصادر Torrentio مباشرةً داخل مشغّل Video.js بدون أي نوافذ خارجية.",
                    "Connect a debrid service to play Torrentio sources directly in the Video.js player with no external windows."
                  )}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">{t("خدمة Debrid", "Debrid Service")}</label>
                    <select
                      value={appCfg.debrid?.service || "none"}
                      onChange={e => setAppCfg(c => ({ ...c, debrid: { ...c.debrid, service: e.target.value as any } }))}
                      className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                    >
                      <option value="none">{t("بدون Debrid (عرض معلومات الجودة فقط)", "None (quality info only)")}</option>
                      <option value="realdebrid">Real-Debrid</option>
                      <option value="alldebrid">AllDebrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 font-medium mb-1.5 block">
                      {t("مفتاح API", "API Key")}
                      {appCfg.debrid?.service === "realdebrid" && (
                        <a href="https://real-debrid.com/apitoken" target="_blank" rel="noreferrer" className="text-primary hover:underline ms-2 text-[10px]">
                          {t("احصل على المفتاح", "Get key →")}
                        </a>
                      )}
                      {appCfg.debrid?.service === "alldebrid" && (
                        <a href="https://alldebrid.com/apikeys/" target="_blank" rel="noreferrer" className="text-primary hover:underline ms-2 text-[10px]">
                          {t("احصل على المفتاح", "Get key →")}
                        </a>
                      )}
                    </label>
                    <input
                      type="password"
                      value={appCfg.debrid?.apiKey || ""}
                      onChange={e => setAppCfg(c => ({ ...c, debrid: { ...c.debrid, apiKey: e.target.value } }))}
                      placeholder={appCfg.debrid?.service === "none" ? t("اختر خدمة أولاً", "Choose a service first") : "API key..."}
                      disabled={!appCfg.debrid?.service || appCfg.debrid.service === "none"}
                      className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 disabled:opacity-40"
                    />
                  </div>
                </div>
                {appCfg.debrid?.service && appCfg.debrid.service !== "none" && (
                  <div className="mt-4 bg-primary/8 border border-primary/20 rounded-xl px-4 py-3 flex items-start gap-2">
                    <Zap size={13} className="text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-primary/80 text-xs leading-relaxed">
                      {t(
                        "بعد الحفظ، سيظهر زر «تشغيل مباشر» في صفحة المشاهدة تحت تبويب «مصادر ذكية». يحوّل Debrid رابط التورنت إلى بث HTTP مباشر داخل Video.js.",
                        "After saving, a 'Play Direct' button will appear on the watch page under 'Smart Streams'. Debrid converts the torrent link into a direct HTTP stream inside Video.js."
                      )}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={saveConfig}
                className="flex items-center gap-2 bg-primary text-black px-8 py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-[0_0_14px_rgba(212,175,55,0.3)]"
              >
                {cfgSaved ? <><CheckCircle size={15} />{t("تم الحفظ!", "All Saved!")}</> : <><Save size={15} />{t("حفظ جميع الإعدادات", "Save All Settings")}</>}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ CATEGORIES ══════════════ */}
        {tab === "categories" && (
          <div>
            <div className={`flex items-center justify-between mb-5 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div>
                <h2 className="text-lg font-bold text-white">{t("إدارة الأقسام", "Category Manager")}</h2>
                <p className="text-white/30 text-xs mt-0.5">{t("أنشئ أقساماً مخصصة على الصفحة الرئيسية", "Create custom sections on the home page")}</p>
              </div>
              <button onClick={() => { setShowCatForm(true); setCatForm(defCat()); }} className="flex items-center gap-2 bg-primary text-black px-4 py-2.5 rounded-xl text-sm font-bold">
                <Plus size={15} />{t("إضافة قسم", "Add Category")}
              </button>
            </div>

            {showCatForm && (
              <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6 mb-6">
                <h3 className="font-bold text-white mb-4">{t("قسم جديد", "New Category")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-xs text-white/40 font-medium mb-1.5 block">Name (English) *</label><input value={catForm.nameEn} onChange={e => setCatForm(f => ({ ...f, nameEn: e.target.value }))} className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50" /></div>
                  <div><label className="text-xs text-white/40 font-medium mb-1.5 block">الاسم (عربي)</label><input value={catForm.nameAr} onChange={e => setCatForm(f => ({ ...f, nameAr: e.target.value }))} className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50" /></div>
                  <div className="md:col-span-2"><label className="text-xs text-white/40 font-medium mb-1.5 block">TMDB Content Source</label><select value={catForm.tmdbCategoryType || ""} onChange={e => setCatForm(f => ({ ...f, tmdbCategoryType: e.target.value }))} className="w-full bg-zinc-800 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white"><option value="">-- Select --</option>{TMDB_CATS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => { if (!catForm.nameEn.trim()) return; const n = addCustomCategory(catForm); setCategories(c => [n, ...c]); setShowCatForm(false); setCatForm(defCat()); }} className="bg-primary text-black px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"><CheckCircle size={15} />{t("حفظ", "Save")}</button>
                  <button onClick={() => setShowCatForm(false)} className="bg-zinc-800 text-white/60 px-6 py-2.5 rounded-xl text-sm">{t("إلغاء", "Cancel")}</button>
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="text-xs text-white/30 font-semibold uppercase tracking-wider mb-3">{t("الأقسام الافتراضية", "Default Sections")}</p>
              <div className="space-y-2">
                {[
                  { en: "🔥 Trending Now", ar: "🔥 الأكثر رواجاً" },
                  { en: "⚡ Action & Adventure", ar: "⚡ أكشن ومغامرات" },
                  { en: "👻 Horror", ar: "👻 رعب" },
                  { en: "😂 Comedy", ar: "😂 كوميديا" },
                  { en: "⭐ Top Rated Series", ar: "⭐ أعلى المسلسلات" },
                ].map(cat => (
                  <div key={cat.en} className="flex items-center gap-3 bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <p className="text-white/70 text-sm flex-1">{isRTL ? cat.ar : cat.en}</p>
                    <span className="text-[10px] text-primary/60 bg-primary/10 px-2 py-0.5 rounded">{t("افتراضي", "Default")}</span>
                  </div>
                ))}
              </div>
            </div>

            {categories.length > 0 && (
              <div>
                <p className="text-xs text-white/30 font-semibold uppercase tracking-wider mb-3 mt-6">{t("الأقسام المخصصة", "Custom Sections")}</p>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 border border-white/5">
                      <Tag size={15} className="text-primary flex-shrink-0" />
                      <div className="flex-1"><p className="text-white text-sm font-medium">{cat.nameEn}</p>{cat.nameAr && <p className="text-white/40 text-xs">{cat.nameAr}</p>}</div>
                      <button onClick={() => { deleteCustomCategory(cat.id); setCategories(getCustomCategories()); }} className="p-2 text-white/25 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
