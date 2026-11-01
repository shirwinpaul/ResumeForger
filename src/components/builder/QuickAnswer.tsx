"use client";

import { useId, useState, type ReactNode } from "react";
import { itemLabel } from "@/config/section-fields";
import { useResumeStore } from "@/hooks/useResumeStore";
import { listOf, sentencesToBullets } from "@/lib/resume/edit";
import { emptyItem, type ListSectionId, type Resume } from "@/lib/resume/schema";
import { findNewDetails } from "@/lib/checks/honesty";
import { HonestyWarning } from "@/components/ai/AiBits";

export type BulletSection = Extract<ListSectionId, "projects" | "experience" | "leadership" | "volunteering" | "activities" | "education">;

const BULLET_FIELD: Record<BulletSection, string> = {
  projects: "bullets",
  experience: "bullets",
  leadership: "bullets",
  volunteering: "bullets",
  activities: "bullets",
  education: "highlights",
};

/**
 * "Answer in plain sentences" box. Proposed bullets (from AI via `renderAiButton`,
 * or the no-AI sentence splitter) are always shown for Accept / Edit / Reject first.
 */
export function QuickAnswer({
  resume,
  section,
  renderAiButton,
}: {
  resume: Resume;
  section: BulletSection;
  /** Slot for the AI "Turn into bullets" button; it calls `propose` with the AI result. */
  renderAiButton?: (args: { text: string; propose: (bullets: string[], fromAi: boolean) => void }) => ReactNode;
}) {
  const { update } = useResumeStore();
  const id = useId();
  const items = listOf(resume, section);
  const [text, setText] = useState("");
  const [targetId, setTargetId] = useState<string>("new");
  const [proposal, setProposal] = useState<{ bullets: string[]; fromAi: boolean; source: string } | null>(null);
  const field = BULLET_FIELD[section];

  function accept(bullets: string[]) {
    const clean = bullets.map((b) => b.trim()).filter(Boolean);
    if (!clean.length) return;
    update((d) => {
      const list = listOf(d, section);
      let item = list.find((i) => i.id === targetId);
      if (!item) {
        item = emptyItem[section]() as unknown as (typeof list)[number];
        list.push(item);
      }
      item[field] = [...((item[field] as string[]) ?? []).filter((b) => b.trim()), ...clean];
    });
    setProposal(null);
    setText("");
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary-soft/40 p-4">
      <label htmlFor={id} className="label !text-text">
        Tell it in your own words
      </label>
      <textarea id={id} className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write naturally — we'll help shape it into resume bullets." />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`${id}-target`}>
          Add bullets to
        </label>
        <select id={`${id}-target`} className="input !w-auto !py-1 text-sm" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          <option value="new">Add to: a new entry</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              Add to: {itemLabel(section, i)}
            </option>
          ))}
        </select>
        {renderAiButton?.({ text, propose: (bullets, fromAi) => setProposal({ bullets, fromAi, source: text }) })}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!text.trim()}
          onClick={() => setProposal({ bullets: sentencesToBullets(text), fromAi: false, source: text })}
        >
          Split into bullets (no AI)
        </button>
      </div>

      {proposal && (
        <div className="mt-3 rounded-lg border border-border bg-surface p-3" aria-live="polite">
          <p className="text-sm font-semibold">{proposal.fromAi ? "✨ Suggested bullets" : "Bullets from your answer"} — review before adding:</p>
          {proposal.bullets.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Couldn&apos;t find full sentences. Try writing a little more.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {proposal.bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <div className="flex-1">
                  <textarea
                    aria-label={`Suggested bullet ${i + 1}`}
                    className="input !py-1 text-sm"
                    rows={2}
                    value={b}
                    onChange={(e) => setProposal((p) => p && { ...p, bullets: p.bullets.map((x, j) => (j === i ? e.target.value : x)) })}
                  />
                  {proposal.fromAi && <NewDetails source={proposal.source} text={b} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" disabled={!proposal.bullets.length} onClick={() => accept(proposal.bullets)}>
              ✓ Accept
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProposal(null)}>
              ✕ Reject
            </button>
            <span className="self-center text-xs text-muted">You can edit the text above before accepting.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function NewDetails({ source, text }: { source: string; text: string }) {
  const details = findNewDetails(source, text);
  return details.length ? <HonestyWarning details={details.map((d) => d.text)} /> : null;
}
