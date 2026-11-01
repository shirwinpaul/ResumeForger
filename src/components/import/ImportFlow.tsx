"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { useResumeStore } from "@/hooks/useResumeStore";
import { extractText, ImportError, MAX_IMPORT_CHARS } from "@/lib/import/extract";
import { IMPORT_SECTIONS, importedToResume, parseByHeadings, sectionCounts, type ImportedData, type ImportSection } from "@/lib/import/map";
import { buildRenderDoc } from "@/lib/resume/render-model";
import { DEFAULT_HEADINGS } from "@/lib/resume/sections";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { AiButton, AiError } from "@/components/ai/AiBits";
import { useAiAction } from "@/components/ai/AiProvider";

type Step = "source" | "text" | "review";

const PREVIEW_SCALE = 0.55;

function StepDots({ step }: { step: Step }) {
  const steps: [Step, string][] = [
    ["source", "1. Choose"],
    ["text", "2. Check text"],
    ["review", "3. Review"],
  ];
  return (
    <ol className="mb-5 flex flex-wrap gap-2 text-sm" aria-label="Import steps">
      {steps.map(([id, label]) => (
        <li key={id} aria-current={id === step ? "step" : undefined} className={`rounded-full px-3 py-1 ${id === step ? "bg-primary text-on-primary font-semibold" : "bg-surface-2 text-muted"}`}>
          {label}
        </li>
      ))}
    </ol>
  );
}

export function ImportFlow() {
  const router = useRouter();
  const { open } = useResumeStore();
  const ai = useAiAction("import");
  const fileId = useId();
  const pasteId = useId();
  const [step, setStep] = useState<Step>("source");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ parsed: ImportedData; fromAi: boolean } | null>(null);
  const [include, setInclude] = useState<Set<ImportSection>>(new Set(IMPORT_SECTIONS));
  const [name, setName] = useState("Imported resume");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setReading(true);
    try {
      setText(await extractText(file));
      setFileName(file.name);
      setName(file.name.replace(/\.(pdf|docx)$/i, "").slice(0, 80) || "Imported resume");
      setStep("text");
    } catch (e) {
      setError(e instanceof ImportError ? e.message : "Something went wrong reading that file. Try pasting the text instead.");
    } finally {
      setReading(false);
    }
  }

  function review(parsed: ImportedData, fromAi: boolean) {
    const counts = sectionCounts(parsed);
    setData({ parsed, fromAi });
    setInclude(new Set(IMPORT_SECTIONS.filter((s) => counts[s] > 0)));
    setStep("review");
  }

  async function readWithAi() {
    const out = await ai.run({ text: text.slice(0, MAX_IMPORT_CHARS) });
    if (out) review(out, true);
  }

  const resume = useMemo(
    () => (data ? importedToResume(data.parsed, text, { include: [...include], name }) : null),
    [data, text, include, name],
  );
  const counts = data ? sectionCounts(data.parsed) : null;

  async function useResume() {
    if (!resume) return;
    await open(resume);
    router.push("/editor");
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">Import an existing resume</h1>
      <p className="mt-2 text-muted">Your file is read inside this browser — it is never uploaded. You&apos;ll review everything before it&apos;s saved.</p>
      <div className="mt-5">
        <StepDots step={step} />
      </div>

      {step === "source" && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card p-5">
            <h2 className="font-bold">📄 Upload a PDF or Word file</h2>
            <label
              htmlFor={fileId}
              className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-4 py-10 text-center hover:border-primary hover:bg-primary-soft/30"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void onFile(e.dataTransfer.files[0]);
              }}
            >
              <span className="text-3xl" aria-hidden="true">
                {reading ? "⏳" : "⬆️"}
              </span>
              <span className="mt-2 font-semibold">{reading ? "Reading your file…" : "Choose a file or drop it here"}</span>
              <span className="mt-1 text-xs text-muted">.pdf or .docx, up to 5 MB</span>
            </label>
            <input
              id={fileId}
              type="file"
              className="sr-only"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={reading}
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </section>
          <section className="card p-5">
            <h2 className="font-bold">📋 Or paste the text</h2>
            <label htmlFor={pasteId} className="sr-only">
              Resume text
            </label>
            <textarea
              id={pasteId}
              className="input mt-3 text-sm"
              rows={9}
              maxLength={MAX_IMPORT_CHARS}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Copy everything from your old resume and paste it here…"
            />
            <button
              type="button"
              className="btn btn-primary mt-3"
              disabled={text.trim().length < 40}
              onClick={() => {
                setFileName("");
                setStep("text");
              }}
            >
              Continue →
            </button>
          </section>
          {error && (
            <p role="alert" className="md:col-span-2 rounded-lg bg-danger-soft px-4 py-3 text-sm">
              ⚠️ {error}
            </p>
          )}
        </div>
      )}

      {step === "text" && (
        <section className="card p-5">
          <h2 className="font-bold">Check the text{fileName ? ` from “${fileName}”` : ""}</h2>
          <p className="mt-1 text-sm text-muted">Fix anything that came out jumbled. Section headings like EDUCATION or PROJECTS help the basic reader.</p>
          <label htmlFor={`${pasteId}-text`} className="sr-only">
            Extracted resume text
          </label>
          <textarea id={`${pasteId}-text`} className="input mt-3 font-mono text-xs" rows={16} maxLength={MAX_IMPORT_CHARS} value={text} onChange={(e) => setText(e.target.value)} />
          <p className="mt-2 text-xs text-muted">
            🔒 AI reading sends this text to a free AI provider with your email, phone and address removed. Your email and phone are filled in from the
            text locally instead.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setStep("source")}>
              ← Back
            </button>
            <AiButton onClick={readWithAi} busy={ai.busy} waiting={ai.waiting} disabled={text.trim().length < 40}>
              Read with AI
            </AiButton>
            <button type="button" className="btn btn-secondary btn-sm" disabled={text.trim().length < 40} onClick={() => review(parseByHeadings(text), false)}>
              Read without AI (basic)
            </button>
          </div>
          <AiError error={ai.error} countdown={ai.countdown} onDismiss={ai.clearError} />
          {ai.error && <p className="mt-2 text-sm text-muted">You can use “Read without AI (basic)” instead — it splits the text by its headings.</p>}
        </section>
      )}

      {step === "review" && data && resume && counts && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <section className="card h-fit p-5">
            <h2 className="font-bold">Review before saving</h2>
            <p className="mt-1 text-sm text-muted">
              {data.fromAi ? "The AI copied your wording into sections." : "Split by headings, wording unchanged."} Imports can miss or merge things — you
              can fix every detail in the editor next.
            </p>
            <label className="label mt-4" htmlFor={`${pasteId}-name`}>
              Version name
            </label>
            <input id={`${pasteId}-name`} className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            <fieldset className="mt-4">
              <legend className="label">Include these sections</legend>
              <ul className="space-y-1.5">
                {IMPORT_SECTIONS.map((s) => (
                  <li key={s}>
                    <label className={`flex items-center gap-2 text-sm ${counts[s] ? "" : "text-muted"}`}>
                      <input
                        type="checkbox"
                        disabled={!counts[s]}
                        checked={include.has(s)}
                        onChange={(e) =>
                          setInclude((prev) => {
                            const n = new Set(prev);
                            if (e.target.checked) n.add(s);
                            else n.delete(s);
                            return n;
                          })
                        }
                      />
                      {DEFAULT_HEADINGS[s]} <span className="text-xs text-muted">({counts[s] ? counts[s] : "none found"})</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <p className="mt-3 text-xs text-muted">
              Contact found: {[resume.contact.fullName, resume.contact.email, resume.contact.phone].filter(Boolean).join(" · ") || "none — add it in the editor"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setStep("text")}>
                ← Back
              </button>
              <button type="button" className="btn btn-primary" onClick={useResume}>
                ✓ Use this resume
              </button>
            </div>
          </section>
          <section aria-label="Preview of the imported resume" className="min-w-0 overflow-x-auto">
            <div className="mx-auto w-fit overflow-hidden rounded shadow ring-1 ring-black/10" style={{ zoom: PREVIEW_SCALE }}>
              <ResumePreview doc={buildRenderDoc(resume)} />
            </div>
          </section>
        </div>
      )}

      {step === "source" && (
        <p className="mt-6 text-sm text-muted">
          Prefer to start over? <Link href="/start?mode=guided" className="underline">Use the guided builder</Link>.
        </p>
      )}
    </div>
  );
}
