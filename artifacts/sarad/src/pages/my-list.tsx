import { useState, useEffect } from "react";
import { useListContent } from "@workspace/api-client-react";
import { ContentCard } from "@/components/content-card";
import { useLang } from "@/lib/language";
import { getMyList } from "@/lib/auth";
import { Bookmark } from "lucide-react";
import { useLocation } from "wouter";

export default function MyListPage() {
  const { t, isRTL } = useLang();
  const { data: allContent } = useListContent();
  const [listIds, setListIds] = useState<number[]>([]);
  const [, navigate] = useLocation();

  useEffect(() => {
    setListIds(getMyList());
  }, []);

  const listItems = (allContent || []).filter((c) => listIds.includes(c.id));

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-24 md:pb-8 px-4 md:px-8">
      <h1 className={`text-2xl font-bold text-white mt-6 mb-8 ${isRTL ? "text-right" : "text-left"}`}>
        {t("قائمتي", "My List")}
        {listItems.length > 0 && (
          <span className="text-primary/60 text-base font-normal ms-2">({listItems.length})</span>
        )}
      </h1>

      {listItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6 border border-white/5">
            <Bookmark size={32} className="text-white/25" />
          </div>
          <p className="text-white/50 text-lg mb-2">{t("قائمتك فارغة", "Your list is empty")}</p>
          <p className="text-white/30 text-sm mb-6">
            {t("أضف أفلاماً ومسلسلات لمشاهدتها لاحقاً", "Add movies and series to watch later")}
          </p>
          <button
            data-testid="button-browse"
            onClick={() => navigate("/")}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {t("تصفح المحتوى", "Browse Content")}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {listItems.map((item) => (
            <ContentCard
              key={item.id}
              id={item.id}
              title={item.title}
              titleAr={item.titleAr}
              posterUrl={item.posterUrl}
              rating={item.rating}
              year={item.year}
              type={item.type}
              quality={item.quality}
            />
          ))}
        </div>
      )}
    </div>
  );
}
