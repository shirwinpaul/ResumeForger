/**
 * Content-quality checks (no AI): weak openers, first-person pronouns, long
 * bullets, repeated verbs and missing dates — each with a quick fix where a
 * safe automatic fix exists.
 */
import { QUALITY_LIMITS } from "@/config/limits";
import { itemLabel } from "@/config/section-fields";
import type { ListSectionId, Resume } from "@/lib/resume/schema";
import { DEFAULT_HEADINGS } from "@/lib/resume/sections";

export type QualityType = "weak-phrase" | "pronoun" | "long-bullet" | "repeated-verb" | "missing-dates";

export interface QualityIssue {
  id: string;
  type: QualityType;
  message: string;
  where: string;
  section: ListSectionId;
  itemId: string;
  field?: string;
  index?: number;
  original?: string;
  /** Safe automatic replacement for the bullet, when one exists. */
  fix?: { label: string; replacement: string };
}

export const WEAK_PHRASES = [
  "responsible for",
  "helped with",
  "helped to",
  "helped",
  "worked on",
  "assisted with",
  "assisted in",
  "duties included",
  "tasked with",
  "in charge of",
  "involved in",
  "participated in",
];

/** Alternatives offered when the same verb opens too many bullets. */
export const VERB_ALTERNATIVES: Record<string, string[]> = {
  built: ["Developed", "Created", "Constructed"],
  created: ["Designed", "Produced", "Built"],
  developed: ["Built", "Engineered", "Created"],
  led: ["Directed", "Headed", "Guided"],
  managed: ["Coordinated", "Oversaw", "Ran"],
  organised: ["Coordinated", "Arranged", "Planned"],
  organized: ["Coordinated", "Arranged", "Planned"],
  designed: ["Planned", "Shaped", "Drafted"],
  made: ["Built", "Created", "Produced"],
  worked: ["Collaborated", "Contributed", "Partnered"],
  taught: ["Tutored", "Trained", "Mentored"],
  wrote: ["Authored", "Drafted", "Composed"],
  improved: ["Enhanced", "Strengthened", "Upgraded"],
  used: ["Applied", "Employed", "Leveraged"],
  helped: ["Supported", "Assisted", "Enabled"],
  conducted: ["Ran", "Carried out", "Performed"],
  presented: ["Showcased", "Demonstrated", "Delivered"],
};

const PRONOUN_RE = /\b(I|my|me|myself)\b/;

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function firstWord(bullet: string): string {
  return (bullet.trim().match(/^[A-Za-z][A-Za-z'-]*/)?.[0] ?? "").toLowerCase();
}

/** Removes a weak opener: "Responsible for managing the site" → "Managing the site". */
export function removeWeakPhrase(bullet: string): string | null {
  const t = bullet.trim();
  const lower = t.toLowerCase();
  const phrase = WEAK_PHRASES.find((p) => lower.startsWith(p + " "));
  if (!phrase) return null;
  const rest = t.slice(phrase.length).trim().replace(/^(the\s+)?(task of|process of)\s+/i, "");
  return rest ? capitalise(rest) : null;
}

/** Drops first-person pronouns: "I built my first app" → "Built first app". */
export function removePronouns(bullet: string): string {
  const out = bullet
    .trim()
    .replace(/^(I|We)\s+/, "")
    .replace(/\b(my|our)\s+/gi, "")
    .replace(/\s+\b(I|me|myself)\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return capitalise(out);
}

const BULLET_SECTIONS: { section: ListSectionId; field: string }[] = [
  { section: "experience", field: "bullets" },
  { section: "projects", field: "bullets" },
  { section: "leadership", field: "bullets" },
  { section: "volunteering", field: "bullets" },
  { section: "activities", field: "bullets" },
  { section: "education", field: "highlights" },
];

const DATED_SECTIONS: ListSectionId[] = ["education", "experience", "projects", "leadership", "volunteering", "activities"];

export function runQualityChecks(resume: Resume): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const verbUses = new Map<string, { section: ListSectionId; itemId: string; field: string; index: number; where: string; bullet: string }[]>();

  for (const { section, field } of BULLET_SECTIONS) {
    if (resume.layout.hidden.includes(section)) continue;
    for (const it of resume[section] as unknown as Record<string, unknown>[]) {
      const itemId = it.id as string;
      const where = `${DEFAULT_HEADINGS[section]} › ${itemLabel(section, it)}`;
      const bullets = (it[field] as string[]) ?? [];
      bullets.forEach((bullet, index) => {
        const b = bullet.trim();
        if (!b) return;
        const base = { section, itemId, field, index, where, original: bullet };
        const id = `${section}:${itemId}:${field}:${index}`;

        const weakFixed = removeWeakPhrase(b);
        if (weakFixed !== null) {
          const phrase = WEAK_PHRASES.find((p) => b.toLowerCase().startsWith(p + " "))!;
          issues.push({
            ...base,
            id: `${id}:weak`,
            type: "weak-phrase",
            message: `Starts with a weak phrase (“${capitalise(phrase)}”). Lead with an action verb.`,
            fix: { label: "Remove weak phrase", replacement: weakFixed },
          });
        }
        if (PRONOUN_RE.test(b)) {
          issues.push({
            ...base,
            id: `${id}:pronoun`,
            type: "pronoun",
            message: "Uses first-person words (“I”, “my”). Resumes leave these out.",
            fix: { label: "Remove pronouns", replacement: removePronouns(b) },
          });
        }
        if (b.length > QUALITY_LIMITS.maxBulletChars) {
          issues.push({
            ...base,
            id: `${id}:long`,
            type: "long-bullet",
            message: `Long bullet (${b.length} characters, more than 2 lines). Try to keep it under ${QUALITY_LIMITS.maxBulletChars}.`,
          });
        }
        const verb = firstWord(b);
        if (verb) {
          const list = verbUses.get(verb) ?? [];
          list.push({ section, itemId, field, index, where, bullet: b });
          verbUses.set(verb, list);
        }
      });
    }
  }

  // Repeated verbs: the same opener on 3+ bullets, or twice within one item.
  for (const [verb, uses] of verbUses) {
    if (WEAK_PHRASES.some((p) => p.split(" ")[0] === verb)) continue;
    const perItem = new Map<string, number>();
    uses.forEach((u) => perItem.set(u.itemId, (perItem.get(u.itemId) ?? 0) + 1));
    const repeatedInItem = [...perItem.values()].some((n) => n > 1);
    if (uses.length < 3 && !repeatedInItem) continue;
    const alts = VERB_ALTERNATIVES[verb] ?? [];
    // Flag every use after the first, offering a different alternative each time.
    uses.slice(1).forEach((u, n) => {
      const alt = alts[n % Math.max(alts.length, 1)];
      issues.push({
        id: `${u.section}:${u.itemId}:${u.field}:${u.index}:verb`,
        type: "repeated-verb",
        message: `“${capitalise(verb)}” starts ${uses.length} bullets. Vary your verbs.`,
        where: u.where,
        section: u.section,
        itemId: u.itemId,
        field: u.field,
        index: u.index,
        original: u.bullet,
        fix: alt ? { label: `Use “${alt}”`, replacement: alt + u.bullet.trim().slice(verb.length) } : undefined,
      });
    });
  }

  // Missing dates
  for (const section of DATED_SECTIONS) {
    if (resume.layout.hidden.includes(section)) continue;
    for (const it of resume[section] as unknown as Record<string, unknown>[]) {
      if (!it.start && !it.end && !it.current) {
        issues.push({
          id: `${section}:${it.id}:dates`,
          type: "missing-dates",
          message: "No dates. Add when you started (and finished).",
          where: `${DEFAULT_HEADINGS[section]} › ${itemLabel(section, it)}`,
          section,
          itemId: it.id as string,
        });
      }
    }
  }
  return issues;
}
