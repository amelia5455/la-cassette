import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, SENDER_SCOPES, RECEIVER_SCOPES } from "@/lib/spotify";
import { writeSpotifySession, verifyState } from "@/lib/session";
import { baseUrl } from "@/lib/config";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !stateRaw) {
    return NextResponse.redirect(`${baseUrl()}/?spotify_error=1`);
  }
  const state = await verifyState<{ role: string; returnTo: string }>(stateRaw);
  if (!state) {
    return NextResponse.redirect(`${baseUrl()}/?spotify_error=1`);
  }

  try {
    const tokens = await exchangeCode(code);
    await writeSpotifySession({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      scopes: state.role === "receiver" ? RECEIVER_SCOPES : SENDER_SCOPES,
    });
    const dest = state.returnTo.startsWith("/") ? `${baseUrl()}${state.returnTo}` : state.returnTo;
    const url = new URL(dest);
    url.searchParams.set("spotify", "connected");
    return NextResponse.redirect(url.toString());
  } catch {
    return NextResponse.redirect(`${baseUrl()}/?spotify_error=1`);
  }
}
