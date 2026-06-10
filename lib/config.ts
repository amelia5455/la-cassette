/** Centralised environment access + capability flags. */

export function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export const spotifyConfig = {
  clientId: process.env.SPOTIFY_CLIENT_ID ?? "",
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
  get enabled() {
    return Boolean(this.clientId && this.clientSecret);
  },
  redirectUri() {
    return `${baseUrl()}/api/spotify/callback`;
  },
};

export const appleConfig = {
  teamId: process.env.APPLE_TEAM_ID ?? "",
  keyId: process.env.APPLE_KEY_ID ?? "",
  privateKey: process.env.APPLE_PRIVATE_KEY ?? "",
  privateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH ?? "",
  storefront: process.env.APPLE_STOREFRONT ?? "us",
  get enabled() {
    return Boolean(this.teamId && this.keyId && (this.privateKey || this.privateKeyPath));
  },
};

export const sessionSecret = process.env.SESSION_SECRET ?? "la-cassette-dev-secret";

/** True when neither real service for a given role is configured. */
export function isDemo(service: "spotify" | "apple"): boolean {
  return service === "spotify" ? !spotifyConfig.enabled : !appleConfig.enabled;
}
