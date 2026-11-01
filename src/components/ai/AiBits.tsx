"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { findNewDetails, highlightSegments, NEW_DETAIL_MESSAGE } from "@/lib/checks/honesty";
import type { AiErrorBody } from "@/lib/ai/errors";
import { diffWords } from "@/lib/text/diff";
import { Sparks } from "./Sparks";

/** Friendly AI error; rate limits show a live countdown. Never raw errors. */
export function AiError({ error, countdown, onDismiss }: { error: AiErrorBody | null; countdown: number; onDismiss?: () => void }) {
  if (!error) return null;
  const message =
    error.type === "rate-limit" && countdown > 0
      ? `The free AI is busy right now. Try again in ${countdown} seconds — your edits are safe.`
      : error.type === "rate-limit"
        ? "You can try the AI again now."
        : error.message;
  return (
    <div role="alert" className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm">
      <span>⏳ {message}</span>
      {onDismiss && (
        <button type="button" className="btn btn-ghost btn-sm !px-2 !py-0" onClick={onDismiss} aria-label="Dismiss message">
          ✕
        </button>
      )}
    </div>
  );
}

/** Button for an AI action: shows a spinner while busy and disables during a countdown. */
export function AiButton({
  onClick,
  busy,
  waiting,
  disabled,
  children,
  label,
}: {
  onClick: () => void;
  busy: boolean;
  waiting?: boolean;
  disabled?: boolean;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={onClick} disabled={busy || waiting || disabled} aria-busy={busy} aria-label={label}>
      {busy ? (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : (
        <span aria-hidden="true">✨</span>
      )}
      {busy ? "Thinking…" : children}
    </button>
  );
}

export function HonestyWarning({ details }: { details: string[] }) {
  return (
    <p className="mt-1 text-xs font-semibold text-danger" role="note">
      {NEW_DETAIL_MESSAGE}: {details.map((d) => `“${d}”`).join(", ")}
    </p>
  );
}

/** Text with new (unverified) details highlighted, plus the honesty warning. */
export function HonestyText({ text, sources }: { text: string; sources: string | string[] }) {
  const details = useMemo(() => findNewDetails(sources, text), [sources, text]);
  const segs = highlightSegments(text, details);
  return (
    <>
      <span>
        {segs.map((s, i) =>
          s.flagged ? (
            <mark key={i} className="rounded bg-danger-soft px-0.5 text-danger" title={NEW_DETAIL_MESSAGE}>
              {s.text}
            </mark>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </span>
      {details.length > 0 && <HonestyWarning details={details.map((d) => d.text)} />}
    </>
  );
}

/** Word diff: removed words struck through, added words highlighted. */
export function DiffText({ before, after }: { before: string; after: string }) {
  const parts = useMemo(() => diffWords(before, after), [before, after]);
  return (
    <span>
      {parts.map((p, i) =>
        p.type === "same" ? (
          <span key={i}>{p.text}</span>
        ) : p.type === "removed" ? (
          <del key={i} className="text-danger">
            <span className="sr-only">removed: </span>
            {p.text}
          </del>
        ) : (
          <ins key={i} className="rounded bg-success-soft text-success no-underline">
            <span className="sr-only">added: </span>
            {p.text}
          </ins>
        ),
      )}
    </span>
  );
}

/**
 * One AI suggestion with Accept / Edit / Reject. Shows a diff against the original
 * (when there is one) and flags new details on whatever text will be accepted.
 */
export function SuggestionCard({
  original,
  suggestion,
  sources,
  onAccept,
  onReject,
  acceptLabel = "Accept",
  note,
}: {
  original?: string;
  suggestion: string;
  sources: string | string[];
  onAccept: (text: string) => void;
  onReject?: () => void;
  acceptLabel?: string;
  note?: ReactNode;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(suggestion);
  const details = useMemo(() => findNewDetails(sources, text), [sources, text]);

  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-sm">
      {editing ? (
        <>
          <label className="sr-only" htmlFor={id}>
            Edit suggestion
          </label>
          <textarea id={id} className="input text-sm" rows={3} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          {details.length > 0 && <HonestyWarning details={details.map((d) => d.text)} />}
        </>
      ) : original !== undefined && original !== text ? (
        <>
          <p>
            <DiffText before={original} after={text} />
          </p>
          {details.length > 0 && <HonestyWarning details={details.map((d) => d.text)} />}
        </>
      ) : (
        <p>
          <HonestyText text={text} sources={sources} />
        </p>
      )}
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary btn-sm relative" disabled={!text.trim()} onClick={() => onAccept(text.trim())}>
          <Sparks />✓ {acceptLabel}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
          ✎ {editing ? "Done editing" : "Edit"}
        </button>
        {onReject && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onReject}>
            ✕ Reject
          </button>
        )}
      </div>
    </div>
  );
}
