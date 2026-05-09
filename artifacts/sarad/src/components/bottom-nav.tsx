import { Link, useLocation } from "wouter";
import { Home, Search, Bookmark } from "lucide-react";
import { useLang } from "@/lib/language";

export function BottomNav() {
  const [location] = useLocation();
  const { t } = useLang();

  const items = [
    { href: "/", icon: Home, labelAr: "الرئيسية", labelEn: "Home" },
    { href: "/search", icon: Search, labelAr: "بحث", labelEn: "Search" },
    { href: "/list", icon: Bookmark, labelAr: "قائمتي", labelEn: "My List" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-center justify-around bg-zinc-950/95 border-t border-white/10 backdrop-blur-md py-2">
      {items.map(({ href, icon: Icon, labelAr, labelEn }) => {
        const active = location === href;
        return (
          <Link key={href} href={href}>
            <div
              data-testid={`nav-${href.replace("/", "") || "home"}`}
              className={`flex flex-col items-center gap-1 px-6 py-1 min-w-[60px] transition-colors cursor-pointer ${active ? "text-primary" : "text-white/50"}`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{t(labelAr, labelEn)}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
