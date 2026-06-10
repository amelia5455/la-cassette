import { NextRequest, NextResponse } from "next/server";
import { spotifyConfig } from "@/lib/config";
import { getTape } from "@/lib/store";
import { createPlaylist } from "@/lib/spotify";
import { validSpotifyToken } from "@/lib/spotify-session";

/** Receiver side: create a Spotify playlist from a tape's matched tracks. */
export async function POST(req: NextRequest) {
  const { tapeId } = (await req.json().catch(() => ({}))) as { tapeId?: string };
  if (!tapeId) return NextResponse.json({ error: "missing_tape" }, { status: 400 });

  const tape = await getTape(tapeId);
  if (!tape) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const trackIds = tape.tracks.filter((t) => t.matched && t.targetId).map((t) => t.targetId!);

  if (!spotifyConfig.enabled) {
    // Demo: pretend it was filed.
    return NextResponse.json({ demo: true, added: trackIds.length });
  }

  const token = await validSpotifyToken();
  if (!token) return NextResponse.json({ error: "not_connected" }, { status: 401 });

  try {
    const description = tape.note
      ? `${tape.note} — via La Cassette`
      : `A mixtape from ${tape.from} — via La Cassette`;
    const url = await createPlaylist(token, tape.title, description, trackIds);
    return NextResponse.json({ demo: false, added: trackIds.length, url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
