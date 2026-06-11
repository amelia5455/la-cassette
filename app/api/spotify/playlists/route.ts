import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { spotifyConfig } from "@/lib/config";
import { listPlaylists } from "@/lib/spotify";
import { validSpotifyToken } from "@/lib/spotify-session";
import { DEMO_PLAYLISTS } from "@/lib/demo";

export async function GET() {
  if (!spotifyConfig.enabled) {
    return NextResponse.json({ demo: true, playlists: DEMO_PLAYLISTS });
  }
  const token = await validSpotifyToken();
  if (!token) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }
  try {
    const playlists = await listPlaylists(token);
    return NextResponse.json({ demo: false, playlists });
  } catch (err) {
    const message = (err as Error).message;
    console.error("[spotify/playlists] failed:", message);
    // TEMP debug: persist the exact Spotify response so it can be inspected.
    try {
      await put("debug/spotify-error.txt", `${new Date().toISOString()}\n${message}\n`, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "text/plain",
        cacheControlMaxAge: 0,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    } catch {
      /* ignore */
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
