import { useState } from "react";
import { ArrowLeft, Tv, Radio, Copy, ExternalLink, Check, Wifi } from "lucide-react";
import { useLang } from "@/lib/language";

interface Channel {
  id: string;
  name: string;
  logo: string;
  url: string;
  group: string;
}

// Parsed from http://kazimmt.ami.bd/playlist/wc.m3u
const CHANNELS: Channel[] = [
  {
    id: "ch1",
    name: "T Sports HD 1",
    logo: "https://i.ibb.co.com/h1Wvy09C/1000283988.png",
    url: "http://rgkkw.live:80/live/1Aoen7elp5/IgMJ60tmAa/130714.ts",
    group: "FIFA",
  },
  {
    id: "ch2",
    name: "T Sports HD 2",
    logo: "https://i.ibb.co.com/h1Wvy09C/1000283988.png",
    url: "http://starhub.pro/live/farhat-3379/67897-913379/130714.ts",
    group: "Sports",
  },
  {
    id: "ch3",
    name: "UNITE8 SPORTS 1",
    logo: "https://i.ibb.co/k6KQwhFN/1000284104.png",
    url: "http://starhub.pro/live/farhat-3379/67897-913379/741567.ts",
    group: "Sports",
  },
  {
    id: "ch4",
    name: "UNITE8 SPORTS 2",
    logo: "https://i.ibb.co/S4DXyQkZ/1000284105.png",
    url: "http://starhub.pro/live/farhat-3379/67897-913379/98841.ts",
    group: "Sports",
  },
  {
    id: "ch5",
    name: "beIN Sports 1 Max",
    logo: "https://i.ibb.co/mCFTjfx6/1000284328.png",
    url: "http://starhub.pro/live/farhat-3379/67897-913379/744523.ts",
    group: "beIN Sports",
  },
  {
    id: "ch6",
    name: "beIN Sports 2 Max",
    logo: "https://i.ibb.co/4ZLsq041/1000284329.png",
    url: "http://starhub.pro/live/farhat-3379/67897-913379/744524.ts",
    group: "beIN Sports",
  },
  {
    id: "ch7",
    name: "beIN Sports 5 Max",
    logo: "https://i.ibb.co/JWVj7khh/1000284377.png",
    url: "http://starhub.pro/live/farhat-3379/67897-913379/744527.ts",
    group: "beIN Sports",
  },
  {
    id: "ch8",
    name: "FUSSBALL.TV1",
    logo: "https://i.ibb.co.com/nMBnLS9h/1000284536.png",
    url: "http://starhub.pro/live/farhat-3379/67897-913379/742610.ts",
    group: "Sports",
  },
  {
    id: "ch9",
    name: "FUSSBALL.TV2",
    logo: "https://i.ibb.co.com/TD6fkDPj/1000284537.png",
    url: "http://starhub.pro/live/farhat-3379/67897-913379/742611.ts",
    group: "Sports",
  },
  {
    id: "ch10",
    name: "FUSSBALL.TV1 4K",
    logo: "https://i.ibb.co.com/nMBnLS9h/1000284536.png",
    url: "http://starhub.pro/live/farhat-3379/67897-913379/745269.ts",
    group: "Sports",
  },
  {
    id: "ch11",
    name: "NOW TV 4K",
    logo: "https://i.ibb.co/C32Rhtff/1000284518.png",
    url: "http://starhub.pro/live/farhat-3379/67897-913379/745270.ts",
    group: "Sports",
  },
  {
    id: "ch12",
    name: "BEIN 1 FHD",
    logo: "https://raw.githubusercontent.com/sm-monirulislam/SM-Live-TV/main/Script/world_cup.png",
    url: "http://1.la5liga.store:80/play/oOuLyOr0l4zfSQqe-48swyrUC_d5JG7Wj1gX3MfuOaHcCaCD-hqEbP027yBVHqJ4",
    group: "FIFA WC 2026",
  },
  {
    id: "ch13",
    name: "BEIN 4 MAX FHD",
    logo: "https://raw.githubusercontent.com/sm-monirulislam/SM-Live-TV/main/Script/world_cup.png",
    url: "http://1.la5liga.store:80/play/oOuLyOr0l4zfSQqe-48swyrUC_d5JG7Wj1gX3MfuOaE4OM3tuyzL533bO9nJYOIc",
    group: "FIFA WC 2026",
  },
];

const GROUPS = ["All", ...Array.from(new Set(CHANNELS.map(c => c.group)))];

export default function LiveTvPage() {
  const { t, isRTL } = useLang();
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [selected, setSelected] = useState<Channel | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = selectedGroup === "All" ? CHANNELS : CHANNELS.filter(c => c.group === selectedGroup);

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-10">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/8 px-4 md:px-8 py-4 flex items-center gap-3">
        <button
          onClick={() => history.back()}
          className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h1 className="font-bold text-white text-lg">{t("قنوات مباشرة — كرة القدم", "Live Football Channels")}</h1>
        </div>
        <span className="ms-auto text-white/30 text-xs bg-zinc-900 px-2 py-1 rounded-lg border border-white/5">
          {CHANNELS.length} {t("قناة", "channels")}
        </span>
      </div>

      {/* Info banner */}
      <div className="mx-4 md:mx-8 mt-4 bg-blue-500/8 border border-blue-500/20 rounded-2xl px-4 py-3 flex items-start gap-3">
        <Wifi size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-blue-300/80 text-xs leading-relaxed">
          {t(
            "للمشاهدة، انقر على 'فتح القناة' أو 'نسخ الرابط' لاستخدامه في مشغّل خارجي مثل VLC. بعض المتصفحات قد لا تدعم تشغيل هذه البثوث مباشرة.",
            "To watch, click 'Open Channel' or 'Copy URL' to use with an external player like VLC. Some browsers may not support direct playback of these streams."
          )}
        </p>
      </div>

      {/* Group filter tabs */}
      <div
        className="flex gap-2 px-4 md:px-8 py-4 overflow-x-auto"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {GROUPS.map(group => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
              selectedGroup === group
                ? "bg-primary text-black border-primary shadow-[0_0_14px_rgba(212,175,55,0.35)]"
                : "bg-zinc-900 text-white/60 border-white/10 hover:border-primary/40 hover:text-white"
            }`}
          >
            {group === "All" ? t("الكل", "All") : group}
          </button>
        ))}
      </div>

      {/* Selected channel player */}
      {selected && (
        <div className="mx-4 md:mx-8 mb-4 bg-zinc-950 border border-primary/25 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.1)]">
          <div className={`flex items-center gap-3 p-4 border-b border-white/8 ${isRTL ? "flex-row-reverse" : ""}`}>
            <img
              src={selected.logo}
              alt={selected.name}
              className="w-10 h-10 object-contain rounded-xl bg-zinc-800 border border-white/10 p-1"
              onError={e => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{selected.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-[10px] font-semibold uppercase tracking-wide">{t("بث مباشر", "LIVE")}</span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Try native video */}
            <div className="w-full bg-zinc-900 rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
              <video
                key={selected.id}
                controls
                autoPlay
                className="w-full h-full"
                poster=""
                onError={() => {}}
              >
                <source src={selected.url} type="video/MP2T" />
                <source src={selected.url} />
              </video>
            </div>

            {/* Action buttons */}
            <div className={`flex gap-2 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-primary text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                <ExternalLink size={14} />
                {t("فتح القناة", "Open Channel")}
              </a>
              <button
                onClick={() => copyUrl(selected.url, selected.id + "_player")}
                className="flex items-center gap-2 bg-zinc-800 text-white/70 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-700 border border-white/10 transition-colors"
              >
                {copied === selected.id + "_player" ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                {copied === selected.id + "_player" ? t("تم النسخ!", "Copied!") : t("نسخ الرابط", "Copy URL")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel grid */}
      <div className="px-4 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(ch => (
            <div
              key={ch.id}
              className={`bg-zinc-950 border rounded-2xl overflow-hidden transition-all ${
                selected?.id === ch.id
                  ? "border-primary/60 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                  : "border-white/6 hover:border-white/15"
              }`}
            >
              {/* Channel info */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/3 transition-colors"
                onClick={() => setSelected(selected?.id === ch.id ? null : ch)}
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/8 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img
                    src={ch.logo}
                    alt={ch.name}
                    className="w-full h-full object-contain p-1"
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.innerHTML = `<div class="text-primary text-xl">📡</div>`;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{ch.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Radio size={9} className="text-red-400" />
                    <span className="text-white/35 text-[10px]">{ch.group}</span>
                  </div>
                </div>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  selected?.id === ch.id ? "bg-primary" : "bg-white/5"
                }`}>
                  <Tv size={13} className={selected?.id === ch.id ? "text-black" : "text-white/40"} />
                </div>
              </div>

              {/* Action row */}
              <div className="flex border-t border-white/5">
                <a
                  href={ch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white/50 hover:text-primary hover:bg-primary/5 transition-colors text-xs font-medium border-e border-white/5"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink size={12} />
                  {t("فتح", "Open")}
                </a>
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white/50 hover:text-primary hover:bg-primary/5 transition-colors text-xs font-medium"
                  onClick={e => { e.stopPropagation(); copyUrl(ch.url, ch.id); }}
                >
                  {copied === ch.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copied === ch.id ? t("تم!", "Done!") : t("نسخ", "Copy")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
