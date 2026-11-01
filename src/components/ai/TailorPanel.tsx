"use client";

import { useId, useState } from "react";
import { useResumeStore } from "@/hooks/useResumeStore";
import type { AiOutput } from "@/lib/ai/contracts";
import { applyLine, grammarInput, honestySources, tailorInput, type LineTarget } from "@/lib/ai/resume-input";
import type { Resume } from "@/lib/resume/schema";
import { AiButton, AiError, SuggestionCard } from "./AiBits";
import { useAiAction } from "./AiProvider";

const MIN_DESCRIPTION = 30;

/** Rewrites/fixes tied to resume lines, each with Accept / Edit / Reject. */
function LineSuggestions({
  resume,
  items,
  onRemove,
  acceptLabel,
}: {
  resume: Resume;
  items: { key: string; line: LineTarget; text: string; note: string }[];
  onRemove: (key: string) => void;
  acceptLabel?: string;
}) {
  const { update } = useResumeStore();
  const [stale, setStale] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {stale && (
        <p className="text-xs text-warning" role="status">
          That line changed since the suggestion was made, so it wasn&apos;t replaced.
        </p>
      )}
      {items.map((s) => (
        <div key={s.key}>
          <p className="mb-1 text-xs font-semibold text-muted">{s.line.where}</p>
          <SuggestionCard
            original={s.line.text}
            suggestion={s.text}
            sources={honestySources(resume)}
            acceptLabel={acceptLabel}
            note={s.note}
            onAccept={(text) => {
              let ok = false;
              update((d) => void (ok = applyLine(d, s.line, text)));
              setStale(ok ? null : s.key);
              onRemove(s.key);
            }}
            onReject={() => onRemove(s.key)}
          />
        </div>
      ))}
    </div>
  );
}

type TailorResult = AiOutput<"tailor"> & { lines: LineTarget[] };

/** Tailor to a job description or a university programme description. */
export function TailorPanel({ resume }: { resume: Resume }) {
  const ai = useAiAction("tailor");
  const id = useId();
  const [kind, setKind] = useState<"job" | "programme">(resume.profile.targetType === "University application" ? "programme" : "job");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<TailorResult | null>(null);
  const tooShort = description.trim().length < MIN_DESCRIPTION;

  async function analyse() {
    const { input, lines } = tailorInput(resume, kind, description);
    const out = await ai.run(input);
    if (out) setResult({ ...out, lines });
  }

  const byRef = new Map(result?.lines.map((l) => [l.ref, l]));
  const rewrites = (result?.rewrites ?? []).flatMap((r) => {
    const line = byRef.get(r.ref);
    return line && line.text !== r.rewritten ? [{ key: r.ref, line, text: r.rewritten, note: r.why }] : [];
  });
  const present = result?.keywords.filter((k) => k.present) ?? [];
  const missing = result?.keywords.filter((k) => !k.present) ?? [];

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h3 className="font-bold">🎯 Tailor to a target</h3>
        <p className="mt-1 text-sm text-muted">
          Paste a job posting or a university programme description. The AI rewords and reorders what you already have — it never adds skills you
          don&apos;t have.
        </p>
        <fieldset className="mt-3 flex flex-wrap gap-2">
          <legend className="sr-only">What are you tailoring to?</legend>
          {(
            [
              ["job", "💼 Job / internship"],
              ["programme", "🎓 University programme"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={`btn btn-sm cursor-pointer ${kind === value ? "btn-primary" : "btn-secondary"}`}>
              <input type="radio" className="sr-only" name={`${id}-kind`} value={value} checked={kind === value} onChange={() => setKind(value)} />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="label mt-3" htmlFor={id}>
          {kind === "job" ? "Job description" : "Programme description"}
        </label>
        <textarea
          id={id}
          className="input text-sm"
          rows={8}
          maxLength={8000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={kind === "job" ? "Paste the full job or internship posting…" : "Paste the course/programme page text…"}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <AiButton onClick={analyse} busy={ai.busy} waiting={ai.waiting} disabled={tooShort}>
            Analyse match
          </AiButton>
          {tooShort && <span className="text-xs text-muted">Paste at least a few sentences.</span>}
        </div>
        <AiError error={ai.error} countdown={ai.countdown} onDismiss={ai.clearError} />
      </section>

      {result && (
        <>
          <section className="card p-4" aria-live="polite">
            <h3 className="font-bold">Match summary</h3>
            <p className="mt-1 text-sm">{result.matchSummary}</p>
          </section>
          <section className="card p-4">
            <h3 className="font-bold">Keywords</h3>
            {present.length > 0 && (
              <>
                <p className="mt-2 text-sm font-semibold text-success">✅ Already in your resume</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {present.map((k) => (
                    <li key={k.keyword} className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs">
                      {k.keyword}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {missing.length > 0 && (
              <>
                <p className="mt-3 text-sm font-semibold text-warning">💡 Consider adding if true</p>
                <p className="text-xs text-muted">Only add these if you really have the skill or experience — they are never added for you.</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {missing.map((k) => (
                    <li key={k.keyword} className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs">
                      {k.keyword}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {!result.keywords.length && <p className="mt-1 text-sm text-muted">No keywords found.</p>}
          </section>
          {result.reorder.length > 0 && (
            <section className="card p-4">
              <h3 className="font-bold">Order & emphasis</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {result.reorder.map((r, i) => (
                  <li key={i}>{r.suggestion}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Reorder sections in the ↕️ Sections tab.</p>
            </section>
          )}
          <section className="card p-4">
            <h3 className="mb-2 font-bold">Suggested rewrites ({rewrites.length})</h3>
            {rewrites.length ? (
              <LineSuggestions
                resume={resume}
                items={rewrites}
                onRemove={(key) => setResult((r) => r && { ...r, rewrites: r.rewrites.filter((x) => x.ref !== key) })}
              />
            ) : (
              <p className="text-sm text-muted">No rewrites left.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

type GrammarResult = AiOutput<"grammar"> & { lines: LineTarget[] };

/** AI grammar & consistency check — line-level fixes. Lives in the Checks tab. */
export function GrammarCheck({ resume }: { resume: Resume }) {
  const ai = useAiAction("grammar");
  const [result, setResult] = useState<GrammarResult | null>(null);
  const hasLines = grammarInput(resume).lines.length > 0;
  const byRef = new Map(result?.lines.map((l) => [l.ref, l]));
  const fixes = (result?.fixes ?? []).flatMap((f) => {
    const line = byRef.get(f.ref);
    return line ? [{ key: f.ref, line, text: f.fixed, note: `${f.kind}${f.note ? ` — ${f.note}` : ""}` }] : [];
  });

  return (
    <section className="card p-4">
      <h3 className="font-bold">✍️ Grammar & consistency (AI)</h3>
      <p className="mt-1 text-sm text-muted">Tense, date formats, capitalisation, repeated verbs and spelling.</p>
      <div className="mt-2">
        <AiButton
          onClick={async () => {
            const { input, lines } = grammarInput(resume);
            const out = await ai.run(input);
            if (out) setResult({ ...out, lines });
          }}
          busy={ai.busy}
          waiting={ai.waiting}
          disabled={!hasLines}
        >
          Check grammar
        </AiButton>
      </div>
      <AiError error={ai.error} countdown={ai.countdown} onDismiss={ai.clearError} />
      {result && (
        <div className="mt-3" aria-live="polite">
          {fixes.length ? (
            <LineSuggestions
              resume={resume}
              items={fixes}
              acceptLabel="Apply fix"
              onRemove={(key) => setResult((r) => r && { ...r, fixes: r.fixes.filter((x) => x.ref !== key) })}
            />
          ) : (
            <p className="text-sm text-success">✅ No grammar or consistency fixes needed.</p>
          )}
        </div>
      )}
    </section>
  );
}
