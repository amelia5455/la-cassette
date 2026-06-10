import type { MatchedTrack, Service, SourceTrack } from "./types";
import { isDemo } from "./config";
import * as spotify from "./spotify";
import * as apple from "./apple";

/**
 * Match each source track to the target service by ISRC — the recording's
 * unique id — so the same recording lands on the other service, not just the
 * same title. Tracks without an ISRC, or whose ISRC isn't in the target
 * catalog, stay honestly unmatched (never faked).
 */
export async function matchTracks(tracks: SourceTrack[], target: Service): Promise<MatchedTrack[]> {
  if (isDemo(target)) {
    // No real target service configured: a track is "matched" iff it carries an
    // ISRC. This reproduces the prototype (only the live bootleg is unmatched).
    return tracks.map((t) => ({
      ...t,
      matched: Boolean(t.isrc),
      targetId: t.isrc ? `demo:${t.isrc}` : null,
    }));
  }

  const resolve = target === "spotify" ? spotify.findByIsrc : apple.findByIsrc;

  return Promise.all(
    tracks.map(async (t): Promise<MatchedTrack> => {
      if (!t.isrc) return { ...t, matched: false, targetId: null };
      try {
        const id = await resolve(t.isrc);
        return { ...t, matched: Boolean(id), targetId: id };
      } catch {
        return { ...t, matched: false, targetId: null };
      }
    }),
  );
}
