/**
 * Builds contact-free AI inputs from a resume and maps AI replies back to it.
 * Bullets are addressed by short refs ("pr0.1" = projects item 0, bullet 1) so
 * prompts stay small and replies can only point at lines that exist.
 */
import { itemLabel } from "@/config/section-fields";
import { resumeContentForAi } from "@/lib/export/text";
import { listOf } from "@/lib/resume/edit";
import type { ListSectionId, Resume } from "@/lib/resume/schema";
import type { AiInput } from "./contracts";

export const BULLET_SECTIONS = {
  education: { code: "ed", field: "highlights" },
  experience: { code: "ex", field: "bullets" },
  projects: { code: "pr", field: "bullets" },
  leadership: { code: "le", field: "bullets" },
  volunteering: { code: "vo", field: "bullets" },
  activities: { code: "ac", field: "bullets" },
} as const satisfies Partial<Record<ListSectionId, { code: string; field: string }>>;

export type BulletSectionId = keyof typeof BULLET_SECTIONS;

export interface LineTarget {
  ref: string;
  section: BulletSectionId | "summary";
  itemId: string;
  field: string;
  index: number;
  text: string;
  /** Human label, e.g. "Projects · Weather app". */
  where: string;
}

const SECTION_NAMES: Record<BulletSectionId, string> = {
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  leadership: "Leadership",
  volunteering: "Volunteering",
  activities: "Activities",
};

/** Every non-empty bullet (and optionally the summary) with a short ref. Hidden sections are skipped. */
export function collectLines(resume: Resume, opts: { includeSummary?: boolean } = {}): LineTarget[] {
  const lines: LineTarget[] = [];
  if (opts.includeSummary && resume.summary.trim() && !resume.layout.hidden.includes("summary")) {
    lines.push({ ref: "su", section: "summary", itemId: "", field: "summary", index: 0, text: resume.summary.trim(), where: "Summary" });
  }
  for (const section of Object.keys(BULLET_SECTIONS) as BulletSectionId[]) {
    if (resume.layout.hidden.includes(section)) continue;
    const { code, field } = BULLET_SECTIONS[section];
    listOf(resume, section).forEach((item, i) => {
      ((item[field] as string[]) ?? []).forEach((text, j) => {
        if (!text.trim()) return;
        lines.push({
          ref: `${code}${i}.${j}`,
          section,
          itemId: item.id,
          field,
          index: j,
          text: text.trim(),
          where: `${SECTION_NAMES[section]} · ${itemLabel(section, item)}`,
        });
      });
    });
  }
  return lines;
}

/**
 * Writes `text` into the line a target points at — only if that line still holds
 * the original text, so an AI reply never overwrites something the user changed since.
 * Returns false when the line moved or changed.
 */
export function applyLine(draft: Resume, target: LineTarget, text: string): boolean {
  if (target.section === "summary") {
    if (draft.summary.trim() !== target.text) return false;
    draft.summary = text;
    return true;
  }
  const item = listOf(draft, target.section).find((i) => i.id === target.itemId);
  const list = item?.[target.field] as string[] | undefined;
  if (!list || list[target.index]?.trim() !== target.text) return false;
  list[target.index] = text;
  return true;
}

export function summaryInput(resume: Resume): AiInput<"summary"> {
  return { targetType: resume.profile.targetType, content: resumeContentForAi(resume, ["summary"]).slice(0, 8000) };
}

/** Items that can evidence skills: projects, roles, activities and certifications. */
export function skillsInput(resume: Resume): AiInput<"skills"> {
  const items: AiInput<"skills">["items"] = [];
  const push = (id: string, label: string, parts: (string | string[])[]) => {
    const text = parts
      .flat()
      .map((p) => p.trim())
      .filter(Boolean)
      .join(". ");
    if (text) items.push({ id, label: label.slice(0, 200), text: text.slice(0, 3000) });
  };
  resume.projects.forEach((p) => push(p.id, `Project: ${p.name}`, [p.name, p.tech.join(", "), p.bullets]));
  (["experience", "leadership", "volunteering"] as const).forEach((s) =>
    resume[s].forEach((r) => push(r.id, `${SECTION_NAMES[s]}: ${[r.title, r.organization].filter(Boolean).join(", ")}`, [r.title, r.bullets])),
  );
  resume.activities.forEach((a) => push(a.id, `Activity: ${a.name}`, [a.name, a.description, a.bullets]));
  resume.certifications.forEach((c) => push(c.id, `Certification: ${c.name}`, [c.name, c.issuer]));
  return { items: items.slice(0, 30), existing: allSkills(resume).slice(0, 100) };
}

export function allSkills(resume: Resume): string[] {
  const s = resume.skills;
  return [...s.technical, ...s.tools, ...s.languages, ...s.soft].map((x) => x.trim()).filter(Boolean);
}

/** The item a skill suggestion cites, for display ("from Project: Weather app"). */
export function sourceLabel(resume: Resume, sourceId: string): string {
  return skillsInput(resume).items.find((i) => i.id === sourceId)?.label ?? "your resume";
}

export function tailorInput(
  resume: Resume,
  targetKind: "job" | "programme",
  description: string,
): { input: AiInput<"tailor">; lines: LineTarget[] } {
  const lines = collectLines(resume).slice(0, 60);
  return {
    lines,
    input: {
      targetKind,
      description: description.slice(0, 8000),
      targetType: resume.profile.targetType,
      sections: resume.layout.sectionOrder.filter((id) => !resume.layout.hidden.includes(id)),
      bullets: lines.map((l) => ({ ref: l.ref, text: l.text.slice(0, 600) })),
      skills: allSkills(resume).slice(0, 100),
      summary: resume.summary.slice(0, 1200),
    },
  };
}

export function grammarInput(resume: Resume): { input: AiInput<"grammar">; lines: LineTarget[] } {
  const lines = collectLines(resume, { includeSummary: true }).slice(0, 80);
  return { lines, input: { lines: lines.map((l) => ({ ref: l.ref, text: l.text.slice(0, 600) })) } };
}

export function activityInput(resume: Resume): AiInput<"activity"> {
  return {
    activities: resume.activities.slice(0, 10).map((a) => ({
      id: a.id,
      name: a.name || "Activity",
      category: a.category,
      position: a.position,
      organization: a.organization,
      details: [a.description, ...a.bullets]
        .map((x) => x.trim())
        .filter(Boolean)
        .join(". ")
        .slice(0, 2000),
    })),
  };
}

/** All of the user's own words — what the honesty check compares AI output against. */
export function honestySources(resume: Resume): string[] {
  return [resumeContentForAi(resume), resume.profile.title];
}
