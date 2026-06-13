import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Globe, Moon, Sun, Bell, BellOff, Download, Trash2,
  ChevronRight, ArrowLeft, Check, Smartphone, Info,
} from "lucide-react";
import { useLang } from "@/lib/language";
import { useTheme } from "@/lib/theme";
import { getAppConfig } from "@/lib/app-settings";

const SEARCH_HISTORY_KEY = "sarad_search_history";

export default function SettingsPage() {
  const { t, lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const [, navigate] = useLocation();
  const [notifStatus, setNotifStatus] = useState<"default" | "granted" | "denied">("default");
  const [historyCleared, setHistoryCleared] = useState(false);
  const config = getAppConfig();

  useEffect(() => {
    if ("Notification" in window) {
      setNotifStatus(Notification.permission as "default" | "granted" | "denied");
    }
  }, []);

  const requestNotifications = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifStatus(result as "default" | "granted" | "denied");
    if (result === "granted") {
      new Notification(t("سرّاد", "Sarad"), {
        body: t("تم تفعيل الإشعارات بنجاح!", "Notifications enabled successfully!"),
        icon: "/favicon.svg",
      });
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    setHistoryCleared(true);
    setTimeout(() => setHistoryCleared(false), 2500);
  };

  const downloadUpdate = () => {
    if (config.apkDownloadUrl) {
      window.open(config.apkDownloadUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-10">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-white/8 px-4 md:px-8 py-4 flex items-center gap-3">
        <button
          onClick={() => history.back()}
          className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-white text-lg">{t("الإعدادات", "Settings")}</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 space-y-3">

        {/* ── Language ─────────────────────────────────────────────────── */}
        <SettingsSection title={t("اللغة والمنطقة", "Language & Region")}>
          <SettingsRow
            icon={<Globe size={18} className="text-primary" />}
            label={t("لغة التطبيق", "App Language")}
          >
            <div className="flex gap-2">
              {(["ar", "en"] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                    lang === l
                      ? "bg-primary text-black border-primary shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                      : "bg-zinc-900 text-white/60 border-white/10 hover:border-primary/40"
                  }`}
                >
                  {l === "ar" ? "العربية" : "English"}
                </button>
              ))}
            </div>
          </SettingsRow>
        </SettingsSection>

        {/* ── Theme ────────────────────────────────────────────────────── */}
        <SettingsSection title={t("المظهر", "Appearance")}>
          <SettingsRow
            icon={theme === "dark" ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-yellow-400" />}
            label={t("وضع العرض", "Display Mode")}
            sublabel={theme === "dark" ? t("الوضع المظلم", "Dark Mode") : t("الوضع الفاتح", "Light Mode")}
          >
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`relative w-14 h-7 rounded-full border transition-all duration-300 ${
                theme === "dark"
                  ? "bg-primary/20 border-primary/40"
                  : "bg-zinc-300 border-zinc-400"
              }`}
            >
              <span className={`absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center ${
                theme === "dark"
                  ? "left-7 bg-primary shadow-[0_0_8px_rgba(212,175,55,0.5)]"
                  : "left-0.5 bg-white shadow"
              }`}>
                {theme === "dark" ? <Moon size={12} className="text-black" /> : <Sun size={11} className="text-yellow-500" />}
              </span>
            </button>
          </SettingsRow>
        </SettingsSection>

        {/* ── Notifications ────────────────────────────────────────────── */}
        <SettingsSection title={t("الإشعارات", "Notifications")}>
          <SettingsRow
            icon={notifStatus === "granted" ? <Bell size={18} className="text-green-400" /> : <BellOff size={18} className="text-white/40" />}
            label={t("إشعارات التطبيق", "Push Notifications")}
            sublabel={
              notifStatus === "granted"
                ? t("مفعّل", "Enabled")
                : notifStatus === "denied"
                ? t("محظور في إعدادات المتصفح", "Blocked in browser settings")
                : t("للحصول على تنبيهات المحتوى الجديد", "Get alerts for new content")
            }
          >
            {notifStatus === "granted" ? (
              <span className="flex items-center gap-1.5 text-green-400 text-sm font-semibold">
                <Check size={14} />
                {t("مفعّل", "Active")}
              </span>
            ) : notifStatus === "denied" ? (
              <span className="text-red-400 text-xs">{t("محظور", "Blocked")}</span>
            ) : (
              <button
                onClick={requestNotifications}
                className="bg-primary text-black px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                {t("تفعيل", "Enable")}
              </button>
            )}
          </SettingsRow>
        </SettingsSection>

        {/* ── App Update ───────────────────────────────────────────────── */}
        <SettingsSection title={t("تحديث التطبيق", "App Update")}>
          <SettingsRow
            icon={<Download size={18} className="text-blue-400" />}
            label={t("تحميل آخر تحديث", "Download Latest Update")}
            sublabel={config.apkDownloadUrl ? t("رابط التحميل متاح", "Download link available") : t("لا يوجد تحديث متاح حالياً", "No update available yet")}
          >
            <button
              onClick={downloadUpdate}
              disabled={!config.apkDownloadUrl}
              className="flex items-center gap-1.5 bg-blue-500/15 text-blue-400 border border-blue-500/30 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Smartphone size={13} />
              {t("تحميل", "Download")}
            </button>
          </SettingsRow>
        </SettingsSection>

        {/* ── Privacy & Cache ──────────────────────────────────────────── */}
        <SettingsSection title={t("الخصوصية والبيانات", "Privacy & Data")}>
          <SettingsRow
            icon={<Trash2 size={18} className="text-red-400" />}
            label={t("مسح سجل البحث", "Clear Search History")}
            sublabel={historyCleared ? t("تم المسح بنجاح ✓", "Cleared successfully ✓") : t("حذف جميع عمليات البحث المحفوظة", "Delete all saved search queries")}
          >
            <button
              onClick={clearHistory}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                historyCleared
                  ? "bg-green-500/15 text-green-400 border-green-500/30"
                  : "bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20"
              }`}
            >
              {historyCleared ? t("✓ تم", "✓ Done") : t("مسح", "Clear")}
            </button>
          </SettingsRow>
        </SettingsSection>

        {/* ── About ────────────────────────────────────────────────────── */}
        <SettingsSection title={t("عن التطبيق", "About")}>
          <div className="px-4 py-4 space-y-3">
            <InfoRow label={t("الإصدار", "Version")} value="2.0.0" />
            <InfoRow label={t("المطور", "Developer")} value="Doreed" />
            <InfoRow label={t("الترخيص", "License")} value={t("جميع الحقوق محفوظة", "All Rights Reserved")} />
            <InfoRow label={t("الدعم", "Support")} value="t.me/sarad_tv" />
          </div>
        </SettingsSection>

        {/* Admin shortcut */}
        <button
          onClick={() => navigate("/admin")}
          className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-900 rounded-2xl border border-white/6 hover:border-primary/30 transition-all group"
        >
          <div className="flex items-center gap-3 text-white/40 group-hover:text-white/70">
            <Info size={16} />
            <span className="text-sm">{t("لوحة تحكم المسؤول", "Admin Dashboard")}</span>
          </div>
          <ChevronRight size={14} className="text-white/20" />
        </button>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-950 border border-white/6 rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/5">
        <p className="text-xs font-semibold text-white/35 uppercase tracking-wider">{title}</p>
      </div>
      {children}
    </div>
  );
}

function SettingsRow({
  icon, label, sublabel, children
}: { icon: React.ReactNode; label: string; sublabel?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium">{label}</p>
          {sublabel && <p className="text-white/35 text-xs mt-0.5 truncate">{sublabel}</p>}
        </div>
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/35 text-sm">{label}</span>
      <span className="text-white/70 text-sm font-medium">{value}</span>
    </div>
  );
}
