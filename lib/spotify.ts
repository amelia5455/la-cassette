import { spotifyConfig } from "./config";
import type { Playlist, SourceTrack } from "./types";
import { iconForName } from "./demo";

const API = "https://api.spotify.com/v1";
const ACCOUNTS = "https://accounts.spotify.com";

export const SENDER_SCOPES = ["playlist-read-private", "playlist-read-collaborative", "user-read-private"];
export const RECEIVER_SCOPES = ["playlist-modify-public", "playlist-modify-private", "user-read-private"];

export function authorizeUrl(state: string, scopes: string[]): string {
  const params = new URLSearchParams({
    client_id: spotifyConfig.clientId,
    response_type: "code",
    redirect_uri: spotifyConfig.redirectUri(),
    state,
    scope: scopes.join(" "),
    show_dialog: "false",
  });
  return `${ACCOUNTS}/authorize?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

function basicAuth(): string {
  return Buffer.from(`${spotifyConfig.clientId}:${spotifyConfig.clientSecret}`).toString("base64");
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: spotifyConfig.redirectUri(),
    }),
  });
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function refreshToken(refresh: string): Promise<TokenResponse> {
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });
  if (!res.ok) throw new Error(`Spotify refresh failed: ${res.status}`);
  return res.json();
}

/** App-only token (client credentials) for catalog search by ISRC. */
let appTokenCache: { token: string; expires: number } | null = null;
export async function appToken(): Promise<string> {
  if (appTokenCache && appTokenCache.expires > Date.now() + 30_000) return appTokenCache.token;
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Spotify client-credentials failed: ${res.status}`);
  const json: TokenResponse = await res.json();
  appTokenCache = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function currentUserId(token: string): Promise<string> {
  const me = await api<{ id: string; display_name?: string }>("/me", token);
  return me.id;
}

export async function currentUserName(token: string): Promise<string> {
  const me = await api<{ id: string; display_name?: string }>("/me", token);
  return me.display_name || me.id;
}

interface SpotifyPlaylistSummary {
  id: string;
  name: string | null;
  owner?: { id?: string } | null;
  // Spotify's current API exposes the track count under `items.total`;
  // older docs called it `tracks.total`. Accept either.
  items?: { total?: number } | null;
  tracks?: { total?: number } | null;
}

export async function listPlaylists(token: string): Promise<Playlist[]> {
  const me = await api<{ id: string }>("/me", token);

  // Page through everything (the user may follow many playlists).
  const all: (SpotifyPlaylistSummary | null)[] = [];
  let url: string | null = "/me/playlists?limit=50";
  while (url) {
    const page: { items: (SpotifyPlaylistSummary | null)[]; next: string | null } = await api(url, token);
    all.push(...(page.items ?? []));
    url = page.next ? page.next.replace(API, "") : null;
  }

  return all
    .filter((p): p is SpotifyPlaylistSummary => Boolean(p && p.id))
    // Only the playlists the user actually created — not ones they follow.
    .filter((p) => p.owner?.id === me.id)
    .map((p) => {
      const name = p.name ?? "Untitled";
      return {
        id: p.id,
        name,
        trackCount: p.items?.total ?? p.tracks?.total ?? 0,
        icon: iconForName(name),
      };
    });
}

interface SpotifyTrack {
  type?: string;
  name?: string | null;
  artists?: ({ name?: string } | null)[];
  external_ids?: { isrc?: string };
}

interface SpotifyTrackItem {
  // The current /playlists/{id}/items endpoint nests the track under `item`;
  // the legacy /tracks endpoint uses `track`. Support both.
  item?: SpotifyTrack | null;
  track?: SpotifyTrack | null;
}

function parseTrackItem(wrapper: SpotifyTrackItem | null): SourceTrack | null {
  const t = wrapper?.item ?? wrapper?.track;
  if (!t || t.type === "episode" || !t.name) return null;
  return {
    title: t.name,
    artist: (t.artists ?? []).map((a) => a?.name).filter(Boolean).join(", "),
    isrc: t.external_ids?.isrc ?? null,
  };
}

export async function playlistTracks(token: string, playlistId: string): Promise<SourceTrack[]> {
  // Spotify migrated playlist contents from /tracks to /items (and /tracks now
  // returns 403 for some apps). Prefer /items, fall back to /tracks.
  const attempts = [
    `/playlists/${playlistId}/items?limit=100&additional_types=track`,
    `/playlists/${playlistId}/tracks?limit=100&additional_types=track`,
  ];

  let first: { items: SpotifyTrackItem[]; next: string | null } | null = null;
  let lastStatus = 0;
  for (const path of attempts) {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      first = (await res.json()) as { items: SpotifyTrackItem[]; next: string | null };
      break;
    }
    lastStatus = res.status;
  }
  if (!first) {
    throw new Error(`Spotify playlist contents unavailable (HTTP ${lastStatus})`);
  }

  const tracks: SourceTrack[] = [];
  let page: { items: SpotifyTrackItem[]; next: string | null } | null = first;
  while (page) {
    for (const item of page.items ?? []) {
      const parsed = parseTrackItem(item);
      if (parsed) tracks.push(parsed);
    }
    page = page.next ? await api(page.next.replace(API, ""), token) : null;
  }
  return tracks;
}

/** Resolve an ISRC to a Spotify track id using an app token. */
export async function findByIsrc(isrc: string): Promise<string | null> {
  const token = await appToken();
  const data = await api<{ tracks: { items: { id: string }[] } }>(
    `/search?type=track&limit=1&q=${encodeURIComponent(`isrc:${isrc}`)}`,
    token,
  );
  return data.tracks.items[0]?.id ?? null;
}

export async function createPlaylist(
  token: string,
  name: string,
  description: string,
  trackIds: string[],
): Promise<string> {
  const userId = await currentUserId(token);
  const playlist = await api<{ id: string; external_urls: { spotify: string } }>(
    `/users/${userId}/playlists`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, public: false }),
    },
  );
  // Add in batches of 100.
  const uris = trackIds.map((id) => `spotify:track:${id}`);
  for (let i = 0; i < uris.length; i += 100) {
    await api(`/playlists/${playlist.id}/tracks`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: uris.slice(i, i + 100) }),
    });
  }
  return playlist.external_urls.spotify;
}
