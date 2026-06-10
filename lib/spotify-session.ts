import { readSpotifySession, writeSpotifySession } from "./session";
import { refreshToken } from "./spotify";

/** Read the Spotify session and return a valid access token, refreshing if needed. */
export async function validSpotifyToken(): Promise<string | null> {
  const session = await readSpotifySession();
  if (!session) return null;
  if (session.expiresAt > Date.now() + 30_000) return session.accessToken;
  if (!session.refreshToken) return session.accessToken;
  try {
    const refreshed = await refreshToken(session.refreshToken);
    const next = {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? session.refreshToken,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      scopes: session.scopes,
    };
    await writeSpotifySession(next);
    return next.accessToken;
  } catch {
    return session.accessToken;
  }
}
