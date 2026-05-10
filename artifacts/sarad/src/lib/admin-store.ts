const ADMIN_KEY = "sarad_admin_v2";

export interface CustomContent {
  id: string;
  title: string;
  titleAr?: string;
  type: "movie" | "series";
  posterUrl?: string;
  backdropUrl?: string;
  videoUrl?: string;
  description?: string;
  descriptionAr?: string;
  rating?: number;
  year?: number;
  genres?: string;
  quality?: string;
  isFeatured?: boolean;
  tmdbId?: number;
  createdAt: number;
}

export interface CustomAd {
  id: string;
  title: string;
  type: "banner" | "video";
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  isActive: boolean;
  createdAt: number;
}

export interface CustomCategory {
  id: string;
  nameEn: string;
  nameAr: string;
  tmdbGenreId?: number;
  tmdbCategoryType?: string;
  createdAt: number;
}

interface AdminData {
  customContent: CustomContent[];
  customAds: CustomAd[];
  customCategories: CustomCategory[];
}

function load(): AdminData {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) return { customContent: [], customAds: [], customCategories: [] };
    return JSON.parse(raw);
  } catch {
    return { customContent: [], customAds: [], customCategories: [] };
  }
}

function save(data: AdminData): void {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(data));
}

// ---- Custom Content ----
export function getCustomContent(): CustomContent[] {
  return load().customContent;
}

export function addCustomContent(item: Omit<CustomContent, "id" | "createdAt">): CustomContent {
  const data = load();
  const newItem: CustomContent = { ...item, id: `cc_${Date.now()}`, createdAt: Date.now() };
  data.customContent = [newItem, ...data.customContent];
  save(data);
  return newItem;
}

export function deleteCustomContent(id: string): void {
  const data = load();
  data.customContent = data.customContent.filter(c => c.id !== id);
  save(data);
}

// ---- Custom Ads ----
export function getCustomAds(): CustomAd[] {
  return load().customAds;
}

export function addCustomAd(item: Omit<CustomAd, "id" | "createdAt">): CustomAd {
  const data = load();
  const newItem: CustomAd = { ...item, id: `ad_${Date.now()}`, createdAt: Date.now() };
  data.customAds = [newItem, ...data.customAds];
  save(data);
  return newItem;
}

export function deleteCustomAd(id: string): void {
  const data = load();
  data.customAds = data.customAds.filter(a => a.id !== id);
  save(data);
}

// ---- Custom Categories ----
export function getCustomCategories(): CustomCategory[] {
  return load().customCategories;
}

export function addCustomCategory(item: Omit<CustomCategory, "id" | "createdAt">): CustomCategory {
  const data = load();
  const newItem: CustomCategory = { ...item, id: `cat_${Date.now()}`, createdAt: Date.now() };
  data.customCategories = [newItem, ...data.customCategories];
  save(data);
  return newItem;
}

export function deleteCustomCategory(id: string): void {
  const data = load();
  data.customCategories = data.customCategories.filter(c => c.id !== id);
  save(data);
}
