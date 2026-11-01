"use client";

import { useState } from "react";
import { ACTIVITY_LIMITS, type ActivityField } from "@/config/limits";
import { useResumeStore } from "@/hooks/useResumeStore";
import type { AiOutput } from "@/lib/ai/contracts";
import { activityInput, allSkills, honestySources, skillsInput, sourceLabel, summaryInput } from "@/lib/ai/resume-input";
import { findNewDetails } from "@/lib/checks/honesty";
import type { Resume } from "@/lib/resume/schema";
import { countChars } from "@/lib/text/char-count";
import { CharCounter } from "@/components/ui/CharCounter";
import { AiButton, AiError, HonestyWarning, SuggestionCard } from "./AiBits";
import { useAiAction } from "./AiProvider";

function ToolBox({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 rounded-xl border border-primary/30 bg-primary-soft/40 p-3">{children}</div>;
}

/** Content is too thin for the AI to work from — say so instead of calling it. */
function hasContent(resume: Resume): boolean {
  return summaryInput(resume).content.length >= 10;
}

export function SummaryWriter({ resume }: { resume: Resume }) {
  const { update } = useResumeStore();
  const ai = useAiAction("summary");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const enough = hasContent(resume);
  return (
    <ToolBox>
      <div className="flex flex-wrap items-center gap-2">
        <AiButton onClick={async () => setSuggestion((await ai.run(summaryInput(resume)))?.summary ?? null)} busy={ai.busy} waiting={ai.waiting} disabled={!enough}>
          Write my summary
        </AiButton>
        <span className="text-xs text-muted">{enough ? `Uses only what's already in your resume, tuned for: ${resume.profile.targetType}.` : "Add some education, projects or experience first."}</span>
      </div>
      <AiError error={ai.error} countdown={ai.countdown} onDismiss={ai.clearError} />
      {suggestion && (
        <div className="mt-2">
          <SuggestionCard
            key={suggestion}
            original={resume.summary.trim() || undefined}
            suggestion={suggestion}
            sources={honestySources(resume)}
            acceptLabel={resume.summary.trim() ? "Replace my summary" : "Use this summary"}
            onAccept={(text) => {
              update((d) => void (d.summary = text));
              setSuggestion(null);
            }}
            onReject={() => setSuggestion(null)}
          />
        </div>
      )}
    </ToolBox>
  );
}

type SkillSuggestion = AiOutput<"skills">["skills"][number];

export function SkillsSuggester({ resume }: { resume: Resume }) {
  const { update } = useResumeStore();
  const ai = useAiAction("skills");
  const [list, setList] = useState<SkillSuggestion[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const input = skillsInput(resume);

  async function suggest() {
    const out = await ai.run(input);
    if (!out) return;
    setList(out.skills);
    setPicked(new Set(out.skills.map((_, i) => i)));
  }

  function addPicked() {
    if (!list) return;
    update((d) => {
      const have = new Set(allSkills(d).map((s) => s.toLowerCase()));
      list.forEach((s, i) => {
        if (!picked.has(i) || have.has(s.name.toLowerCase())) return;
        d.skills[s.category].push(s.name);
        have.add(s.name.toLowerCase());
      });
    });
    setList(null);
  }

  return (
    <ToolBox>
      <div className="flex flex-wrap items-center gap-2">
        <AiButton onClick={suggest} busy={ai.busy} waiting={ai.waiting} disabled={!input.items.length}>
          Suggest skills from my work
        </AiButton>
        <span className="text-xs text-muted">{input.items.length ? "Only skills your projects and roles already show." : "Add a project or role first."}</span>
      </div>
      <AiError error={ai.error} countdown={ai.countdown} onDismiss={ai.clearError} />
      {list && (
        <div className="mt-3" aria-live="polite">
          {list.length === 0 ? (
            <p className="text-sm text-muted">No new skills found — your list already covers what your work shows. 👍</p>
          ) : (
            <>
              <ul className="space-y-1.5">
                {list.map((s, i) => (
                  <li key={`${s.name}-${i}`} className="flex items-start gap-2 text-sm">
                    <input
                      id={`skill-${i}`}
                      type="checkbox"
                      className="mt-1"
                      checked={picked.has(i)}
                      onChange={(e) =>
                        setPicked((p) => {
                          const n = new Set(p);
                          if (e.target.checked) n.add(i);
                          else n.delete(i);
                          return n;
                        })
                      }
                    />
                    <label htmlFor={`skill-${i}`}>
                      <span className="font-semibold">{s.name}</span> <span className="text-xs text-muted">({s.category})</span>
                      <span className="block text-xs text-muted">
                        from {sourceLabel(resume, s.sourceId)}
                        {s.evidence ? ` — “${s.evidence}”` : ""}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn btn-primary btn-sm" disabled={!picked.size} onClick={addPicked}>
                  ✓ Add selected ({picked.size})
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setList(null)}>
                  ✕ Reject
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </ToolBox>
  );
}

type ActivityDraft = Record<ActivityField, string>;

const FIELD_LABEL: Record<ActivityField, string> = { position: "Position / leadership", organization: "Organisation", description: "Description" };

function ActivityResult({ resume, id, draft, onDone }: { resume: Resume; id: string; draft: ActivityDraft; onDone: () => void }) {
  const { update } = useResumeStore();
  const [d, setD] = useState(draft);
  const activity = resume.activities.find((a) => a.id === id);
  if (!activity) return null;
  const sources = [activity.name, activity.position, activity.organization, activity.description, ...activity.bullets];
  const over = (Object.keys(ACTIVITY_LIMITS) as ActivityField[]).some((f) => countChars(d[f]) > ACTIVITY_LIMITS[f]);
  const details = findNewDetails(sources, `${d.position} ${d.organization} ${d.description}`);
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="mb-2 text-sm font-semibold">{activity.name || "Activity"}</p>
      <div className="space-y-2">
        {(Object.keys(ACTIVITY_LIMITS) as ActivityField[]).map((f) => (
          <div key={f}>
            <div className="flex items-center justify-between">
              <label className="label !mb-0" htmlFor={`act-${id}-${f}`}>
                {FIELD_LABEL[f]}
              </label>
              <CharCounter value={d[f]} max={ACTIVITY_LIMITS[f]} />
            </div>
            <textarea id={`act-${id}-${f}`} className="input text-sm" rows={f === "description" ? 3 : 1} value={d[f]} onChange={(e) => setD({ ...d, [f]: e.target.value })} />
          </div>
        ))}
      </div>
      {details.length > 0 && <HonestyWarning details={details.map((x) => x.text)} />}
      {over && <p className="mt-1 text-xs text-danger">Shorten the red field to fit the limit before accepting.</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={over}
          onClick={() => {
            update((r) => {
              const a = r.activities.find((x) => x.id === id);
              if (a) Object.assign(a, { position: d.position.trim(), organization: d.organization.trim(), description: d.description.trim() });
            });
            onDone();
          }}
        >
          ✓ Accept
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
          ✕ Reject
        </button>
      </div>
    </div>
  );
}

/** Common App–style activity writer with live character counters. */
export function ActivityWriter({ resume }: { resume: Resume }) {
  const ai = useAiAction("activity");
  const [results, setResults] = useState<(ActivityDraft & { id: string })[] | null>(null);
  const usable = resume.activities.filter((a) => a.name.trim() || a.description.trim() || a.bullets.some((b) => b.trim()));
  return (
    <ToolBox>
      <div className="flex flex-wrap items-center gap-2">
        <AiButton onClick={async () => setResults((await ai.run(activityInput({ ...resume, activities: usable })))?.activities ?? null)} busy={ai.busy} waiting={ai.waiting} disabled={!usable.length}>
          Write application activity entries
        </AiButton>
        <span className="text-xs text-muted">
          Common App style: {ACTIVITY_LIMITS.position} / {ACTIVITY_LIMITS.organization} / {ACTIVITY_LIMITS.description} characters.
        </span>
      </div>
      <AiError error={ai.error} countdown={ai.countdown} onDismiss={ai.clearError} />
      {results && (
        <div className="mt-3 space-y-2" aria-live="polite">
          {results.map((r) => (
            <ActivityResult key={r.id} resume={resume} id={r.id} draft={r} onDone={() => setResults((rs) => rs && rs.filter((x) => x.id !== r.id))} />
          ))}
        </div>
      )}
    </ToolBox>
  );
}
