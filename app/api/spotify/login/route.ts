import { NextRequest, NextResponse } from "next/server";
import { spotifyConfig } from "@/lib/config";
import { authorizeUrl, SENDER_SCOPES, RECEIVER_SCOPES } from "@/lib/spotify";
import { signState } from "@/lib/session";

/**
 * Kick off Spotify OAuth. `role=sender` requests read scopes; `role=receiver`
 * requests modify scopes. `returnTo` is where we send the user back afterwards.
 */
export async function GET(req: NextRequest) {
  if (!spotifyConfig.enabled) {
    return NextResponse.json({ error: "Spotify not configured" }, { status: 400 });
  }
  const role = req.nextUrl.searchParams.get("role") === "receiver" ? "receiver" : "sender";
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/";
  const scopes = role === "receiver" ? RECEIVER_SCOPES : SENDER_SCOPES;
  const state = await signState({ role, returnTo, n: cryptoNonce() });
  return NextResponse.redirect(authorizeUrl(state, scopes));
}

function cryptoNonce(): string {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
