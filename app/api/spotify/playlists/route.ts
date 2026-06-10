import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
