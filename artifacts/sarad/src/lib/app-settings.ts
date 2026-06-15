// Global admin-controlled app settings — stored in localStorage

const SETTINGS_KEY = "sarad_app_settings_v2";

export interface StreamServer {
  id: string;
  label: string;
  movieUrl: string;   // template with {id}
  tvUrl: string;      // template with {id}, {season}, {episode}
  isActive: boolean;
}

export interface SocialLinks {
  telegram: string;
  instagram: string;
  youtube: string;
  twitter: string;
}

export interface DebridConfig {
  service: "none" | "realdebrid" | "alldebrid";
  apiKey: string;
}

export interface AppConfig {
  announcementText: string;
  apkDownloadUrl: string;
  socialLinks: SocialLinks;
  pushNotificationsEnabled: boolean;
  debrid: DebridConfig;
  orionApiKey: string;
}

export interface AppSettings {
  servers: StreamServer[];
  config: AppConfig;
  hiddenTmdbIds: number[];
}

const DEFAULT_SERVERS: StreamServer[] = [
  {
    id: "vidsrc",
    label: "Server 1",
    movieUrl: "https://vidsrc.me/embed/movie?tmdb={id}",
    tvUrl: "https://vidsrc.me/embed/tv?tmdb={id}&season={season}&episode={episode}",
    isActive: true,
  },
  {
    id: "2embed",
    label: "Server 2",
    movieUrl: "https://2embed.cc/embed/{id}",
    tvUrl: "https://2embed.cc/embed/tv?tmdb={id}&season={season}&episode={episode}",
    isActive: true,
  },
  {
    id: "superembed",
    label: "Server 3",
    movieUrl: "https://superembed.stream/movie/{id}",
    tvUrl: "https://superembed.stream/tv/{id}/{season}/{episode}",
    isActive: true,
  },
];

const DEFAULT_DEBRID: DebridConfig = { service: "none", apiKey: "" };

const DEFAULT_CONFIG: AppConfig = {
  announcementText:
    "مرحباً بكم في سرّاد — البث المميز للأفلام والمسلسلات | Welcome to Sarad — Your Premium Streaming Destination",
  apkDownloadUrl: "",
  socialLinks: {
    telegram: "https://t.me/sarad_tv",
    instagram: "https://instagram.com/sarad_tv",
    youtube: "https://youtube.com/@sarad_tv",
    twitter: "https://x.com/sarad_tv",
  },
  pushNotificationsEnabled: false,
  debrid: DEFAULT_DEBRID,
  orionApiKey: "",
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { servers: DEFAULT_SERVERS, config: DEFAULT_CONFIG, hiddenTmdbIds: [] };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      servers: parsed.servers?.length ? parsed.servers : DEFAULT_SERVERS,
      config: { ...DEFAULT_CONFIG, ...parsed.config, socialLinks: { ...DEFAULT_CONFIG.socialLinks, ...parsed.config?.socialLinks }, debrid: { ...DEFAULT_DEBRID, ...parsed.config?.debrid }, orionApiKey: parsed.config?.orionApiKey ?? "" },
      hiddenTmdbIds: parsed.hiddenTmdbIds || [],
    };
  } catch {
    return { servers: DEFAULT_SERVERS, config: DEFAULT_CONFIG, hiddenTmdbIds: [] };
  }
}

function save(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Stream Servers ───────────────────────────────────────────────────────────
export function getStreamServers(): StreamServer[] {
  return load().servers;
}

export function getActiveServers(): StreamServer[] {
  return load().servers.filter(s => s.isActive);
}

export function saveStreamServers(servers: StreamServer[]): void {
  const settings = load();
  settings.servers = servers;
  save(settings);
}

export function addStreamServer(server: Omit<StreamServer, "id">): StreamServer {
  const settings = load();
  const newServer: StreamServer = { ...server, id: `srv_${Date.now()}` };
  settings.servers = [...settings.servers, newServer];
  save(settings);
  return newServer;
}

export function updateStreamServer(id: string, updates: Partial<StreamServer>): void {
  const settings = load();
  settings.servers = settings.servers.map(s => s.id === id ? { ...s, ...updates } : s);
  save(settings);
}

export function deleteStreamServer(id: string): void {
  const settings = load();
  settings.servers = settings.servers.filter(s => s.id !== id);
  save(settings);
}

// ── URL Builders ─────────────────────────────────────────────────────────────
export function buildMovieUrl(server: StreamServer, tmdbId: number): string {
  return server.movieUrl.replace(/\{id\}/g, String(tmdbId));
}

export function buildTvUrl(server: StreamServer, tmdbId: number, season: number, episode: number): string {
  return server.tvUrl
    .replace(/\{id\}/g, String(tmdbId))
    .replace(/\{season\}/g, String(season))
    .replace(/\{episode\}/g, String(episode));
}

// ── App Config ───────────────────────────────────────────────────────────────
export function getAppConfig(): AppConfig {
  return load().config;
}

export function saveAppConfig(config: AppConfig): void {
  const settings = load();
  settings.config = config;
  save(settings);
}

// ── Hidden TMDB IDs ──────────────────────────────────────────────────────────
export function getHiddenTmdbIds(): number[] {
  return load().hiddenTmdbIds;
}

export function hideTmdbId(id: number): void {
  const settings = load();
  if (!settings.hiddenTmdbIds.includes(id)) {
    settings.hiddenTmdbIds = [...settings.hiddenTmdbIds, id];
    save(settings);
  }
}

export function unhideTmdbId(id: number): void {
  const settings = load();
  settings.hiddenTmdbIds = settings.hiddenTmdbIds.filter(i => i !== id);
  save(settings);
}
