import { NextRequest, NextResponse } from "next/server";
import { saveTape, newTapeId } from "@/lib/store";
import { baseUrl } from "@/lib/config";
import { isIconKey } from "@/lib/icons";
import type { MatchedTrack, Service, Tape } from "@/lib/types";

/** Create a tape record and return its id + share URL. */
export async function POST(req: NextRequest) {
  let body: Partial<Tape>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const tracks: MatchedTrack[] = Array.isArray(body.tracks) ? body.tracks : [];
  if (tracks.length === 0) {
    return NextResponse.json({ error: "no_tracks" }, { status: 400 });
  }

  const source: Service = body.source === "apple" ? "apple" : "spotify";
  const target: Service = source === "spotify" ? "apple" : "spotify";
  const icon = body.icon && isIconKey(body.icon) ? body.icon : "starfish2";

  const id = await newTapeId();
  const tape: Tape = {
    id,
    title: (body.title || "untitled tape").slice(0, 60),
    note: (body.note || "").slice(0, 200),
    color: typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : "#e26a48",
    icon,
    source,
    target,
    from: (body.from || "a friend").slice(0, 40),
    tracks,
    matchedCount: tracks.filter((t) => t.matched).length,
    totalCount: tracks.length,
    createdAt: Date.now(),
  };

  await saveTape(tape);
  return NextResponse.json({ id, url: `${baseUrl()}/t/${id}` });
}
