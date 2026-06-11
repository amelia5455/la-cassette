import { readSpotifySession, writeSpotifySession, clearSpotifySession } from "./session";
import { refreshToken } from "./spotify";

/**
 * Read the Spotify session and return a valid access token, refreshing if
 * needed. Returns null when there is no usable session — including when the
 * access token has expired and we cannot refresh it (no refresh token, or the
 * refresh call failed). In that case the dead cookie is cleared so the caller
 * gets a clean 401 and can re-authenticate (seamlessly, since Spotify
 * remembers the prior approval). We never return a known-expired token.
 */
export async function validSpotifyToken(): Promise<string | null> {
  const session = await readSpotifySession();
  if (!session) return null;

  // Still valid (with a little headroom).
  if (session.expiresAt > Date.now() + 30_000) return session.accessToken;

  // Expired and nothing to refresh with → dead session.
  if (!session.refreshToken) {
    await clearSpotifySession();
    return null;
  }

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
    // Refresh failed (revoked / invalid) → drop the dead session.
    await clearSpotifySession();
    return null;
  }
}
