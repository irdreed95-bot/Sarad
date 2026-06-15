/**
 * IMDb metadata utilities — no API key required.
 * Scrapes IMDb JSON-LD via allorigins CORS proxy.
 * Also provides helpers for building IMDb URLs.
 */

const ALLORIGINS = "https://api.allorigins.win/raw?url=";

export function getImdbUrl(imdbId: string): string {
  return `https://www.imdb.com/title/${imdbId}/`;
}

export interface ImdbRating {
  rating: string;   // e.g. "8.3"
  count: string;    // e.g. "1.2M"
}

/**
 * Fetch IMDb rating for any title.
 * Uses allorigins.win to bypass CORS and parses the JSON-LD schema embedded in the page.
 */
export async function fetchImdbRating(imdbId: string): Promise<ImdbRating | null> {
  if (!imdbId || !imdbId.startsWith("tt")) return null;
  try {
    const imdbUrl  = `https://www.imdb.com/title/${imdbId}/`;
    const proxyUrl = `${ALLORIGINS}${encodeURIComponent(imdbUrl)}`;
    const res      = await fetch(proxyUrl, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const html = await res.text();

    // JSON-LD schema embedded in IMDb pages
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]) as any;
        const agg    = jsonLd?.aggregateRating;
        if (agg?.ratingValue) {
          const count = parseInt(String(agg.ratingCount || "0"), 10);
          return {
            rating: String(agg.ratingValue),
            count:
              count >= 1_000_000 ? `${(count / 1_000_000).toFixed(1)}M` :
              count >= 1_000     ? `${Math.round(count / 1_000)}K`       :
              String(count),
          };
        }
      } catch { /* fall through to regex */ }
    }

    // Regex fallback
    const m = html.match(/"ratingValue"\s*:\s*"?([\d.]+)"?[\s\S]{0,200}"ratingCount"\s*:\s*"?(\d+)"?/);
    if (m) {
      const count = parseInt(m[2], 10);
      return {
        rating: m[1],
        count:
          count >= 1_000_000 ? `${(count / 1_000_000).toFixed(1)}M` :
          count >= 1_000     ? `${Math.round(count / 1_000)}K`       :
          String(count),
      };
    }
    return null;
  } catch { return null; }
}

/**
 * Extract the title from an IMDb page (for use when only the IMDb ID is known).
 */
export async function fetchImdbTitle(imdbId: string): Promise<string | null> {
  if (!imdbId) return null;
  try {
    const proxyUrl = `${ALLORIGINS}${encodeURIComponent(`https://www.imdb.com/title/${imdbId}/`)}`;
    const res      = await fetch(proxyUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const html = await res.text();
    const m    = html.match(/<title>([^<]+)<\/title>/i);
    if (!m) return null;
    return m[1].replace(/\s*-\s*IMDb.*$/i, "").trim();
  } catch { return null; }
}
