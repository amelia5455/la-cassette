import type { IconKey, Playlist, Service, SourceTrack } from "./types";

/**
 * Demo fixtures used when a service isn't configured with real credentials.
 * These mirror the prototype exactly so the full UX runs end-to-end offline.
 */

export const DEMO_PLAYLISTS: Playlist[] = [
  { id: "demo-1", name: "songs i'd play you", trackCount: 10, durationLabel: "38 min", icon: "scallop" },
  { id: "demo-2", name: "windows down, coast road", trackCount: 19, durationLabel: "1 hr 06", icon: "wave" },
  { id: "demo-3", name: "negroni hour", trackCount: 12, durationLabel: "44 min", icon: "oyster" },
  { id: "demo-4", name: "last ferry to naxos", trackCount: 27, durationLabel: "1 hr 51", icon: "starfish" },
];

/**
 * The signature playlist's tracks, with real ISRCs so the matching service can
 * resolve them against a live target service when one is configured. The final
 * track is a live bootleg with no catalog ISRC — it stays honestly unmatched.
 */
export const DEMO_TRACKS: SourceTrack[] = [
  { title: "Motion Sickness", artist: "Phoebe Bridgers", isrc: "USDB51800006" },
  { title: "Cherry", artist: "Harry Styles", isrc: "USRC11700715" },
  { title: "The Less I Know the Better", artist: "Tame Impala", isrc: "AUUM71500303" },
  { title: "Pristine", artist: "Snail Mail", isrc: "US38Y1810016" },
  { title: "Sofia", artist: "Clairo", isrc: "US2X61936002" },
  { title: "Class of 2013", artist: "Mitski", isrc: "USZUD1215001" },
  { title: "Two Slow Dancers", artist: "Mitski", isrc: "US3DF1880241" },
  { title: "Seventeen", artist: "Sharon Van Etten", isrc: "USB4R1900126" },
  { title: "Dreams", artist: "Fleetwood Mac", isrc: "USEE10001880" },
  { title: "Motion Sickness (live bootleg)", artist: "Phoebe Bridgers", isrc: null },
];

export function demoTracksFor(_playlistId: string): SourceTrack[] {
  // The prototype always converts the same set; mirror that for any demo pick.
  return DEMO_TRACKS;
}

/** Pick a stable icon for a real playlist based on its name. */
export function iconForName(name: string): IconKey {
  const icons: IconKey[] = ["scallop", "wave", "oyster", "starfish", "conch", "scallop2", "oyster2", "starfish2"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return icons[hash % icons.length];
}

export const DEMO_FROM: Record<Service, string> = {
  spotify: "winoman",
  apple: "winoman",
};
