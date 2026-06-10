import { NextResponse } from "next/server";
import { spotifyConfig, appleConfig } from "@/lib/config";
import { readSpotifySession } from "@/lib/session";
import { validSpotifyToken } from "@/lib/spotify-session";
import { currentUserName } from "@/lib/spotify";
import { storeIsPersistent } from "@/lib/store";

/** Tells the client which services are real vs. demo, and whether Spotify is connected. */
export async function GET() {
  const session = await readSpotifySession();

  // Best-effort: surface the connected account's display name.
  let name: string | null = null;
  if (session && spotifyConfig.enabled) {
    try {
      const token = await validSpotifyToken();
      if (token) name = await currentUserName(token);
    } catch {
      name = null;
    }
  }

  return NextResponse.json({
    spotify: {
      enabled: spotifyConfig.enabled,
      connected: Boolean(session),
      name,
      scopes: session?.scopes ?? [],
    },
    apple: { enabled: appleConfig.enabled },
    persistentStore: storeIsPersistent,
  });
}
