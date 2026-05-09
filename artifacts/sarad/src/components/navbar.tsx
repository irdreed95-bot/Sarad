import { useLocation, Link } from "wouter";
import { Search, List, LogIn } from "lucide-react";
import { useLang } from "@/lib/language";

export function Navbar() {
  const [location] = useLocation();
  const { lang, setLang, t } = useLang();

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

      {/* Nav Links */}
      <nav className="flex items-center gap-6">
        <Link href="/" data-testid="link-home">
          <span className={`text-sm font-medium transition-colors cursor-pointer ${location === "/" ? "text-primary" : "text-white/70 hover:text-white"}`}>
            {t("الرئيسية", "Home")}
          </span>
        </Link>
        <Link href="/search" data-testid="link-search">
          <span className={`text-sm font-medium transition-colors cursor-pointer ${location === "/search" ? "text-primary" : "text-white/70 hover:text-white"}`}>
            {t("البحث", "Search")}
          </span>
        </Link>
        <Link href="/list" data-testid="link-my-list">
          <span className={`text-sm font-medium transition-colors cursor-pointer ${location === "/list" ? "text-primary" : "text-white/70 hover:text-white"}`}>
            {t("قائمتي", "My List")}
          </span>
        </Link>
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Language switcher */}
        <button
          data-testid="button-lang-switch"
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="text-xs font-bold border border-primary/40 text-primary px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors"
        >
          {lang === "ar" ? "EN" : "عربي"}
        </button>

        <Link href="/search">
          <button data-testid="button-search-icon" className="p-2 text-white/70 hover:text-white transition-colors">
            <Search size={18} />
          </button>
        </Link>

        <Link href="/list">
          <button data-testid="button-list-icon" className="p-2 text-white/70 hover:text-white transition-colors">
            <List size={18} />
          </button>
        </Link>
      </div>
    </header>
  );
}
