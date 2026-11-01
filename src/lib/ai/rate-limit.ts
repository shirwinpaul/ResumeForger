/**
 * Per-IP sliding-window limiter for the AI routes.
 * In-memory, so on serverless it is best-effort: each warm instance has its own
 * counter and a cold start resets it (see README).
 */
import { AI_CONFIG } from "@/config/ai";

export interface RateLimiter {
  /** Records a hit. Returns 0 if allowed, else milliseconds until the next free slot. */
  hit(key: string, now?: number): number;
}

export function createRateLimiter(max: number = AI_CONFIG.rateLimit.max, windowMs: number = AI_CONFIG.rateLimit.windowMs): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    hit(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return recent.length ? windowMs - (now - recent[0]) : windowMs;
      }
      recent.push(now);
      hits.set(key, recent);
      // Keep memory bounded on long-lived instances.
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
      }
      return 0;
    },
  };
}

/** Client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "local";
}
