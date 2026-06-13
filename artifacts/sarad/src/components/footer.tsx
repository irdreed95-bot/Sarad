import { Link } from "wouter";
import { Heart } from "lucide-react";
import { getAppConfig } from "@/lib/app-settings";
import { useLang } from "@/lib/language";

// Social media SVG icons
function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function Footer() {
  const { t } = useLang();
  const config = getAppConfig();
  const { socialLinks } = config;

  const links = [
    { href: "/", label: t("الرئيسية", "Home") },
    { href: "/search", label: t("البحث", "Search") },
    { href: "/list", label: t("قائمتي", "My List") },
    { href: "/live", label: t("قنوات مباشرة", "Live TV") },
    { href: "/settings", label: t("الإعدادات", "Settings") },
  ];

  const socials = [
    { href: socialLinks.telegram, icon: <TelegramIcon />, label: "Telegram", color: "hover:text-blue-400" },
    { href: socialLinks.instagram, icon: <InstagramIcon />, label: "Instagram", color: "hover:text-pink-500" },
    { href: socialLinks.youtube, icon: <YouTubeIcon />, label: "YouTube", color: "hover:text-red-500" },
    { href: socialLinks.twitter, icon: <TwitterIcon />, label: "X / Twitter", color: "hover:text-sky-400" },
  ].filter(s => s.href);

  return (
    <footer className="bg-zinc-950 border-t border-white/8 mt-12 pb-28 md:pb-10">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        {/* Top row: Logo + social */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          {/* Logo */}
          <Link href="/">
            <span className="text-2xl font-bold cursor-pointer">
              <span className="text-primary">سرّاد</span>
              <span className="text-white/40 mx-2">|</span>
              <span className="text-white">Sarad</span>
            </span>
          </Link>

          {/* Social icons */}
          {socials.length > 0 && (
            <div className="flex items-center gap-3">
              {socials.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  className={`w-9 h-9 rounded-xl bg-zinc-900 border border-white/8 flex items-center justify-center text-white/50 ${s.color} hover:border-white/20 hover:bg-zinc-800 transition-all`}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/6 mb-6" />

        {/* Nav links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8">
          {links.map(({ href, label }) => (
            <Link key={href} href={href}>
              <span className="text-white/40 hover:text-primary text-sm transition-colors cursor-pointer">
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* Copyright */}
        <div className="text-center">
          <p className="text-white/25 text-xs flex items-center justify-center gap-1.5 flex-wrap">
            <span>Made with</span>
            <Heart size={11} className="text-red-500 fill-red-500" />
            <span>by the Founder</span>
            <span className="text-primary font-semibold">Doreed</span>
            <span className="text-white/15">•</span>
            <span>© 2026 Sarad | سرّاد</span>
            <span className="text-white/15">•</span>
            <span>{t("جميع الحقوق محفوظة", "All rights reserved")}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
