import { handleAiRequest } from "@/lib/ai/handler";
import { isAiAction } from "@/lib/ai/contracts";
import { friendlyMessage } from "@/lib/ai/errors";

/** Vercel Hobby allows up to 60s (mirrors AI_CONFIG.maxDurationSeconds; must be a literal). */
export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/ai/[action]">) {
  const { action } = await ctx.params;
  if (!isAiAction(action)) {
    return Response.json({ type: "bad-request", message: friendlyMessage("bad-request") }, { status: 404 });
  }
  return handleAiRequest(action, request);
}
