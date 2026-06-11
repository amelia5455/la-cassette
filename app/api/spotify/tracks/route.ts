import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { spotifyConfig } from "@/lib/config";
import { playlistTracks } from "@/lib/spotify";
import { validSpotifyToken } from "@/lib/spotify-session";
import { readSpotifySession } from "@/lib/session";
import { demoTracksFor } from "@/lib/demo";

export async function GET(req: NextRequest) {
  const playlistId = req.nextUrl.searchParams.get("playlistId") ?? "";
  if (!spotifyConfig.enabled) {
    return NextResponse.json({ demo: true, tracks: demoTracksFor(playlistId) });
  }
  // TEMP debug: record the granted scopes.
  try {
    const s = await readSpotifySession();
    await put("debug/scopes.txt", JSON.stringify(s?.scopes ?? null), {
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
  const token = await validSpotifyToken();
  if (!token) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }
  try {
    const tracks = await playlistTracks(token, playlistId);
    return NextResponse.json({ demo: false, tracks });
  } catch (err) {
    console.error("[spotify/tracks] failed:", (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
