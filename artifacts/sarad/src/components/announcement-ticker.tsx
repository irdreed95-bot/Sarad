import { useListAnnouncements } from "@workspace/api-client-react";
import { useLang } from "@/lib/language";
import { getAppConfig } from "@/lib/app-settings";

export function AnnouncementTicker() {
  const { data: announcements } = useListAnnouncements();
  const { t } = useLang();

  // Admin-configured text takes priority
  const adminText = getAppConfig().announcementText;
  const dbTexts = (announcements || []).map((a) => t(a.textAr || a.text, a.text));

  // Build ticker content: admin text first, then DB announcements
  const allTexts = adminText ? [adminText, ...dbTexts] : dbTexts;
  if (!allTexts.length) return null;

  const combined = allTexts.join("    •    ");

  return (
    <div className="w-full overflow-hidden bg-primary text-primary-foreground py-2 z-50 relative">
      <div className="flex whitespace-nowrap" style={{ animation: "sarad-ticker 35s linear infinite" }}>
        <span className="text-sm font-medium px-8">{combined}</span>
        <span className="text-sm font-medium px-8" aria-hidden>{combined}</span>
        <span className="text-sm font-medium px-8" aria-hidden>{combined}</span>
      </div>
      <style>{`
        @keyframes sarad-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
