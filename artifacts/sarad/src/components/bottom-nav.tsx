import { Link, useLocation } from "wouter";
import { Home, Search, Bookmark, Settings, Tv } from "lucide-react";
import { useLang } from "@/lib/language";

export function BottomNav() {
  const [location] = useLocation();
  const { t } = useLang();

  const items = [
    { href: "/",        icon: Home,     labelAr: "الرئيسية",    labelEn: "Home",     testId: "nav-home" },
    { href: "/search",  icon: Search,   labelAr: "بحث",         labelEn: "Search",   testId: "nav-search" },
    { href: "/live",    icon: Tv,       labelAr: "مباشر",       labelEn: "Live",     testId: "nav-live",    live: true },
    { href: "/list",    icon: Bookmark, labelAr: "قائمتي",      labelEn: "My List",  testId: "nav-list" },
    { href: "/settings",icon: Settings, labelAr: "الإعدادات",  labelEn: "Settings", testId: "nav-settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-center justify-around bg-zinc-950/97 border-t border-white/10 backdrop-blur-md py-1">
      {items.map(({ href, icon: Icon, labelAr, labelEn, testId, live }) => {
        const active = location === href || (href !== "/" && location.startsWith(href));
        return (
          <Link key={href} href={href}>
            <div
              data-testid={testId}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors cursor-pointer relative ${
                active ? "text-primary" : "text-white/50"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              {live && !active && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
              <span className="text-[10px] font-medium">{t(labelAr, labelEn)}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
