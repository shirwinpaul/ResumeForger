import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import Groq from "groq-sdk";
import { AI_CONFIG } from "@/config/ai";
import { ProviderError, type ProviderName } from "./errors";

export interface ProviderRequest {
  system: string;
  user: string;
  maxTokens: number;
  apiKey: string;
  signal?: AbortSignal;
}

export type ProviderFn = (req: ProviderRequest) => Promise<string>;

/** Parses Gemini's "retryDelay": "12s" (inside the error message JSON). */
export function parseGeminiRetryDelay(message: string): number | undefined {
  const m = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/) ?? message.match(/retry in (\d+(?:\.\d+)?)s/i);
  return m ? Math.ceil(Number(m[1]) * 1000) : undefined;
}

/** A 429 that names a per-day quota means the daily limit is used up. */
export function isDailyQuota(message: string): boolean {
  return /per\s?day|PerDay|daily/i.test(message);
}

function classifyStatus(provider: ProviderName, status: number, message: string, retryAfterMs?: number): ProviderError {
  if (status === 429) return new ProviderError(provider, isDailyQuota(message) ? "quota" : "rate-limit", status, retryAfterMs);
  if (status === 401 || status === 403) return new ProviderError(provider, "auth", status);
  if (status === 400 || status === 404 || status === 413 || status === 422) {
    // Gemini reports an invalid key as 400 API_KEY_INVALID.
    return new ProviderError(provider, /api[_ ]?key/i.test(message) ? "auth" : "bad-request", status);
  }
  if (status >= 500) return new ProviderError(provider, "server", status);
  return new ProviderError(provider, "server", status);
}

function isAbort(e: unknown): boolean {
  return e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError" || /aborted|timed? ?out/i.test(e.message));
}

export const callGemini: ProviderFn = async ({ system, user, maxTokens, apiKey, signal }) => {
  const ai = new GoogleGenAI({ apiKey });
  try {
    const res = await ai.models.generateContent({
      model: AI_CONFIG.gemini.model,
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        maxOutputTokens: maxTokens,
        temperature: AI_CONFIG.gemini.temperature,
        thinkingConfig: { thinkingLevel: ThinkingLevel[AI_CONFIG.gemini.thinkingLevel] },
        abortSignal: signal,
      },
    });
    return res.text ?? "";
  } catch (e) {
    if (e instanceof ApiError) throw classifyStatus("gemini", e.status, e.message, parseGeminiRetryDelay(e.message));
    if (isAbort(e) || signal?.aborted) throw new ProviderError("gemini", "timeout");
    throw new ProviderError("gemini", "network");
  }
};

export const callGroq: ProviderFn = async ({ system, user, maxTokens, apiKey, signal }) => {
  const client = new Groq({ apiKey, maxRetries: 0, timeout: AI_CONFIG.timeoutMs });
  try {
    const res = await client.chat.completions.create(
      {
        model: AI_CONFIG.groq.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: maxTokens,
        temperature: AI_CONFIG.groq.temperature,
        reasoning_effort: AI_CONFIG.groq.reasoningEffort,
      },
      { signal },
    );
    return res.choices[0]?.message?.content ?? "";
  } catch (e) {
    if (e instanceof Groq.APIError && typeof e.status === "number") {
      const retryAfter = Number(e.headers?.get?.("retry-after"));
      throw classifyStatus("groq", e.status, e.message, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined);
    }
    if (isAbort(e) || signal?.aborted) throw new ProviderError("groq", "timeout");
    throw new ProviderError("groq", "network");
  }
};
