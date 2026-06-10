import { NextRequest, NextResponse } from "next/server";
import { appleConfig } from "@/lib/config";
import { getTape } from "@/lib/store";
import { createLibraryPlaylist } from "@/lib/apple";

/** Receiver side: create an Apple Music library playlist from a tape's matched tracks. */
export async function POST(req: NextRequest) {
  const { tapeId, musicUserToken } = (await req.json().catch(() => ({}))) as {
    tapeId?: string;
    musicUserToken?: string;
  };
  if (!tapeId) return NextResponse.json({ error: "missing_tape" }, { status: 400 });

  const tape = await getTape(tapeId);
  if (!tape) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const songIds = tape.tracks.filter((t) => t.matched && t.targetId).map((t) => t.targetId!);

  if (!appleConfig.enabled) {
    return NextResponse.json({ demo: true, added: songIds.length });
  }
  if (!musicUserToken) {
    return NextResponse.json({ error: "missing_user_token" }, { status: 400 });
  }

  try {
    const description = tape.note
      ? `${tape.note} — via La Cassette`
      : `A mixtape from ${tape.from} — via La Cassette`;
    await createLibraryPlaylist(musicUserToken, tape.title, description, songIds);
    return NextResponse.json({ demo: false, added: songIds.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
