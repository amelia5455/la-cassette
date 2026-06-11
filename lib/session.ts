import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { sessionSecret } from "./config";

const secret = new TextEncoder().encode(sessionSecret);

export interface SpotifySession {
  accessToken: string;
  refreshToken?: string;
  /** epoch ms */
  expiresAt: number;
  scopes: string[];
}

export const SPOTIFY_COOKIE = "lc_spotify";

export function spotifyCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

/** Sign a session into the JWT string stored in the cookie. */
export async function signSpotifySession(session: SpotifySession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

/**
 * Write the session via the next/headers cookie store. Works for JSON
 * responses; for `redirect()` responses set the cookie on the NextResponse
 * directly (see the OAuth callback) — mutations here don't attach to redirects.
 */
export async function writeSpotifySession(session: SpotifySession): Promise<void> {
  const jwt = await signSpotifySession(session);
  const jar = await cookies();
  jar.set(SPOTIFY_COOKIE, jwt, spotifyCookieOptions());
}

export async function readSpotifySession(): Promise<SpotifySession | null> {
  const jar = await cookies();
  const raw = jar.get(SPOTIFY_COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret);
    return {
      accessToken: payload.accessToken as string,
      refreshToken: payload.refreshToken as string | undefined,
      expiresAt: payload.expiresAt as number,
      scopes: (payload.scopes as string[]) ?? [],
    };
  } catch {
    return null;
  }
}

export async function clearSpotifySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SPOTIFY_COOKIE);
}

/** Short-lived signed value used as the OAuth `state` (CSRF + flow context). */
export async function signState(data: Record<string, unknown>): Promise<string> {
  return new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

export async function verifyState<T = Record<string, unknown>>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as T;
  } catch {
    return null;
  }
}
