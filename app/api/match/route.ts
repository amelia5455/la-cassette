import { NextRequest, NextResponse } from "next/server";
import { matchTracks } from "@/lib/match";
import type { Service, SourceTrack } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: { tracks?: SourceTrack[]; target?: Service };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const tracks = Array.isArray(body.tracks) ? body.tracks : [];
  const target: Service = body.target === "spotify" ? "spotify" : "apple";
  if (tracks.length === 0) {
    return NextResponse.json({ error: "no_tracks" }, { status: 400 });
  }
  try {
    const matched = await matchTracks(tracks, target);
    const matchedCount = matched.filter((t) => t.matched).length;
    return NextResponse.json({ tracks: matched, matchedCount, totalCount: matched.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
