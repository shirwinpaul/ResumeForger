/** Error model shared by providers, the runner, the API routes and the client. */

export type AiErrorType =
  | "rate-limit" // per-minute limit — show a countdown, keep edits
  | "quota" // daily quota used up
  | "server" // provider 5xx
  | "timeout"
  | "invalid-output" // JSON/Zod validation failed after retry
  | "auth" // bad or missing key
  | "bad-request"
  | "network"
  | "not-configured" // no keys at all
  | "too-many-requests"; // our own per-IP limiter

export type ProviderName = "gemini" | "groq" | "mock";

export class ProviderError extends Error {
  constructor(
    public provider: ProviderName,
    public type: AiErrorType,
    public status?: number,
    /** Milliseconds the provider asked us to wait. */
    public retryAfterMs?: number,
  ) {
    super(`${provider} ${type}${status ? ` (${status})` : ""}`);
    this.name = "ProviderError";
  }
}

export interface AiErrorBody {
  type: AiErrorType;
  message: string;
  retryAfterSeconds?: number;
}

export const DAILY_QUOTA_MESSAGE =
  "Today's free AI limit is reached. Add your own free Gemini key in Settings — you can keep editing and exporting without AI.";

/** Friendly, non-technical messages. Never include raw provider errors. */
export function friendlyMessage(type: AiErrorType, retryAfterSeconds?: number): string {
  switch (type) {
    case "rate-limit":
      return `The free AI is busy right now. Try again in ${retryAfterSeconds ?? 30} seconds — your edits are safe.`;
    case "quota":
      return DAILY_QUOTA_MESSAGE;
    case "too-many-requests":
      return `You've used a lot of AI requests this hour. Try again in ${Math.ceil((retryAfterSeconds ?? 600) / 60)} minutes — you can keep editing meanwhile.`;
    case "timeout":
      return "The AI took too long to answer. Please try again.";
    case "invalid-output":
      return "The AI gave an answer we couldn't use. Please try again.";
    case "auth":
      return "The AI key isn't working. Check the key in Settings (or the server's .env.local).";
    case "not-configured":
      return "AI isn't set up yet — add a Gemini or Groq key. You can keep editing and exporting without AI.";
    case "bad-request":
      return "That request couldn't be processed. Try shortening the text.";
    case "network":
      return "Couldn't reach the AI. Check your internet connection and try again.";
    default:
      return "The AI service had a problem. Please try again in a moment.";
  }
}

/** Status codes the API route returns for each error type. */
export function httpStatusFor(type: AiErrorType): number {
  switch (type) {
    case "rate-limit":
    case "quota":
    case "too-many-requests":
      return 429;
    case "bad-request":
      return 400;
    case "timeout":
      return 504;
    case "not-configured":
      return 503;
    default:
      return 502;
  }
}
