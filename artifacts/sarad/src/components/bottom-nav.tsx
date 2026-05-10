import { Link, useLocation } from "wouter";
import { Home, Search, Bookmark, Globe, UserCog } from "lucide-react";
import { useLang } from "@/lib/language";
import { isAdminLoggedIn } from "@/lib/auth";

export function BottomNav() {
  const [location] = useLocation();
  const { lang, setLang, t } = useLang();
  const isAdmin = isAdminLoggedIn();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-center justify-around bg-zinc-950/95 border-t border-white/10 backdrop-blur-md py-1">
      {/* Home */}
      <Link href="/">
        <div
          data-testid="nav-home"
          className={`flex flex-col items-center gap-0.5 px-4 py-2 transition-colors cursor-pointer ${
            location === "/" ? "text-primary" : "text-white/50"
          }`}
        >
          <Home size={20} strokeWidth={location === "/" ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">{t("الرئيسية", "Home")}</span>
        </div>
      </Link>

      {/* Search */}
      <Link href="/search">
        <div
          data-testid="nav-search"
          className={`flex flex-col items-center gap-0.5 px-4 py-2 transition-colors cursor-pointer ${
            location === "/search" ? "text-primary" : "text-white/50"
          }`}
        >
          <Search size={20} strokeWidth={location === "/search" ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">{t("بحث", "Search")}</span>
        </div>
      </Link>

      {/* My List */}
      <Link href="/list">
        <div
          data-testid="nav-list"
          className={`flex flex-col items-center gap-0.5 px-4 py-2 transition-colors cursor-pointer ${
            location === "/list" ? "text-primary" : "text-white/50"
          }`}
        >
          <Bookmark size={20} strokeWidth={location === "/list" ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">{t("قائمتي", "My List")}</span>
        </div>
      </Link>

      {/* Language toggle */}
      <button
        data-testid="button-lang-switch-mobile"
        onClick={() => setLang(lang === "ar" ? "en" : "ar")}
        className="flex flex-col items-center gap-0.5 px-4 py-2 text-white/50 hover:text-primary transition-colors"
      >
        <Globe size={20} strokeWidth={1.5} />
        <span className="text-[10px] font-medium">{lang === "ar" ? "EN" : "عربي"}</span>
      </button>

      {/* Admin */}
      <Link href={isAdmin ? "/admin/dashboard" : "/admin"}>
        <div
          data-testid="nav-admin"
          className={`flex flex-col items-center gap-0.5 px-4 py-2 transition-colors cursor-pointer ${
            location.startsWith("/admin") ? "text-primary" : "text-white/30"
          }`}
        >
          <UserCog size={20} strokeWidth={1.5} />
          <span className="text-[10px] font-medium">{t("إدارة", "Admin")}</span>
        </div>
      </Link>
    </nav>
  );
}
