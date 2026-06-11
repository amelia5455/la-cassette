import { Redis } from "@upstash/redis";
import { put, head } from "@vercel/blob";
import type { Tape } from "./types";

/**
 * Tape persistence. One key (`tape:<id>` / `tapes/<id>.json`) → one JSON record.
 *
 * Backends, in priority order:
 *   1. Upstash Redis  — when KV_REST_API_* / UPSTASH_REDIS_REST_* are set.
 *   2. Vercel Blob    — when BLOB_READ_WRITE_TOKEN is set (a linked Blob store).
 *   3. In-memory map  — local-dev fallback; does NOT persist across serverless
 *                       invocations, so configure (1) or (2) in production.
 */

const TTL_SECONDS = 60 * 60 * 24 * 365; // keep a tape for a year

function redisFromEnv(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

const redis = redisFromEnv();
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const useBlob = !redis && Boolean(blobToken);

// Survive HMR / module reloads in dev.
const globalForStore = globalThis as unknown as { __tapes?: Map<string, Tape> };
const memory = globalForStore.__tapes ?? (globalForStore.__tapes = new Map<string, Tape>());

const redisKey = (id: string) => `tape:${id}`;
const blobPath = (id: string) => `tapes/${id}.json`;

export const storeIsPersistent = Boolean(redis) || useBlob;

export async function saveTape(tape: Tape): Promise<void> {
  if (redis) {
    await redis.set(redisKey(tape.id), tape, { ex: TTL_SECONDS });
  } else if (useBlob) {
    await put(blobPath(tape.id), JSON.stringify(tape), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: blobToken,
      cacheControlMaxAge: 0,
    });
  } else {
    memory.set(tape.id, tape);
  }
}

export async function getTape(id: string): Promise<Tape | null> {
  if (redis) {
    return (await redis.get<Tape>(redisKey(id))) ?? null;
  }
  if (useBlob) {
    try {
      const meta = await head(blobPath(id), { token: blobToken });
      const res = await fetch(meta.url, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as Tape;
    } catch {
      return null; // not found
    }
  }
  return memory.get(id) ?? null;
}

/** Short, URL-friendly id (e.g. "9f3a2c"). Crypto-random, collision-checked. */
export async function newTapeId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = randomId(6);
    if (!(await getTape(id))) return id;
  }
  return randomId(10);
}

function randomId(length: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
