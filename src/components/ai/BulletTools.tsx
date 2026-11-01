"use client";

import { useState } from "react";
import { QUALITY_LIMITS } from "@/config/limits";
import { useResumeStore } from "@/hooks/useResumeStore";
import { listOf } from "@/lib/resume/edit";
import type { ListSectionId, Resume } from "@/lib/resume/schema";
import type { BulletToolsTarget } from "@/components/editor/ItemEditor";
import { AiButton, AiError, SuggestionCard } from "./AiBits";
import { useAiAction } from "./AiProvider";
import { Sparks } from "./Sparks";

const SECTION_LABEL: Partial<Record<ListSectionId, string>> = {
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  leadership: "Leadership",
  volunteering: "Volunteering",
  activities: "Activities",
};

type Item = Record<string, unknown> & { id: string };

function findItem(resume: Resume | null, section: ListSectionId, itemId: string): Item | undefined {
  return resume ? listOf(resume, section).find((i) => i.id === itemId) : undefined;
}

/** The item's own words — what the honesty check compares a rewritten bullet against. */
export function itemSources(item: Item | undefined): string[] {
  if (!item) return [];
  return Object.values(item).flatMap((v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []));
}

export function bulletContext(section: ListSectionId, item: Item | undefined) {
  const str = (k: string) => (typeof item?.[k] === "string" ? (item[k] as string) : "");
  return {
    section: SECTION_LABEL[section] ?? section,
    title: str("title") || str("name") || str("degree"),
    organization: str("organization") || str("institution"),
    current: item?.current === true,
  };
}

/** Replaces one bullet, only if it still has the text the suggestion was made for. */
function useReplaceBullet(t: { section: ListSectionId; itemId: string; field: string; index: number }) {
  const { update } = useResumeStore();
  return (expected: string, text: string) =>
    update((d) => {
      const list = findItem(d, t.section, t.itemId)?.[t.field] as string[] | undefined;
      if (list && list[t.index] === expected) list[t.index] = text;
    });
}

/** "✨ Polish" (3 alternatives) and, for long bullets, "✂️ Shorter" under each bullet. */
export function BulletTools({ target }: { target: BulletToolsTarget }) {
  const { resume } = useResumeStore();
  const polish = useAiAction("polish");
  const trim = useAiAction("trim");
  const [options, setOptions] = useState<{ for: string; list: string[] } | null>(null);
  const replace = useReplaceBullet(target);
  const item = findItem(resume, target.section, target.itemId);
  const bullet = target.bullet.trim();
  if (!bullet) return null;
  const isLong = bullet.length > QUALITY_LIMITS.maxBulletChars;
  // Hide stale suggestions once the bullet text changes.
  const shown = options && options.for === target.bullet ? options : null;

  async function doPolish() {
    const out = await polish.run({ bullet, context: bulletContext(target.section, item) });
    // Drop alternatives that are identical to the bullet or to each other.
    if (out) setOptions({ for: target.bullet, list: [...new Set(out.alternatives.map((a) => a.trim()))].filter((a) => a !== bullet) });
  }
  async function doTrim() {
    const out = await trim.run({ bullet, maxChars: QUALITY_LIMITS.maxBulletChars });
    if (out) setOptions({ for: target.bullet, list: [out.shorter] });
  }

  return (
    <div className="mt-1">
      <div className="flex flex-wrap gap-1.5">
        <AiButton onClick={doPolish} busy={polish.busy} waiting={polish.waiting} label={`Polish bullet ${target.index + 1}`}>
          Polish
        </AiButton>
        {isLong && (
          <AiButton onClick={doTrim} busy={trim.busy} waiting={trim.waiting} label={`Make bullet ${target.index + 1} shorter`}>
            Shorter
          </AiButton>
        )}
      </div>
      <AiError error={polish.error ?? trim.error} countdown={Math.max(polish.countdown, trim.countdown)} onDismiss={() => (polish.clearError(), trim.clearError())} />
      {shown && (
        <div className="mt-2 space-y-2" aria-live="polite">
          <p className="text-xs font-semibold text-muted">
            <Sparks /> {shown.list.length ? "Pick one — or reject all:" : "The AI couldn't improve this bullet — it already reads well. 👍"}
          </p>
          {shown.list.map((alt, i) => (
            <SuggestionCard
              key={`${i}-${alt}`}
              original={bullet}
              suggestion={alt}
              sources={itemSources(item)}
              acceptLabel="Use this"
              onAccept={(text) => {
                replace(target.bullet, text);
                setOptions(null);
              }}
            />
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOptions(null)}>
            ✕ Reject all
          </button>
        </div>
      )}
    </div>
  );
}

/** "✨ Shorter" for long-bullet issues in the Checks tab. */
export function TrimIssueTool({ section, itemId, field, index, original }: { section: ListSectionId; itemId: string; field: string; index: number; original: string }) {
  const { resume } = useResumeStore();
  const trim = useAiAction("trim");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const replace = useReplaceBullet({ section, itemId, field, index });
  return (
    <div className="w-full">
      <AiButton onClick={async () => setSuggestion((await trim.run({ bullet: original, maxChars: QUALITY_LIMITS.maxBulletChars }))?.shorter ?? null)} busy={trim.busy} waiting={trim.waiting}>
        Shorter
      </AiButton>
      <AiError error={trim.error} countdown={trim.countdown} onDismiss={trim.clearError} />
      {suggestion && (
        <div className="mt-2">
          <SuggestionCard
            original={original}
            suggestion={suggestion}
            sources={itemSources(findItem(resume, section, itemId))}
            onAccept={(text) => {
              replace(original, text);
              setSuggestion(null);
            }}
            onReject={() => setSuggestion(null)}
          />
        </div>
      )}
    </div>
  );
}

/** AI button for the "Tell it in your own words" box (QuickAnswer). */
export function TurnIntoBulletsButton({ section, text, propose }: { section: ListSectionId; text: string; propose: (bullets: string[], fromAi: boolean) => void }) {
  const ai = useAiAction("bullets");
  return (
    <>
      <AiButton
        onClick={async () => {
          const out = await ai.run({ answer: text.trim(), context: { section: SECTION_LABEL[section] ?? section } });
          if (out) propose(out.bullets, true);
        }}
        busy={ai.busy}
        waiting={ai.waiting}
        disabled={text.trim().length < 3}
      >
        Turn into bullets
      </AiButton>
      {ai.error && (
        <div className="basis-full">
          <AiError error={ai.error} countdown={ai.countdown} onDismiss={ai.clearError} />
        </div>
      )}
    </>
  );
}
