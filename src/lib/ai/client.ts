/**
 * Browser-side caller for /api/ai/[action]. Never throws: every failure becomes a
 * friendly { ok: false } result so the UI can show it and keep working without AI.
 */
import { BYOK_HEADER } from "@/config/ai";
import { readSettings } from "@/lib/settings";
import type { AiAction, AiInput, AiOutput, AiSuccessBody } from "./contracts";
import { friendlyMessage, type AiErrorBody } from "./errors";

export type AiCallResult<A extends AiAction> =
  | { ok: true; data: AiOutput<A>; provider: AiSuccessBody<A>["provider"] }
  | { ok: false; error: AiErrorBody };

export async function callAi<A extends AiAction>(action: A, input: AiInput<A>, signal?: AbortSignal): Promise<AiCallResult<A>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const key = readSettings().geminiKey?.trim();
  if (key) headers[BYOK_HEADER] = key;
  try {
    const res = await fetch(`/api/ai/${action}`, { method: "POST", headers, body: JSON.stringify(input), signal });
    const body = (await res.json().catch(() => null)) as (AiSuccessBody<A> & Partial<AiErrorBody>) | null;
    if (res.ok && body?.data) return { ok: true, data: body.data, provider: body.provider };
    if (body?.type && body.message) return { ok: false, error: body as AiErrorBody };
    return { ok: false, error: { type: "server", message: friendlyMessage("server") } };
  } catch {
    if (signal?.aborted) return { ok: false, error: { type: "network", message: "Cancelled." } };
    return { ok: false, error: { type: "network", message: friendlyMessage("network") } };
  }
}
