import { useLocation, Link } from "wouter";
import { Search, List, Globe, UserCog } from "lucide-react";
import { useLang } from "@/lib/language";
import { isAdminLoggedIn } from "@/lib/auth";

export function Navbar() {
  const [location] = useLocation();
  const { lang, setLang, t } = useLang();
  const isAdmin = isAdminLoggedIn();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 hidden md:flex items-center justify-between px-8 py-4 bg-gradient-to-b from-black/90 to-transparent backdrop-blur-sm">
      {/* Logo */}
      <Link href="/" data-testid="link-logo">
        <span
          className="text-2xl font-bold tracking-wider cursor-pointer select-none"
          style={{ fontFamily: "'Noto Sans Arabic', 'Inter', sans-serif" }}
        >
          <span className="text-primary">سرّاد</span>
          <span className="text-white/60 text-lg mx-2">|</span>
          <span className="text-white">Sarad</span>
        </span>
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-6">
        {[
          { href: "/", labelAr: "الرئيسية", labelEn: "Home" },
          { href: "/search", labelAr: "البحث", labelEn: "Search" },
          { href: "/list", labelAr: "قائمتي", labelEn: "My List" },
        ].map(({ href, labelAr, labelEn }) => (
          <Link key={href} href={href}>
            <span
              className={`text-sm font-medium transition-colors cursor-pointer ${
                location === href
                  ? "text-primary"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {t(labelAr, labelEn)}
            </span>
          </Link>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Language toggle with globe icon */}
        <button
          data-testid="button-lang-switch"
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          className="flex items-center gap-1.5 text-sm font-semibold border border-primary/40 text-primary px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors"
        >
          <Globe size={13} />
          {lang === "ar" ? "EN" : "عربي"}
        </button>

        <Link href="/search">
          <button
            data-testid="button-search-icon"
            className="p-2 text-white/70 hover:text-white transition-colors"
          >
            <Search size={18} />
          </button>
        </Link>

        <Link href="/list">
          <button
            data-testid="button-list-icon"
            className="p-2 text-white/70 hover:text-white transition-colors"
          >
            <List size={18} />
          </button>
        </Link>

        {/* Admin icon — always visible for access, gold if logged in */}
        <Link href={isAdmin ? "/admin/dashboard" : "/admin"}>
          <button
            data-testid="button-admin-icon"
            title={t("لوحة التحكم", "Admin")}
            className={`p-2 transition-colors rounded-lg ${
              isAdmin
                ? "text-primary hover:bg-primary/10"
                : "text-white/30 hover:text-white/60"
            }`}
          >
            <UserCog size={18} />
          </button>
        </Link>
      </div>
    </header>
  );
}
