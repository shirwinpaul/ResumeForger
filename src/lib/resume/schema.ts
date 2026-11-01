import { z } from "zod";
import {
  ACCENT_COLORS,
  DATE_FORMATS,
  RESUME_FONTS,
  TEMPLATE_IDS,
  type DateFormatId,
} from "@/config/templates";
import { LAYOUT_LIMITS } from "@/config/limits";

/**
 * The resume data model. Every resume stored in the browser, exported as JSON
 * or produced by the AI import parser is validated against these schemas.
 *
 * Bump SCHEMA_VERSION and add a step to `migrateResume` whenever the stored
 * shape changes.
 */
export const SCHEMA_VERSION = 2;

export const SECTION_IDS = [
  "summary",
  "education",
  "experience",
  "projects",
  "leadership",
  "volunteering",
  "achievements",
  "certifications",
  "skills",
  "activities",
  "publications",
  "hobbies",
  "references",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const TARGET_TYPES = [
  "University application",
  "Internship",
  "Job",
  "Scholarship",
  "General",
] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export const ACHIEVEMENT_LEVELS = [
  "school",
  "district",
  "state",
  "national",
  "international",
] as const;

export const SCORE_TYPES = ["%", "CGPA", "GPA", "Grade"] as const;

export const EXPERIENCE_TYPES = ["Internship", "Part-time", "Full-time", "Freelance", "Other"] as const;

export const ACTIVITY_CATEGORIES = [
  "Club",
  "Sports",
  "Arts",
  "Music",
  "Debate",
  "Community",
  "Academic",
  "Other",
] as const;

const id = z.string().min(1);
const text = z.string().max(5000).default("");
const shortText = z.string().max(300).default("");
const stringList = z.array(z.string().max(1000)).default(() => []);
/** Dates are stored as "YYYY-MM" or "YYYY" (empty when unknown). */
const dateValue = z
  .string()
  .regex(/^(\d{4}(-(0[1-9]|1[0-2]))?)?$/, "Use YYYY-MM or YYYY")
  .default("");

const dateRange = {
  start: dateValue,
  end: dateValue,
  current: z.boolean().default(false),
};

export const educationSchema = z.object({
  id,
  institution: shortText,
  board: shortText,
  degree: shortText,
  major: shortText,
  scoreType: z.enum(SCORE_TYPES).default("%"),
  score: shortText,
  location: shortText,
  ...dateRange,
  highlights: stringList,
});

export const projectSchema = z.object({
  id,
  name: shortText,
  role: shortText,
  tech: stringList,
  link: shortText,
  ...dateRange,
  bullets: stringList,
});

/** Shared shape for experience, leadership and volunteering. */
export const roleSchema = z.object({
  id,
  title: shortText,
  organization: shortText,
  type: z.enum(EXPERIENCE_TYPES).default("Other"),
  location: shortText,
  ...dateRange,
  bullets: stringList,
});

export const achievementSchema = z.object({
  id,
  title: shortText,
  issuer: shortText,
  level: z.enum(ACHIEVEMENT_LEVELS).default("school"),
  date: dateValue,
  description: text,
});

export const certificationSchema = z.object({
  id,
  name: shortText,
  issuer: shortText,
  date: dateValue,
  link: shortText,
});

export const activitySchema = z.object({
  id,
  name: shortText,
  category: z.enum(ACTIVITY_CATEGORIES).default("Other"),
  /** Common App–style fields (filled by the user or the activity writer). */
  position: shortText,
  organization: shortText,
  description: text,
  ...dateRange,
  bullets: stringList,
});

export const publicationSchema = z.object({
  id,
  title: shortText,
  authors: shortText,
  venue: shortText,
  date: dateValue,
  link: shortText,
});

export const referenceSchema = z.object({
  id,
  name: shortText,
  relation: shortText,
  contact: shortText,
});

export const skillsSchema = z.object({
  technical: stringList,
  tools: stringList,
  languages: stringList,
  soft: stringList,
});

export const contactSchema = z.object({
  fullName: shortText,
  email: shortText,
  phone: shortText,
  city: shortText,
  state: shortText,
  country: shortText,
  linkedin: shortText,
  github: shortText,
  portfolio: shortText,
  /** Data URL; only rendered by templates that support photos. */
  photo: z.string().max(1_500_000).default(""),
});

export const profileSchema = z.object({
  targetType: z.enum(TARGET_TYPES).default("General"),
  country: z.string().default("IN"),
  title: shortText,
});

const fontIds = RESUME_FONTS.map((f) => f.id) as [string, ...string[]];
const dateFormatIds = DATE_FORMATS.map((d) => d.id) as [DateFormatId, ...DateFormatId[]];

export const layoutSchema = z.object({
  template: z.enum(TEMPLATE_IDS).default("classic"),
  sectionOrder: z.array(z.enum(SECTION_IDS)).default(() => [...SECTION_IDS]),
  hidden: z.array(z.enum(SECTION_IDS)).default(() => []),
  /** Custom heading text per section (empty/missing = standard heading). */
  headings: z.partialRecord(z.enum(SECTION_IDS), z.string().max(60)).default(() => ({})),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default(ACCENT_COLORS[0].value),
  font: z.enum(fontIds).default("inter"),
  fontSizePt: z
    .number()
    .min(LAYOUT_LIMITS.fontSizePt.min)
    .max(LAYOUT_LIMITS.fontSizePt.max)
    .default(LAYOUT_LIMITS.fontSizePt.default),
  marginMm: z
    .number()
    .min(LAYOUT_LIMITS.marginMm.min)
    .max(LAYOUT_LIMITS.marginMm.max)
    .default(LAYOUT_LIMITS.marginMm.default),
  lineHeight: z
    .number()
    .min(LAYOUT_LIMITS.lineHeight.min)
    .max(LAYOUT_LIMITS.lineHeight.max)
    .default(LAYOUT_LIMITS.lineHeight.default),
  sectionGapPt: z
    .number()
    .min(LAYOUT_LIMITS.sectionGapPt.min)
    .max(LAYOUT_LIMITS.sectionGapPt.max)
    .default(LAYOUT_LIMITS.sectionGapPt.default),
  dateFormat: z.enum(dateFormatIds).default("MMM YYYY"),
  pageSize: z.enum(["A4", "Letter"]).default("A4"),
});

export const resumeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id,
  /** Version name, e.g. "Oxford CS" or "Internship – Web Dev". */
  name: z.string().min(1).max(80),
  createdAt: z.string(),
  updatedAt: z.string(),
  profile: profileSchema,
  contact: contactSchema,
  summary: text,
  education: z.array(educationSchema).default(() => []),
  experience: z.array(roleSchema).default(() => []),
  projects: z.array(projectSchema).default(() => []),
  leadership: z.array(roleSchema).default(() => []),
  volunteering: z.array(roleSchema).default(() => []),
  achievements: z.array(achievementSchema).default(() => []),
  certifications: z.array(certificationSchema).default(() => []),
  skills: skillsSchema,
  activities: z.array(activitySchema).default(() => []),
  publications: z.array(publicationSchema).default(() => []),
  hobbies: stringList,
  references: z.object({
    mode: z.enum(["hidden", "on-request", "list"]).default("hidden"),
    entries: z.array(referenceSchema).default(() => []),
  }),
  layout: layoutSchema,
});

export type Resume = z.infer<typeof resumeSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Achievement = z.infer<typeof achievementSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Publication = z.infer<typeof publicationSchema>;
export type Reference = z.infer<typeof referenceSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type ResumeLayout = z.infer<typeof layoutSchema>;

/** Sections that hold a list of items with ids (reorderable). */
export const LIST_SECTIONS = [
  "education",
  "experience",
  "projects",
  "leadership",
  "volunteering",
  "achievements",
  "certifications",
  "activities",
  "publications",
] as const satisfies readonly SectionId[];
export type ListSectionId = (typeof LIST_SECTIONS)[number];

export function isListSection(s: SectionId): s is ListSectionId {
  return (LIST_SECTIONS as readonly string[]).includes(s);
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Creates a valid empty resume with all defaults filled in. */
export function createEmptyResume(name = "My Resume", now = new Date().toISOString()): Resume {
  return resumeSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    name,
    createdAt: now,
    updatedAt: now,
    profile: {},
    contact: {},
    skills: {},
    references: {},
    layout: {},
  });
}

/** Empty item factories, used by the editor's "Add" buttons. */
export const emptyItem = {
  education: () => educationSchema.parse({ id: newId() }),
  experience: () => roleSchema.parse({ id: newId(), type: "Internship" }),
  projects: () => projectSchema.parse({ id: newId() }),
  leadership: () => roleSchema.parse({ id: newId() }),
  volunteering: () => roleSchema.parse({ id: newId() }),
  achievements: () => achievementSchema.parse({ id: newId() }),
  certifications: () => certificationSchema.parse({ id: newId() }),
  activities: () => activitySchema.parse({ id: newId() }),
  publications: () => publicationSchema.parse({ id: newId() }),
} satisfies Record<ListSectionId, () => unknown>;

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

/**
 * Version 1 (the first release format) differed from v2:
 *  - `skills` was a flat string array
 *  - education `highlights` and item `bullets` were newline-separated strings
 *  - there was no `layout` (template lived at the top level as `template`)
 *  - `references` was a plain string ("available on request" or "")
 */
type UnknownRecord = Record<string, unknown>;

function splitLines(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v !== "string") return [];
  return v
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function migrateV1toV2(old: UnknownRecord): UnknownRecord {
  const listKeys = ["projects", "experience", "leadership", "volunteering", "activities"];
  const next: UnknownRecord = { ...old, schemaVersion: 2 };
  for (const key of listKeys) {
    if (Array.isArray(old[key])) {
      next[key] = (old[key] as UnknownRecord[]).map((item) => ({ ...item, bullets: splitLines(item.bullets) }));
    }
  }
  if (Array.isArray(old.education)) {
    next.education = (old.education as UnknownRecord[]).map((e) => ({
      ...e,
      highlights: splitLines(e.highlights),
    }));
  }
  next.skills = Array.isArray(old.skills) ? { technical: old.skills } : (old.skills ?? {});
  next.layout = { template: typeof old.template === "string" ? old.template : "classic" };
  delete next.template;
  const refs = old.references;
  next.references =
    typeof refs === "string"
      ? { mode: refs.trim() ? "on-request" : "hidden", entries: [] }
      : (refs ?? {});
  return next;
}

export type MigrationResult =
  | { ok: true; resume: Resume; migrated: boolean }
  | { ok: false; error: string };

/** Migrates any known older version to the current one, then validates. */
export function migrateResume(input: unknown): MigrationResult {
  if (!input || typeof input !== "object") return { ok: false, error: "Not a resume object" };
  let data = { ...(input as UnknownRecord) };
  const startVersion = typeof data.schemaVersion === "number" ? data.schemaVersion : 1;
  if (startVersion > SCHEMA_VERSION) {
    return { ok: false, error: "This resume was made with a newer version of ResumeForge." };
  }
  if (startVersion < 2) data = migrateV1toV2(data);
  const now = new Date().toISOString();
  data.id ??= newId();
  data.name ??= "Imported resume";
  data.createdAt ??= now;
  data.updatedAt ??= now;
  data.profile ??= {};
  data.contact ??= {};
  data.skills ??= {};
  data.references ??= {};
  data.layout ??= {};
  const parsed = resumeSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: `Invalid resume: ${first.path.join(".")} — ${first.message}` };
  }
  return { ok: true, resume: normalizeLayout(parsed.data), migrated: startVersion < SCHEMA_VERSION };
}

/** Ensures section order contains every section exactly once. */
export function normalizeLayout(resume: Resume): Resume {
  const seen = new Set<SectionId>();
  const order: SectionId[] = [];
  for (const s of resume.layout.sectionOrder) {
    if (!seen.has(s)) {
      seen.add(s);
      order.push(s);
    }
  }
  for (const s of SECTION_IDS) if (!seen.has(s)) order.push(s);
  return { ...resume, layout: { ...resume.layout, sectionOrder: order } };
}
