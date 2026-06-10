import { NextResponse } from "next/server";
import { spotifyConfig, appleConfig } from "@/lib/config";
import { readSpotifySession } from "@/lib/session";
import { storeIsPersistent } from "@/lib/store";

/** Tells the client which services are real vs. demo, and whether Spotify is connected. */
export async function GET() {
  const session = await readSpotifySession();
  return NextResponse.json({
    spotify: {
      enabled: spotifyConfig.enabled,
      connected: Boolean(session),
      scopes: session?.scopes ?? [],
    },
    apple: { enabled: appleConfig.enabled },
    persistentStore: storeIsPersistent,
  });
}
