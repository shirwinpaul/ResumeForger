/**
 * Input and output contracts for every AI action (Section 6 of the spec).
 * Shared by the browser (to build requests and read replies) and the server
 * (to validate both). Inputs never contain contact fields — the server strips
 * them again anyway (see privacy.ts).
 */
import { z } from "zod";
import { ACTIVITY_CATEGORIES, TARGET_TYPES } from "@/lib/resume/schema";

const line = z.string().trim().min(1).max(600);
const shortLine = z.string().trim().max(200).default("");
/** A reference to one bullet/line in the request, e.g. "experience.2.1". */
const ref = z.string().min(1).max(60);

/** Where a bullet lives — helps the model pick tense and tone. */
const bulletContext = z
  .object({
    section: shortLine,
    title: shortLine,
    organization: shortLine,
    /** True when the item has no end date (use present tense). */
    current: z.boolean().default(false),
  })
  .partial()
  .default({});

const refLine = z.object({ ref, text: line });

/** A compact, contact-free view of one resume item. */
const sourceItem = z.object({
  id: z.string().min(1).max(60),
  label: z.string().trim().max(200),
  text: z.string().max(3000),
});

export const AI_ACTIONS = ["bullets", "polish", "summary", "skills", "tailor", "activity", "grammar", "import", "trim"] as const;
export type AiAction = (typeof AI_ACTIONS)[number];

export function isAiAction(v: string): v is AiAction {
  return (AI_ACTIONS as readonly string[]).includes(v);
}

export const aiInputSchemas = {
  bullets: z.object({ answer: z.string().trim().min(3).max(2000), context: bulletContext }),
  polish: z.object({ bullet: line, context: bulletContext }),
  summary: z.object({
    targetType: z.enum(TARGET_TYPES),
    /** Existing resume content (education, experience, projects, skills…) as plain text. */
    content: z.string().trim().min(10).max(8000),
  }),
  skills: z.object({
    items: z.array(sourceItem).min(1).max(30),
    existing: z.array(z.string().max(80)).max(100).default([]),
  }),
  tailor: z.object({
    targetKind: z.enum(["job", "programme"]),
    description: z.string().trim().min(30).max(8000),
    targetType: z.enum(TARGET_TYPES),
    sections: z.array(z.string().max(40)).max(20).default([]),
    bullets: z.array(refLine).max(60),
    skills: z.array(z.string().max(80)).max(100).default([]),
    summary: z.string().max(1200).default(""),
  }),
  activity: z.object({
    activities: z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          name: z.string().trim().max(200),
          category: z.enum(ACTIVITY_CATEGORIES).default("Other"),
          position: z.string().max(200).default(""),
          organization: z.string().max(200).default(""),
          details: z.string().max(2000).default(""),
        }),
      )
      .min(1)
      .max(10),
  }),
  grammar: z.object({ lines: z.array(refLine).min(1).max(80) }),
  import: z.object({ text: z.string().trim().min(40).max(20000) }),
  trim: z.object({ bullet: line, maxChars: z.number().int().min(40).max(400) }),
} satisfies Record<AiAction, z.ZodType>;

export type AiInput<A extends AiAction> = z.input<(typeof aiInputSchemas)[A]>;
type ParsedInput<A extends AiAction> = z.output<(typeof aiInputSchemas)[A]>;
export type { ParsedInput };

const outLine = z.string().trim().min(1).max(400);

export const aiOutputSchemas = {
  bullets: z.object({ bullets: z.array(outLine).min(1).max(4) }),
  polish: z.object({ alternatives: z.array(outLine).min(1).max(3) }),
  summary: z.object({ summary: z.string().trim().min(20).max(600) }),
  skills: z.object({
    skills: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(60),
          category: z.enum(["technical", "tools", "languages", "soft"]),
          sourceId: z.string().min(1).max(60),
          evidence: z.string().trim().max(200),
        }),
      )
      .max(15),
  }),
  tailor: z.object({
    keywords: z.array(z.object({ keyword: z.string().trim().min(1).max(60), present: z.boolean() })).max(25),
    reorder: z.array(z.object({ suggestion: z.string().trim().min(1).max(200) })).max(5),
    rewrites: z.array(z.object({ ref, rewritten: outLine, why: z.string().trim().max(200).default("") })).max(6),
    matchSummary: z.string().trim().min(1).max(600),
  }),
  activity: z.object({
    activities: z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          position: z.string().trim().max(120),
          organization: z.string().trim().max(200),
          description: z.string().trim().max(400),
        }),
      )
      .max(10),
  }),
  grammar: z.object({
    fixes: z
      .array(
        z.object({
          ref,
          fixed: outLine,
          kind: z.enum(["tense", "date", "capitalisation", "duplicate-verb", "spelling", "grammar", "punctuation"]),
          note: z.string().trim().max(160).default(""),
        }),
      )
      .max(40),
  }),
  import: z.object({
    contact: z
      .object({
        fullName: z.string().default(""),
        city: z.string().default(""),
        state: z.string().default(""),
        country: z.string().default(""),
        linkedin: z.string().default(""),
        github: z.string().default(""),
        portfolio: z.string().default(""),
      })
      .partial()
      .default({}),
    summary: z.string().default(""),
    education: z
      .array(
        z.object({
          institution: z.string().default(""),
          degree: z.string().default(""),
          major: z.string().default(""),
          score: z.string().default(""),
          location: z.string().default(""),
          start: z.string().default(""),
          end: z.string().default(""),
          highlights: z.array(z.string()).default([]),
        }),
      )
      .default([]),
    experience: z.array(importedRole()).default([]),
    leadership: z.array(importedRole()).default([]),
    volunteering: z.array(importedRole()).default([]),
    projects: z
      .array(
        z.object({
          name: z.string().default(""),
          role: z.string().default(""),
          tech: z.array(z.string()).default([]),
          link: z.string().default(""),
          start: z.string().default(""),
          end: z.string().default(""),
          bullets: z.array(z.string()).default([]),
        }),
      )
      .default([]),
    achievements: z
      .array(z.object({ title: z.string().default(""), issuer: z.string().default(""), date: z.string().default(""), description: z.string().default("") }))
      .default([]),
    certifications: z
      .array(z.object({ name: z.string().default(""), issuer: z.string().default(""), date: z.string().default(""), link: z.string().default("") }))
      .default([]),
    skills: z
      .object({
        technical: z.array(z.string()).default([]),
        tools: z.array(z.string()).default([]),
        languages: z.array(z.string()).default([]),
        soft: z.array(z.string()).default([]),
      })
      .default({ technical: [], tools: [], languages: [], soft: [] }),
    hobbies: z.array(z.string()).default([]),
  }),
  trim: z.object({ shorter: outLine }),
} satisfies Record<AiAction, z.ZodType>;

function importedRole() {
  return z.object({
    title: z.string().default(""),
    organization: z.string().default(""),
    location: z.string().default(""),
    start: z.string().default(""),
    end: z.string().default(""),
    bullets: z.array(z.string()).default([]),
  });
}

export type AiOutput<A extends AiAction> = z.output<(typeof aiOutputSchemas)[A]>;

/** Successful reply body from /api/ai/[action]. */
export interface AiSuccessBody<A extends AiAction> {
  data: AiOutput<A>;
  provider: "gemini" | "groq" | "mock";
}
