import { NextResponse } from "next/server";
import { clearSpotifySession } from "@/lib/session";

/** Disconnect the Spotify account (clears the session cookie). */
export async function POST() {
  await clearSpotifySession();
  return NextResponse.json({ ok: true });
}
