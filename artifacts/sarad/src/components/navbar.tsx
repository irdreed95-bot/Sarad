import { useLocation, Link } from "wouter";
import { Search, List, UserCog, Tv, Settings } from "lucide-react";
import { useLang } from "@/lib/language";
import { isAdminLoggedIn } from "@/lib/auth";

export function Navbar() {
  const [location] = useLocation();
  const { t } = useLang();
  const isAdmin = isAdminLoggedIn();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 hidden md:flex items-center justify-between px-8 py-4 bg-gradient-to-b from-black/90 to-transparent backdrop-blur-sm">
      {/* Logo */}
      <Link href="/" data-testid="link-logo">
        <span className="text-2xl font-bold tracking-wider cursor-pointer select-none" style={{ fontFamily: "'Noto Sans Arabic', 'Inter', sans-serif" }}>
          <span className="text-primary">سرّاد</span>
          <span className="text-white/60 text-lg mx-2">|</span>
          <span className="text-white">Sarad</span>
        </span>
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-6">
        {[
          { href: "/",       labelAr: "الرئيسية",     labelEn: "Home" },
          { href: "/search", labelAr: "البحث",         labelEn: "Search" },
          { href: "/list",   labelAr: "قائمتي",        labelEn: "My List" },
          { href: "/live",   labelAr: "قنوات مباشرة",  labelEn: "Live TV" },
        ].map(({ href, labelAr, labelEn }) => (
          <Link key={href} href={href}>
            <span className={`text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              location === href ? "text-primary" : "text-white/70 hover:text-white"
            }`}>
              {href === "/live" && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />}
              {t(labelAr, labelEn)}
            </span>
          </Link>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <Link href="/search">
          <button data-testid="button-search-icon" className="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <Search size={18} />
          </button>
        </Link>
        <Link href="/list">
          <button data-testid="button-list-icon" className="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <List size={18} />
          </button>
        </Link>
        <Link href="/live">
          <button data-testid="button-live-icon" title={t("قنوات مباشرة", "Live TV")} className="p-2 text-white/70 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5 relative">
            <Tv size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          </button>
        </Link>
        <Link href="/settings">
          <button data-testid="button-settings-icon" title={t("الإعدادات", "Settings")} className={`p-2 transition-colors rounded-lg hover:bg-white/5 ${location === "/settings" ? "text-primary" : "text-white/70 hover:text-white"}`}>
            <Settings size={18} />
          </button>
        </Link>
        <Link href={isAdmin ? "/admin/dashboard" : "/admin"}>
          <button data-testid="button-admin-icon" title={t("لوحة التحكم", "Admin")} className={`p-2 transition-colors rounded-lg ${isAdmin ? "text-primary hover:bg-primary/10" : "text-white/25 hover:text-white/50 hover:bg-white/5"}`}>
            <UserCog size={18} />
          </button>
        </Link>
      </div>
    </header>
  );
}
