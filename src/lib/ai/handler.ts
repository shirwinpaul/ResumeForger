/**
 * The full server pipeline for one AI request:
 * rate limit → validate input (Zod) → strip contact data → mock or runAi → finalize.
 * The route file is a thin wrapper; everything here is injectable for tests.
 */
import { BYOK_HEADER } from "@/config/ai";
import { aiInputSchemas, aiOutputSchemas, type AiAction, type ParsedInput } from "./contracts";
import { friendlyMessage, httpStatusFor, type AiErrorBody, type AiErrorType } from "./errors";
import { isMockEnabled, mockResponse } from "./mock";
import { stripContact } from "./privacy";
import { PROMPTS } from "./prompts";
import type { ProviderFn } from "./providers";
import { createRateLimiter, clientIp, type RateLimiter } from "./rate-limit";
import { runAi, type RunnerDeps } from "./runner";

/** Request bodies above this are rejected before parsing (resume text is small). */
const MAX_BODY_BYTES = 64_000;

export interface HandlerDeps {
  env?: NodeJS.ProcessEnv;
  limiter?: RateLimiter;
  providers?: { gemini: ProviderFn; groq: ProviderFn };
  runner?: Pick<RunnerDeps, "sleep" | "log" | "timeoutMs">;
}

const sharedLimiter = createRateLimiter();

/** Treats empty values and the .env.example placeholders as "no key". */
export function usableKey(key: string | null | undefined): string {
  const k = (key ?? "").trim();
  return !k || k.startsWith("PASTE_") ? "" : k;
}

function errorResponse(type: AiErrorType, retryAfterMs?: number): Response {
  const retryAfterSeconds = retryAfterMs ? Math.ceil(retryAfterMs / 1000) : undefined;
  const body: AiErrorBody = { type, message: friendlyMessage(type, retryAfterSeconds), retryAfterSeconds };
  const headers: Record<string, string> = { "cache-control": "no-store" };
  if (retryAfterSeconds) headers["retry-after"] = String(retryAfterSeconds);
  return Response.json(body, { status: httpStatusFor(type), headers });
}

export async function handleAiRequest(action: AiAction, request: Request, deps: HandlerDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const limiter = deps.limiter ?? sharedLimiter;

  const wait = limiter.hit(clientIp(request.headers));
  if (wait > 0) return errorResponse("too-many-requests", wait);

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return errorResponse("bad-request");
    raw = JSON.parse(text);
  } catch {
    return errorResponse("bad-request");
  }
  const parsed = aiInputSchemas[action].safeParse(raw);
  if (!parsed.success) return errorResponse("bad-request");

  // Privacy: never send contact details to a provider, whatever the client sent.
  const input = stripContact(parsed.data) as ParsedInput<typeof action>;
  const prompt = PROMPTS[action] as unknown as (typeof PROMPTS)["polish"];
  const typedInput = input as ParsedInput<"polish">;

  if (isMockEnabled(env)) {
    const mock = aiOutputSchemas[action].parse(mockResponse(action, input));
    const data = prompt.finalize ? prompt.finalize(mock as never, typedInput) : mock;
    return Response.json({ data, provider: "mock" }, { headers: { "cache-control": "no-store" } });
  }

  const { callGemini, callGroq } = deps.providers ? { callGemini: deps.providers.gemini, callGroq: deps.providers.groq } : await import("./providers");
  const geminiKey = usableKey(request.headers.get(BYOK_HEADER)) || usableKey(env.GEMINI_API_KEY);
  const groqKey = usableKey(env.GROQ_API_KEY);

  const result = await runAi(
    {
      system: prompt.system,
      user: prompt.user(typedInput),
      maxTokens: prompt.maxTokens,
      schema: aiOutputSchemas[action] as unknown as (typeof aiOutputSchemas)["polish"],
      validate: prompt.validate ? (out) => prompt.validate!(out, typedInput) : undefined,
    },
    {
      ...deps.runner,
      gemini: geminiKey ? { call: callGemini, apiKey: geminiKey } : undefined,
      groq: groqKey ? { call: callGroq, apiKey: groqKey } : undefined,
    },
  );

  if (!result.ok) return errorResponse(result.type, result.retryAfterMs);
  const data = prompt.finalize ? prompt.finalize(result.data, typedInput) : result.data;
  return Response.json({ data, provider: result.provider }, { headers: { "cache-control": "no-store" } });
}
