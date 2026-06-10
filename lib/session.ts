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

const COOKIE = "lc_spotify";

export async function writeSpotifySession(session: SpotifySession): Promise<void> {
  const jwt = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  const jar = await cookies();
  jar.set(COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function readSpotifySession(): Promise<SpotifySession | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
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
  jar.delete(COOKIE);
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
