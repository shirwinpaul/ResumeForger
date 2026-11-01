/**
 * ALL AI provider settings live in this one file.
 *
 * Model IDs checked against the official docs on 2026-10-22:
 *  - Gemini: https://ai.google.dev/gemini-api/docs/models  (free tier: Standard inference)
 *  - Groq:   https://console.groq.com/docs/models + /docs/rate-limits
 * Models get renamed and retired often — re-check these pages if calls start failing.
 */

export const AI_CONFIG = {
  gemini: {
    /** Flash-class, free tier, supports MINIMAL thinking. */
    model: "gemini-3.6-flash",
    /** Gemini 3.x uses a thinking *level* rather than a token budget. */
    thinkingLevel: "MINIMAL",
    temperature: 0.4,
  },
  groq: {
    /** Groq's free-tier text model (the Llama models are now contact-sales only). */
    model: "openai/gpt-oss-120b",
    reasoningEffort: "low" as const,
    temperature: 0.4,
    /** Free-tier tokens-per-minute; requests estimated above this are not attempted. */
    tokensPerMinute: 8000,
  },
  /** Abort a provider call after this long and fall back. */
  timeoutMs: 30_000,
  /** Longest we will wait on a Gemini 429 retry-after before falling back to Groq. */
  maxRetryAfterWaitMs: 10_000,
  /** Per-IP rate limit for all AI routes (in-memory, best-effort on serverless). */
  rateLimit: { max: 40, windowMs: 60 * 60 * 1000 },
  /** Vercel Hobby allows up to 60s for functions. */
  maxDurationSeconds: 60,
} as const;

/** Output-token caps per AI action — keep answers short and the free quota healthy. */
export const OUTPUT_TOKEN_CAPS = {
  bullets: 500,
  polish: 500,
  summary: 350,
  skills: 700,
  tailor: 1800,
  activity: 900,
  grammar: 1200,
  import: 3500,
  trim: 600,
} as const;

/** Header used to send a user's own Gemini key (Bring Your Own Key). */
export const BYOK_HEADER = "x-gemini-key";
