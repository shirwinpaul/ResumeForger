"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSettings } from "@/hooks/useSettings";
import { callAi, type AiCallResult } from "@/lib/ai/client";
import type { AiAction, AiInput } from "@/lib/ai/contracts";
import type { AiErrorBody } from "@/lib/ai/errors";
import { Modal } from "@/components/ui/Modal";

export const AI_PRIVACY_NOTICE =
  "Your resume text is sent to a free AI provider to generate suggestions. Your phone number, email and address are removed before sending.";

type Runner = <A extends AiAction>(action: A, input: AiInput<A>) => Promise<AiCallResult<A>>;

const AiContext = createContext<Runner | null>(null);

/**
 * Wraps every AI call: shows the privacy notice once (remembered in Settings),
 * then calls the server route. Declining the notice cancels the call.
 */
export function AiProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useSettings();
  const [asking, setAsking] = useState(false);
  const pending = useRef<((ok: boolean) => void) | null>(null);
  const accepted = useRef(settings.aiNoticeAccepted);

  useEffect(() => {
    accepted.current = settings.aiNoticeAccepted;
  }, [settings.aiNoticeAccepted]);

  const answer = (ok: boolean) => {
    if (ok) {
      accepted.current = true;
      setSettings({ aiNoticeAccepted: true });
    }
    setAsking(false);
    pending.current?.(ok);
    pending.current = null;
  };

  const run: Runner = useCallback(async (action, input) => {
    if (!accepted.current) {
      const ok = await new Promise<boolean>((resolve) => {
        pending.current = resolve;
        setAsking(true);
      });
      if (!ok) return { ok: false, error: { type: "bad-request", message: "AI cancelled — nothing was sent." } };
    }
    return callAi(action, input);
  }, []);

  return (
    <AiContext.Provider value={run}>
      {children}
      <Modal
        open={asking}
        onClose={() => answer(false)}
        title="Before using AI"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => answer(false)}>
              Not now
            </button>
            <button type="button" className="btn btn-primary" onClick={() => answer(true)}>
              OK, continue
            </button>
          </>
        }
      >
        <p>🔒 {AI_PRIVACY_NOTICE}</p>
        <p className="mt-3 text-sm text-muted">
          The AI only improves your wording. Every suggestion is shown to you first — nothing changes until you accept it. You can keep
          editing and exporting without AI.
        </p>
      </Modal>
    </AiContext.Provider>
  );
}

/** One AI action's state: busy flag, friendly error and a live retry countdown. */
export function useAiAction<A extends AiAction>(action: A) {
  const run = useContext(AiContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AiErrorBody | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const execute = useCallback(
    async (input: AiInput<A>) => {
      if (!run) throw new Error("useAiAction must be used inside <AiProvider>");
      setBusy(true);
      setError(null);
      try {
        const res = await run(action, input);
        if (res.ok) return res.data;
        setError(res.error);
        if (res.error.type === "rate-limit" && res.error.retryAfterSeconds) setCountdown(res.error.retryAfterSeconds);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [run, action],
  );

  const clearError = useCallback(() => setError(null), []);
  return { run: execute, busy, error, countdown, waiting: countdown > 0, clearError };
}
