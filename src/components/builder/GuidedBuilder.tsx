"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { GUIDED_PROMPTS } from "@/config/section-fields";
import { useResumeStore, useUndoShortcuts } from "@/hooks/useResumeStore";
import type { ListSectionId, Resume } from "@/lib/resume/schema";
import { ListSectionEditor } from "@/components/editor/ListSectionEditor";
import { SkillsEditor, SummaryEditor } from "@/components/editor/SimpleSections";
import { TextField } from "@/components/editor/fields";
import { QuickAnswer, type BulletSection } from "./QuickAnswer";

interface Step {
  id: string;
  title: string;
  render: (resume: Resume) => ReactNode;
}

/** Slots the AI layer fills in (Phase 7) — the builder works fully without them. */
export interface GuidedAiSlots {
  turnIntoBullets?: (section: BulletSection) => (args: { text: string; propose: (b: string[], fromAi: boolean) => void }) => ReactNode;
  summaryTool?: ReactNode;
  skillsTool?: ReactNode;
}

function Basics({ resume }: { resume: Resume }) {
  const { update } = useResumeStore();
  const c = resume.contact;
  const set = (key: "fullName" | "email" | "phone" | "city" | "linkedin") => (v: string) => update((d) => void (d.contact[key] = v), `contact.${key}`);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <TextField label="Your full name" value={c.fullName} onChange={set("fullName")} autoComplete="name" />
      </div>
      <TextField label="Email" type="email" value={c.email} onChange={set("email")} autoComplete="email" />
      <TextField label="Phone" type="tel" value={c.phone} onChange={set("phone")} autoComplete="tel" />
      <TextField label="City" value={c.city} onChange={set("city")} />
      <TextField label="LinkedIn (optional)" value={c.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/your-name" />
      <div className="sm:col-span-2">
        <TextField
          label="Headline (optional)"
          value={resume.profile.title}
          placeholder="e.g. Class 12 Science Student · Aspiring Engineer"
          onChange={(v) => update((d) => void (d.profile.title = v), "profile.title")}
        />
      </div>
    </div>
  );
}

function Prompt({ section }: { section: keyof typeof GUIDED_PROMPTS }) {
  const p = GUIDED_PROMPTS[section];
  if (!p) return null;
  return (
    <div className="mb-4">
      <p className="text-lg">{p.prompt}</p>
      <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
        <span className="font-semibold">💡 </span>
        {p.example}
      </p>
    </div>
  );
}

export function GuidedBuilder({ ai }: { ai?: GuidedAiSlots }) {
  const router = useRouter();
  const { loaded, resume } = useResumeStore();
  const [index, setIndex] = useState(0);
  useUndoShortcuts();

  const listStep = (id: ListSectionId, title: string, quick?: BulletSection): Step => ({
    id,
    title,
    render: (r) => (
      <>
        <Prompt section={id} />
        {quick && (
          <div className="mb-4">
            <QuickAnswer resume={r} section={quick} renderAiButton={ai?.turnIntoBullets?.(quick)} />
          </div>
        )}
        <ListSectionEditor resume={r} section={id} />
      </>
    ),
  });

  const steps: Step[] = [
    { id: "basics", title: "The basics", render: (r) => <Basics resume={r} /> },
    listStep("education", "Education"),
    listStep("projects", "Projects", "projects"),
    listStep("experience", "Experience", "experience"),
    listStep("leadership", "Leadership", "leadership"),
    listStep("volunteering", "Volunteering", "volunteering"),
    listStep("achievements", "Awards & achievements"),
    listStep("activities", "Activities", "activities"),
    {
      id: "skills",
      title: "Skills",
      render: (r) => (
        <>
          <Prompt section="skills" />
          {ai?.skillsTool}
          <SkillsEditor resume={r} />
        </>
      ),
    },
    {
      id: "summary",
      title: "Summary",
      render: (r) => (
        <>
          <Prompt section="summary" />
          {ai?.summaryTool}
          <SummaryEditor resume={r} />
        </>
      ),
    },
  ];

  if (!loaded) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted" role="status">Loading…</div>;
  if (!resume) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">No resume open</h1>
        <Link href="/start?mode=guided" className="btn btn-primary mt-6">
          Start a new resume
        </Link>
      </div>
    );
  }

  const step = steps[index];
  const last = index === steps.length - 1;
  const progress = Math.round(((index + 1) / steps.length) * 100);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-2 flex items-center justify-between text-sm text-muted">
        <span>
          Step {index + 1} of {steps.length}
        </span>
        <Link href="/editor" className="underline hover:text-text">
          Switch to full editor
        </Link>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Guided builder progress"
      >
        <div className="h-full rounded-full bg-primary-strong transition-all" style={{ width: `${progress}%` }} />
      </div>

      <nav aria-label="Steps" className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-current={i === index ? "step" : undefined}
            className={`btn btn-sm shrink-0 ${i === index ? "btn-primary" : "btn-ghost"}`}
          >
            {s.title}
          </button>
        ))}
      </nav>

      <section className="card mt-4 p-5" aria-labelledby="step-title">
        <h1 id="step-title" className="mb-3 text-2xl font-bold">
          {step.title}
        </h1>
        {step.render(resume)}
      </section>

      <div className="mt-5 flex items-center justify-between gap-2">
        <button type="button" className="btn btn-secondary" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          ← Back
        </button>
        <div className="flex gap-2">
          {!last && (
            <button type="button" className="btn btn-ghost" onClick={() => setIndex((i) => i + 1)}>
              Skip
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => (last ? router.push("/editor") : setIndex((i) => i + 1))}
          >
            {last ? "Finish & preview →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
