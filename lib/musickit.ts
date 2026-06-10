"use client";

import type { Playlist, SourceTrack } from "./types";
import { iconForName } from "./demo";

/**
 * Thin client-side wrapper around MusicKit JS v3. Used for the Apple Music side
 * (there is no server-side OAuth for Apple — the user token is obtained in the
 * browser). All functions throw if Apple isn't configured / the script fails.
 */

declare global {
  interface Window {
    MusicKit?: any;
  }
}

const MUSICKIT_SRC = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";

let configuredInstance: any | null = null;

async function fetchDeveloperToken(): Promise<{ token: string; storefront: string }> {
  const res = await fetch("/api/apple/token");
  const data = await res.json();
  if (!data.enabled || !data.token) throw new Error("Apple Music is not configured");
  return { token: data.token, storefront: data.storefront ?? "us" };
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.MusicKit) return resolve();
    const existing = document.querySelector(`script[src="${MUSICKIT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load MusicKit")));
      return;
    }
    const script = document.createElement("script");
    script.src = MUSICKIT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Failed to load MusicKit")));
    document.head.appendChild(script);
  });
}

export async function getMusicKit(): Promise<any> {
  if (configuredInstance) return configuredInstance;
  await loadScript();
  const { token } = await fetchDeveloperToken();
  // MusicKit may need a tick to attach to window after the script loads.
  if (!window.MusicKit) {
    await new Promise<void>((r) => {
      document.addEventListener("musickitloaded", () => r(), { once: true });
      setTimeout(r, 1500);
    });
  }
  await window.MusicKit.configure({
    developerToken: token,
    app: { name: "La Cassette", build: "1.0.0" },
  });
  configuredInstance = window.MusicKit.getInstance();
  return configuredInstance;
}

/** Prompt the user to authorize and return their Music-User-Token. */
export async function authorizeApple(): Promise<string> {
  const music = await getMusicKit();
  const userToken = await music.authorize();
  return userToken as string;
}

export async function appleLibraryPlaylists(): Promise<Playlist[]> {
  const music = await getMusicKit();
  const res = await music.api.music("v1/me/library/playlists", { limit: 50 });
  const items = res?.data?.data ?? [];
  return items.map((p: any) => ({
    id: p.id,
    name: p.attributes?.name ?? "Untitled",
    trackCount: p.attributes?.trackCount ?? 0,
    icon: iconForName(p.attributes?.name ?? "Untitled"),
  }));
}

export async function applePlaylistTracks(playlistId: string): Promise<SourceTrack[]> {
  const music = await getMusicKit();
  const tracks: SourceTrack[] = [];
  let url: string | null = `v1/me/library/playlists/${playlistId}/tracks?include=catalog&limit=100`;
  while (url) {
    const res: any = await music.api.music(url);
    const data = res?.data?.data ?? [];
    for (const t of data) {
      const attrs = t.attributes ?? {};
      const catalogIsrc = t.relationships?.catalog?.data?.[0]?.attributes?.isrc;
      tracks.push({
        title: attrs.name ?? "",
        artist: attrs.artistName ?? "",
        isrc: attrs.isrc ?? catalogIsrc ?? null,
      });
    }
    const next = res?.data?.next;
    url = next ? String(next).replace(/^https?:\/\/api\.music\.apple\.com\//, "") : null;
  }
  return tracks;
}
