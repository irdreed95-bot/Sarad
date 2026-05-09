import { useListAnnouncements } from "@workspace/api-client-react";
import { useLang } from "@/lib/language";

export function AnnouncementTicker() {
  const { data: announcements } = useListAnnouncements();
  const { t } = useLang();

  if (!announcements || announcements.length === 0) return null;

  const texts = announcements.map((a) => t(a.textAr || a.text, a.text));
  const combined = texts.join("    •    ");

  return (
    <div className="w-full overflow-hidden bg-primary text-primary-foreground py-2 px-0 z-50">
      <div className="flex whitespace-nowrap" style={{ animation: "ticker 30s linear infinite" }}>
        <span className="text-sm font-medium px-8">{combined}</span>
        <span className="text-sm font-medium px-8" aria-hidden>{combined}</span>
        <span className="text-sm font-medium px-8" aria-hidden>{combined}</span>
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
