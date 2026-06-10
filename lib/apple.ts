import { readFileSync } from "node:fs";
import { SignJWT, importPKCS8 } from "jose";
import { appleConfig } from "./config";

const API = "https://api.music.apple.com";

function privateKeyPem(): string {
  if (appleConfig.privateKey) {
    // Allow the PEM to be stored with literal "\n" sequences.
    return appleConfig.privateKey.replace(/\\n/g, "\n");
  }
  if (appleConfig.privateKeyPath) {
    return readFileSync(appleConfig.privateKeyPath, "utf8");
  }
  throw new Error("Apple private key not configured");
}

let tokenCache: { token: string; expires: number } | null = null;

/**
 * Sign a MusicKit developer token (ES256). Valid for ~6 months max; we mint a
 * 12h token and cache it. This token is safe to hand to MusicKit JS in the
 * browser.
 */
export async function developerToken(): Promise<string> {
  if (tokenCache && tokenCache.expires > Date.now() + 60_000) return tokenCache.token;
  const key = await importPKCS8(privateKeyPem(), "ES256");
  const now = Math.floor(Date.now() / 1000);
  const expSeconds = 60 * 60 * 12;
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: appleConfig.keyId })
    .setIssuer(appleConfig.teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + expSeconds)
    .sign(key);
  tokenCache = { token, expires: Date.now() + expSeconds * 1000 };
  return token;
}

async function catalogApi<T>(path: string): Promise<T> {
  const token = await developerToken();
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Apple ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Resolve an ISRC to an Apple Music catalog song id. */
export async function findByIsrc(isrc: string): Promise<string | null> {
  const storefront = appleConfig.storefront;
  const data = await catalogApi<{ data: { id: string }[] }>(
    `/v1/catalog/${storefront}/songs?filter[isrc]=${encodeURIComponent(isrc)}`,
  );
  return data.data[0]?.id ?? null;
}

/**
 * Create a new library playlist for the receiver and add the matched songs.
 * Requires the user's Music-User-Token (obtained client-side via MusicKit JS).
 */
export async function createLibraryPlaylist(
  musicUserToken: string,
  name: string,
  description: string,
  songIds: string[],
): Promise<void> {
  const token = await developerToken();
  const res = await fetch(`${API}/v1/me/library/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Music-User-Token": musicUserToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      attributes: { name, description },
      relationships: {
        tracks: {
          data: songIds.map((id) => ({ id, type: "songs" })),
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Apple create playlist failed: ${res.status} ${await res.text()}`);
  }
}
