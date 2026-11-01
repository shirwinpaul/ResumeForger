/**
 * Runs ONE AI action: Gemini first, Groq as fallback.
 *
 *  - Gemini 429 with retry-after ≤ ~10s → wait, retry once, then fall back.
 *  - Daily quota, 5xx, timeout (> 30s) or network error → fall back to Groq.
 *  - Output must be strict JSON that passes Zod (+ optional code validation);
 *    on failure retry once on the same provider with the error appended,
 *    then fall back.
 *  - Groq is skipped when the estimated tokens exceed its free-tier TPM.
 *
 * Providers and timing are injected so this is unit-testable with mocks.
 * Logs contain only provider, status, error type and retry-after — never
 * keys or resume text.
 */
import type { z } from "zod";
import { AI_CONFIG } from "@/config/ai";
import { ProviderError, type AiErrorType, type ProviderName } from "./errors";
import type { ProviderFn } from "./providers";

export interface RunnerDeps {
  gemini?: { call: ProviderFn; apiKey: string };
  groq?: { call: ProviderFn; apiKey: string };
  sleep?: (ms: number) => Promise<void>;
  log?: (event: AiLogEvent) => void;
  timeoutMs?: number;
}

export interface AiLogEvent {
  provider: ProviderName;
  status?: number;
  errorType?: AiErrorType | "ok";
  retryAfterMs?: number;
  attempt: number;
}

export interface RunRequest<T> {
  system: string;
  user: string;
  maxTokens: number;
  schema: z.ZodType<T>;
  /** Extra code checks; return an error message to trigger the corrective retry. */
  validate?: (data: T) => string | null;
}

export type RunResult<T> =
  | { ok: true; data: T; provider: ProviderName }
  | { ok: false; type: AiErrorType; retryAfterMs?: number };

export const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function defaultLog(e: AiLogEvent) {
  // Only metadata — never prompt text, resume content or keys.
  console.info(
    JSON.stringify({ ai: e.provider, status: e.status ?? null, error: e.errorType ?? "ok", retryAfterMs: e.retryAfterMs ?? null, attempt: e.attempt }),
  );
}

/** Rough token estimate (≈4 characters per token) for free-tier budgeting. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Extracts the JSON object from a model reply (tolerates code fences / stray text). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new SyntaxError("No JSON object found");
  }
}

class InvalidOutput extends Error {}

function withTimeout(call: ProviderFn, timeoutMs: number, provider: ProviderName): ProviderFn {
  return async (req) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ProviderError(provider, "timeout"));
      }, timeoutMs);
    });
    try {
      return await Promise.race([call({ ...req, signal: controller.signal }), timeout]);
    } finally {
      clearTimeout(timer);
    }
  };
}

export async function runAi<T>(req: RunRequest<T>, deps: RunnerDeps): Promise<RunResult<T>> {
  const sleep = deps.sleep ?? defaultSleep;
  const log = deps.log ?? defaultLog;
  const timeoutMs = deps.timeoutMs ?? AI_CONFIG.timeoutMs;
  let attempt = 0;
  let lastError: ProviderError | null = null;

  /** One provider call + parse + validate. Throws ProviderError or InvalidOutput. */
  async function once(provider: ProviderName, call: ProviderFn, apiKey: string, feedback?: string): Promise<T> {
    attempt++;
    const user = feedback
      ? `${req.user}\n\nYour previous reply was rejected: ${feedback}\nReply again with ONLY valid JSON matching the required format.`
      : req.user;
    let text: string;
    try {
      text = await withTimeout(call, timeoutMs, provider)({ system: req.system, user, maxTokens: req.maxTokens, apiKey });
    } catch (e) {
      const err = e instanceof ProviderError ? e : new ProviderError(provider, "network");
      log({ provider, status: err.status, errorType: err.type, retryAfterMs: err.retryAfterMs, attempt });
      throw err;
    }
    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      log({ provider, errorType: "invalid-output", attempt });
      throw new InvalidOutput("Reply was not valid JSON.");
    }
    const result = req.schema.safeParse(parsed);
    if (!result.success) {
      log({ provider, errorType: "invalid-output", attempt });
      const issue = result.error.issues[0];
      throw new InvalidOutput(`Field "${issue.path.join(".") || "(root)"}": ${issue.message}.`);
    }
    const problem = req.validate?.(result.data);
    if (problem) {
      log({ provider, errorType: "invalid-output", attempt });
      throw new InvalidOutput(problem);
    }
    log({ provider, status: 200, errorType: "ok", attempt });
    return result.data;
  }

  /** Calls a provider with one corrective retry for invalid output. */
  async function withValidationRetry(provider: ProviderName, call: ProviderFn, apiKey: string): Promise<T> {
    try {
      return await once(provider, call, apiKey);
    } catch (e) {
      if (!(e instanceof InvalidOutput)) throw e;
      return await once(provider, call, apiKey, e.message);
    }
  }

  // 1) Gemini
  if (deps.gemini?.apiKey) {
    const { call, apiKey } = deps.gemini;
    try {
      return { ok: true, data: await withValidationRetry("gemini", call, apiKey), provider: "gemini" };
    } catch (e) {
      if (e instanceof ProviderError && e.type === "rate-limit" && (e.retryAfterMs ?? Infinity) <= AI_CONFIG.maxRetryAfterWaitMs) {
        await sleep(e.retryAfterMs!);
        try {
          return { ok: true, data: await withValidationRetry("gemini", call, apiKey), provider: "gemini" };
        } catch (e2) {
          lastError = e2 instanceof ProviderError ? e2 : new ProviderError("gemini", "invalid-output");
        }
      } else {
        lastError = e instanceof ProviderError ? e : new ProviderError("gemini", "invalid-output");
      }
    }
  }

  // 2) Groq fallback (if its free-tier token budget allows this request)
  if (deps.groq?.apiKey) {
    const estimated = estimateTokens(req.system + req.user) + req.maxTokens;
    if (estimated <= AI_CONFIG.groq.tokensPerMinute) {
      try {
        return { ok: true, data: await withValidationRetry("groq", deps.groq.call, deps.groq.apiKey), provider: "groq" };
      } catch (e) {
        const groqError = e instanceof ProviderError ? e : new ProviderError("groq", "invalid-output");
        lastError = pickReported(lastError, groqError);
      }
    } else {
      log({ provider: "groq", errorType: "bad-request", attempt: ++attempt });
    }
  }

  if (!lastError) return { ok: false, type: "not-configured" };
  return { ok: false, type: lastError.type, retryAfterMs: lastError.retryAfterMs };
}

/** When both providers fail, report the most actionable error. */
function pickReported(gemini: ProviderError | null, groq: ProviderError): ProviderError {
  if (!gemini) return groq;
  const rank: AiErrorType[] = ["quota", "rate-limit", "auth", "timeout", "server", "invalid-output", "network", "bad-request"];
  return rank.indexOf(gemini.type) <= rank.indexOf(groq.type) ? gemini : groq;
}
