import type { IconKey } from "./types";

/**
 * Shell / seaside icons used throughout the app. The artwork lives as PNGs in
 * /public/icons (extracted verbatim from the prototype). Each is rendered as an
 * <img> styled to fill its container with a soft drop shadow — matching the
 * prototype's `[data-icon] svg` look.
 */
export const ICON_KEYS: IconKey[] = [
  "scallop",
  "starfish",
  "conch",
  "wave",
  "oyster",
  "scallop2",
  "oyster2",
  "starfish2",
];

export function iconSrc(key: IconKey): string {
  return `/icons/${key}.png`;
}

export function isIconKey(value: string): value is IconKey {
  return (ICON_KEYS as string[]).includes(value);
}
