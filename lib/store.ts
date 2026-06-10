import { Redis } from "@upstash/redis";
import type { Tape } from "./types";

/**
 * Tape persistence. One key (`tape:<id>`) → one JSON record.
 *
 * Uses Upstash Redis when configured (the Vercel Marketplace integration sets
 * KV_REST_API_URL / KV_REST_API_TOKEN, or the native UPSTASH_* names). Falls
 * back to a process-global in-memory map for local development — this does NOT
 * persist across serverless invocations, so configure Redis for production.
 */

const TTL_SECONDS = 60 * 60 * 24 * 365; // keep a tape for a year

function redisFromEnv(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return new Redis({ url, token });
  }
  return null;
}

const redis = redisFromEnv();

// Survive HMR / module reloads in dev.
const globalForStore = globalThis as unknown as { __tapes?: Map<string, Tape> };
const memory = globalForStore.__tapes ?? (globalForStore.__tapes = new Map<string, Tape>());

const key = (id: string) => `tape:${id}`;

export const storeIsPersistent = Boolean(redis);

export async function saveTape(tape: Tape): Promise<void> {
  if (redis) {
    await redis.set(key(tape.id), tape, { ex: TTL_SECONDS });
  } else {
    memory.set(tape.id, tape);
  }
}

export async function getTape(id: string): Promise<Tape | null> {
  if (redis) {
    const value = await redis.get<Tape>(key(id));
    return value ?? null;
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
