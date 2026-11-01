"use client";

import { useMemo, type ReactNode } from "react";
import { runAtsCheck, type CheckStatus } from "@/lib/checks/ats";
import { runQualityChecks, type QualityIssue } from "@/lib/checks/quality";
import { collectPlaceholders } from "@/lib/checks/placeholders";
import { countryAdvice } from "@/lib/checks/country";
import { useResumeStore } from "@/hooks/useResumeStore";
import { listOf } from "@/lib/resume/edit";
import type { Resume } from "@/lib/resume/schema";
import { ScoreRing } from "./ScoreRing";

const ICON: Record<CheckStatus, string> = { pass: "✅", warn: "⚠️", fail: "❌" };

function Card({ title, children, count }: { title: string; children: ReactNode; count?: number }) {
  return (
    <section className="card p-4">
      <h3 className="mb-2 font-bold">
        {title}
        {count !== undefined && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

/**
 * All code-based checks (no AI): ATS score, content quality with quick fixes,
 * unfilled placeholders and country tips. `renderIssueTools` lets the AI layer
 * add e.g. a "Shorter" button to long-bullet issues.
 */
export function ChecksPanel({
  resume,
  pages,
  renderIssueTools,
}: {
  resume: Resume;
  pages?: number;
  renderIssueTools?: (issue: QualityIssue) => ReactNode;
}) {
  const { update } = useResumeStore();
  const ats = useMemo(() => runAtsCheck(resume, pages), [resume, pages]);
  const issues = useMemo(() => runQualityChecks(resume), [resume]);
  const placeholders = useMemo(() => collectPlaceholders(resume), [resume]);
  const advice = useMemo(() => countryAdvice(resume, pages), [resume, pages]);

  function applyFix(issue: QualityIssue) {
    if (!issue.fix || issue.field === undefined || issue.index === undefined) return;
    const { replacement } = issue.fix;
    update((d) => {
      const item = listOf(d, issue.section).find((i) => i.id === issue.itemId);
      const list = item?.[issue.field!] as string[] | undefined;
      if (list && list[issue.index!] === issue.original) list[issue.index!] = replacement;
    });
  }

  return (
    <div className="space-y-4">
      <Card title="ATS score">
        <div className="flex flex-wrap items-center gap-5">
          <ScoreRing score={ats.score} />
          <p className="max-w-xs text-sm text-muted">
            How safely applicant tracking systems can read your resume. Aim for 80+.
            <br />
            Suggested file name: <span className="font-mono text-text">{ats.fileName}</span>
          </p>
        </div>
        <ul className="mt-4 space-y-2" aria-live="polite">
          {ats.items.map((i) => (
            <li key={i.id} className="flex gap-2 text-sm">
              <span aria-hidden="true">{ICON[i.status]}</span>
              <div>
                <span className="font-semibold">{i.label}</span>
                <span className="sr-only"> — {i.status}</span>
                {i.weight > 0 && (
                  <span className="ml-1 text-xs text-muted">
                    ({i.points}/{i.weight})
                  </span>
                )}
                <p className="text-muted">{i.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Content quality" count={issues.length}>
        {issues.length === 0 ? (
          <p className="text-sm text-success">✓ No weak phrases, pronouns, long bullets, repeated verbs or missing dates.</p>
        ) : (
          <ul className="space-y-3">
            {issues.map((issue) => (
              <li key={issue.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="text-xs text-muted">{issue.where}</p>
                <p className="mt-0.5 font-medium">{issue.message}</p>
                {issue.original && <p className="mt-1 rounded bg-surface-2 px-2 py-1 italic">“{issue.original}”</p>}
                {issue.fix && (
                  <p className="mt-1 text-success">
                    → “{issue.fix.replacement}”
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {issue.fix && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyFix(issue)}>
                      ⚡ {issue.fix.label}
                    </button>
                  )}
                  {renderIssueTools?.(issue)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Placeholders to fill" count={placeholders.length}>
        {placeholders.length === 0 ? (
          <p className="text-sm text-success">✓ No unfilled [placeholders].</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-muted">Replace these with real details (or remove them) before exporting.</p>
            <ul className="space-y-1 text-sm">
              {placeholders.map((p, i) => (
                <li key={i}>
                  <span className="placeholder-chip">{p.placeholder}</span> <span className="text-muted">in {p.where}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card title={`Tips for ${advice.country}`}>
        {advice.warnings.length > 0 && (
          <ul className="mb-3 space-y-1 text-sm">
            {advice.warnings.map((w) => (
              <li key={w} className="text-warning">
                ⚠️ {w}
              </li>
            ))}
          </ul>
        )}
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {advice.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">{advice.label}</p>
      </Card>
    </div>
  );
}
