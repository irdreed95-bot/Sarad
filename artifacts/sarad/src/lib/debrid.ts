/**
 * Client-side debrid resolution — no backend required.
 * Converts torrent infoHash → direct streamable HTTP URL via:
 *   Real-Debrid  https://api.real-debrid.com/rest/1.0
 *   AllDebrid    https://api.alldebrid.com/v4
 *
 * Inspired by doingodswork/deflix-stremio
 */

import type { DebridConfig } from "./app-settings";
import type { ParsedStream }  from "./stream-scraper";

const DEFAULT_TRACKERS = [
  "udp://opentracker.i2p.rocks:6969/announce",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://exodus.desync.com:6969",
  "http://tracker.openbittorrent.com:80/announce",
];

function buildMagnet(infoHash: string, filename?: string, extraTrackers?: string[]): string {
  const trs = [...(extraTrackers || []), ...DEFAULT_TRACKERS].slice(0, 10);
  return `magnet:?xt=urn:btih:${infoHash}${filename ? `&dn=${encodeURIComponent(filename)}` : ""}${trs.map(t => `&tr=${encodeURIComponent(t)}`).join("")}`;
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Real-Debrid ────────────────────────────────────────────────────────────────
async function resolveRealDebrid(
  infoHash: string,
  fileIdx: number,
  apiKey: string,
  magnetUri: string,
): Promise<string> {
  const base = "https://api.real-debrid.com/rest/1.0";
  const auth = { Authorization: `Bearer ${apiKey}` };
  const sig  = AbortSignal.timeout(12_000);

  const addRes = await fetch(`${base}/torrents/addMagnet`, {
    method:  "POST",
    headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" },
    body:    `magnet=${encodeURIComponent(magnetUri)}`,
    signal:  sig,
  });
  if (!addRes.ok) throw new Error(`Real-Debrid addMagnet: ${addRes.status}`);
  const { id: torrentId } = await addRes.json() as { id: string };

  await fetch(`${base}/torrents/selectFiles/${torrentId}`, {
    method:  "POST",
    headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" },
    body:    `files=${fileIdx + 1}`,
    signal:  AbortSignal.timeout(8_000),
  }).catch(() => undefined);

  for (let i = 0; i < 14; i++) {
    await delay(5_000);
    const infoRes = await fetch(`${base}/torrents/info/${torrentId}`, {
      headers: auth,
      signal:  AbortSignal.timeout(8_000),
    });
    const info = await infoRes.json() as any;
    if (info.status === "downloaded" && info.links?.length) {
      const unrRes = await fetch(`${base}/unrestrict/link`, {
        method:  "POST",
        headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" },
        body:    `link=${encodeURIComponent(info.links[0] as string)}`,
        signal:  AbortSignal.timeout(8_000),
      });
      const unr = await unrRes.json() as any;
      if (unr.download) return unr.download as string;
    }
    if (["error", "dead", "magnet_error"].includes(info.status as string)) {
      throw new Error(`Torrent status: ${info.status}`);
    }
  }
  throw new Error("Real-Debrid timeout — torrent still caching");
}

// ── AllDebrid ──────────────────────────────────────────────────────────────────
async function resolveAllDebrid(
  infoHash: string,
  fileIdx: number,
  apiKey: string,
  magnetUri: string,
): Promise<string> {
  const base  = "https://api.alldebrid.com/v4";
  const agent = "sarad";
  const q     = `agent=${agent}&apikey=${apiKey}`;

  const uploadRes = await fetch(`${base}/magnet/upload?${q}`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    `magnets[]=${encodeURIComponent(magnetUri)}`,
    signal:  AbortSignal.timeout(12_000),
  });
  const upload = await uploadRes.json() as any;
  const magnetId: string | number | undefined = upload.data?.magnets?.[0]?.id;
  if (!magnetId) throw new Error("AllDebrid upload failed");

  for (let i = 0; i < 14; i++) {
    await delay(5_000);
    const statusRes = await fetch(`${base}/magnet/status?${q}&id=${magnetId}`, {
      signal: AbortSignal.timeout(8_000),
    });
    const statusData = await statusRes.json() as any;
    const m = statusData.data?.magnets;
    if (m?.statusCode === 4 && m?.links?.length) {
      const linkToUnlock: string = m.links[fileIdx]?.link || m.links[0]?.link;
      const unlockRes = await fetch(`${base}/link/unlock?${q}`, {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    `link=${encodeURIComponent(linkToUnlock)}`,
        signal:  AbortSignal.timeout(8_000),
      });
      const unlocked = await unlockRes.json() as any;
      if (unlocked.data?.link) return unlocked.data.link as string;
    }
  }
  throw new Error("AllDebrid resolution timeout");
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function resolveDebrid(
  config: DebridConfig,
  stream: ParsedStream,
): Promise<string> {
  if (!config.apiKey || config.service === "none") {
    throw new Error("No debrid service configured");
  }
  const magnet = stream.magnetUri || buildMagnet(stream.infoHash, stream.filename);

  if (config.service === "realdebrid") {
    return resolveRealDebrid(stream.infoHash, stream.fileIdx, config.apiKey, magnet);
  }
  if (config.service === "alldebrid") {
    return resolveAllDebrid(stream.infoHash, stream.fileIdx, config.apiKey, magnet);
  }
  throw new Error(`Unsupported debrid service: ${config.service}`);
}
