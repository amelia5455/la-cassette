export type Service = "spotify" | "apple";

export type IconKey =
  | "scallop"
  | "starfish"
  | "conch"
  | "wave"
  | "oyster"
  | "scallop2"
  | "oyster2"
  | "starfish2";

/** A track as read from the source service. */
export interface SourceTrack {
  title: string;
  artist: string;
  /** International Standard Recording Code — the recording's unique id. */
  isrc: string | null;
}

/** A track after matching against the target service. */
export interface MatchedTrack {
  title: string;
  artist: string;
  isrc: string | null;
  matched: boolean;
  /** Identifier on the target service (Spotify track id / Apple catalog id). */
  targetId: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  trackCount: number;
  /** Pre-formatted duration label, e.g. "38 min" or "1 hr 06" (optional). */
  durationLabel?: string;
  /** Icon used as the playlist's artwork tile in the picker. */
  icon: IconKey;
}

/** One tape = one stored JSON record. */
export interface Tape {
  id: string;
  title: string;
  note: string;
  color: string;
  icon: IconKey;
  source: Service;
  target: Service;
  /** Display label for who it's from, e.g. "winoman". */
  from: string;
  tracks: MatchedTrack[];
  matchedCount: number;
  totalCount: number;
  createdAt: number;
}

export interface PlatformInfo {
  name: string;
  low: string;
}

export const PLATFORMS: Record<Service, PlatformInfo> = {
  spotify: { name: "Spotify", low: "spotify" },
  apple: { name: "Apple Music", low: "apple music" },
};
