/**
 * Turns parsed import data (from the AI parser or the no-AI heading parser) into
 * a valid Resume. Pure, so it is unit-tested. Contact details (email, phone) are
 * detected locally from the raw text — they are never needed from the AI.
 */
import type { AiOutput } from "@/lib/ai/contracts";
import { createEmptyResume, emptyItem, resumeSchema, type Resume, type SectionId } from "@/lib/resume/schema";

export type ImportedData = AiOutput<"import">;

/** Sections the review screen lets the user include or leave out. */
export const IMPORT_SECTIONS = [
  "summary",
  "education",
  "experience",
  "projects",
  "leadership",
  "volunteering",
  "achievements",
  "certifications",
  "skills",
  "hobbies",
] as const satisfies readonly (keyof ImportedData & SectionId)[];
export type ImportSection = (typeof IMPORT_SECTIONS)[number];

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "Jan 2024" / "January 2024" / "01/2024" / "2024-1" / "2024" → "YYYY-MM" | "YYYY" | "". */
export function normalizeDate(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return "";
  let m = s.match(/^(\d{4})[-/.](\d{1,2})/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${m[1].padStart(2, "0")}`;
  m = s.match(/([a-z]{3,9})\.?,?\s*'?(\d{4})/);
  if (m && MONTHS[m[1].slice(0, 3)]) return `${m[2]}-${String(MONTHS[m[1].slice(0, 3)]).padStart(2, "0")}`;
  m = s.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : "";
}

export function isPresent(raw: string): boolean {
  return /^(present|current|now|ongoing|till date|to date)$/i.test(raw.trim());
}

function range(start: string, end: string) {
  const current = isPresent(end);
  return { start: normalizeDate(start), end: current ? "" : normalizeDate(end), current };
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{3,5}/;

/** Email, phone and profile links found in the raw text (browser-side only). */
export function detectContact(text: string) {
  const email = text.match(EMAIL)?.[0] ?? "";
  const phone = (text.match(PHONE)?.[0] ?? "").trim();
  const link = (re: RegExp) => text.match(re)?.[0]?.replace(/[).,;]+$/, "") ?? "";
  return {
    email,
    phone: (phone.match(/\d/g) ?? []).length >= 8 ? phone : "",
    linkedin: link(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i),
    github: link(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+\/?/i),
  };
}

const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const cleanList = (list: string[] | undefined) => (list ?? []).map((b) => clean(b).replace(/^[-•*▪●◦]\s*/, "")).filter(Boolean);

/** How many entries each section has — shown on the review screen. */
export function sectionCounts(data: ImportedData): Record<ImportSection, number> {
  const s = data.skills;
  return {
    summary: clean(data.summary) ? 1 : 0,
    education: data.education.length,
    experience: data.experience.length,
    projects: data.projects.length,
    leadership: data.leadership.length,
    volunteering: data.volunteering.length,
    achievements: data.achievements.length,
    certifications: data.certifications.length,
    skills: s.technical.length + s.tools.length + s.languages.length + s.soft.length,
    hobbies: data.hobbies.length,
  };
}

export function importedToResume(
  data: ImportedData,
  rawText: string,
  opts: { include?: ImportSection[]; base?: Partial<Pick<Resume["profile"], "targetType" | "country">>; name?: string } = {},
): Resume {
  const include = new Set(opts.include ?? IMPORT_SECTIONS);
  const r = createEmptyResume(opts.name || "Imported resume");
  Object.assign(r.profile, opts.base);
  const local = detectContact(rawText);
  const c = data.contact;
  Object.assign(r.contact, {
    fullName: clean(c.fullName),
    email: local.email,
    phone: local.phone,
    city: clean(c.city),
    state: clean(c.state),
    country: clean(c.country),
    linkedin: clean(c.linkedin) || local.linkedin,
    github: clean(c.github) || local.github,
    portfolio: clean(c.portfolio),
  });

  if (include.has("summary")) r.summary = clean(data.summary);
  if (include.has("education")) {
    r.education = data.education.map((e) => ({
      ...emptyItem.education(),
      institution: clean(e.institution),
      degree: clean(e.degree),
      major: clean(e.major),
      score: clean(e.score).replace(/%$/, ""),
      location: clean(e.location),
      ...range(e.start, e.end),
      highlights: cleanList(e.highlights),
    }));
  }
  for (const key of ["experience", "leadership", "volunteering"] as const) {
    if (!include.has(key)) continue;
    r[key] = data[key].map((x) => ({
      ...emptyItem[key](),
      title: clean(x.title),
      organization: clean(x.organization),
      location: clean(x.location),
      ...range(x.start, x.end),
      bullets: cleanList(x.bullets),
    }));
  }
  if (include.has("projects")) {
    r.projects = data.projects.map((p) => ({
      ...emptyItem.projects(),
      name: clean(p.name),
      role: clean(p.role),
      tech: cleanList(p.tech),
      link: clean(p.link),
      ...range(p.start, p.end),
      bullets: cleanList(p.bullets),
    }));
  }
  if (include.has("achievements")) {
    r.achievements = data.achievements.map((a) => ({
      ...emptyItem.achievements(),
      title: clean(a.title),
      issuer: clean(a.issuer),
      date: normalizeDate(a.date),
      description: clean(a.description),
    }));
  }
  if (include.has("certifications")) {
    r.certifications = data.certifications.map((x) => ({
      ...emptyItem.certifications(),
      name: clean(x.name),
      issuer: clean(x.issuer),
      date: normalizeDate(x.date),
      link: clean(x.link),
    }));
  }
  if (include.has("skills")) {
    r.skills = {
      technical: cleanList(data.skills.technical),
      tools: cleanList(data.skills.tools),
      languages: cleanList(data.skills.languages),
      soft: cleanList(data.skills.soft),
    };
  }
  if (include.has("hobbies")) r.hobbies = cleanList(data.hobbies);
  // Final safety net: whatever came in, the result must be a valid resume.
  return resumeSchema.parse(r);
}

// ---------------------------------------------------------------------------
// No-AI fallback: split by standard headings, keep the wording exactly.
// ---------------------------------------------------------------------------

const HEADING_MAP: [RegExp, ImportSection][] = [
  [/^(summary|profile|about me|objective|career objective|professional summary)$/, "summary"],
  [/^(education|academics|academic background|education & qualifications)$/, "education"],
  [/^(experience|work experience|employment|internships?|professional experience|work history)$/, "experience"],
  [/^(projects|personal projects|academic projects|key projects)$/, "projects"],
  [/^(leadership|leadership experience|positions of responsibility)$/, "leadership"],
  [/^(volunteering|volunteer experience|community service|social work)$/, "volunteering"],
  [/^(awards|achievements|honours|honors|awards & achievements|awards and achievements)$/, "achievements"],
  [/^(certifications?|courses|certificates|licenses & certifications)$/, "certifications"],
  [/^(skills|technical skills|key skills|skills & interests)$/, "skills"],
  [/^(hobbies|interests|hobbies & interests|hobbies and interests)$/, "hobbies"],
];

function headingOf(line: string): ImportSection | null {
  const key = line.toLowerCase().replace(/[:\s]+$/, "").trim();
  if (key.length > 40) return null;
  return HEADING_MAP.find(([re]) => re.test(key))?.[1] ?? null;
}

const BULLET = /^\s*[-•*▪●◦]\s+/;
const DATE_RANGE = /((?:[A-Za-z]{3,9}\.?\s+)?(?:19|20)\d{2}|\d{1,2}\/\d{4})\s*(?:-|–|—|to)\s*((?:[A-Za-z]{3,9}\.?\s+)?(?:19|20)\d{2}|\d{1,2}\/\d{4}|present|current|now)/i;

interface Block {
  head: string;
  dates: [string, string];
  bullets: string[];
}

/** Groups lines into entries: a non-bullet line starts an entry, bullets attach to it. */
function blocks(lines: string[]): Block[] {
  const out: Block[] = [];
  for (const line of lines) {
    if (BULLET.test(line) && out.length) {
      out[out.length - 1].bullets.push(line.replace(BULLET, ""));
      continue;
    }
    const m = line.match(DATE_RANGE);
    const head = clean(m ? line.replace(m[0], "").replace(/[|,–-]\s*$/, "") : line);
    const last = out[out.length - 1];
    // A second plain line straight after a heading line (e.g. the organisation) joins the head.
    if (last && !last.bullets.length && !BULLET.test(line) && last.head.split(" | ").length < 2 && !m) {
      last.head = `${last.head} | ${head}`;
      continue;
    }
    if (last && !last.bullets.length && m && !last.dates[0]) {
      last.dates = [m[1], m[2]];
      if (head) last.head = `${last.head} | ${head}`;
      continue;
    }
    out.push({ head, dates: m ? [m[1], m[2]] : ["", ""], bullets: [] });
  }
  return out;
}

function splitHead(head: string): [string, string] {
  const [a, ...rest] = head.split(/\s+\|\s+|\s+[–—]\s+|,\s+(?=[A-Z])|\s+at\s+/);
  return [clean(a), clean(rest.join(", "))];
}

function splitList(lines: string[]): string[] {
  return lines
    .flatMap((l) => l.replace(BULLET, "").replace(/^[A-Za-z ]{2,25}:\s*/, "").split(/,|;|·|\|/))
    .map((s) => clean(s))
    .filter((s) => s && s.length <= 60);
}

export function emptyImport(): ImportedData {
  return {
    contact: {},
    summary: "",
    education: [],
    experience: [],
    leadership: [],
    volunteering: [],
    projects: [],
    achievements: [],
    certifications: [],
    skills: { technical: [], tools: [], languages: [], soft: [] },
    hobbies: [],
  };
}

/** Best-effort structure from standard headings. Wording is copied exactly. */
export function parseByHeadings(text: string): ImportedData {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
  const data = emptyImport();
  const groups = new Map<ImportSection, string[]>();
  let current: ImportSection | null = null;
  const header: string[] = [];
  for (const line of lines) {
    const h = headingOf(line.trim());
    if (h) {
      current = h;
      if (!groups.has(h)) groups.set(h, []);
      continue;
    }
    if (current) groups.get(current)!.push(line.trim());
    else header.push(line.trim());
  }

  // Name = first header line that isn't contact info.
  data.contact.fullName = header.find((l) => !EMAIL.test(l) && !/\d{5,}/.test(l) && !/linkedin|github|http/i.test(l) && l.split(" ").length <= 5) ?? "";

  for (const [section, ls] of groups) {
    switch (section) {
      case "summary":
        data.summary = ls.map((l) => l.replace(BULLET, "")).join(" ");
        break;
      case "skills":
        data.skills.technical = splitList(ls);
        break;
      case "hobbies":
        data.hobbies = splitList(ls);
        break;
      case "education":
        data.education = blocks(ls).map((b) => {
          const [first, second] = splitHead(b.head);
          const score = b.head.match(/(?:cgpa|gpa)\s*[:\-]?\s*([\d.]+(?:\/\d+)?)|(\d{2,3}(?:\.\d+)?)\s*%/i);
          return { institution: second || first, degree: second ? first : "", major: "", score: score?.[1] ?? score?.[2] ?? "", location: "", start: b.dates[0], end: b.dates[1], highlights: b.bullets };
        });
        break;
      case "projects":
        data.projects = blocks(ls).map((b) => {
          const [name, role] = splitHead(b.head);
          return { name, role, tech: [], link: "", start: b.dates[0], end: b.dates[1], bullets: b.bullets };
        });
        break;
      case "achievements":
      case "certifications": {
        const items = blocks(ls).flatMap((b) => [b.head, ...b.bullets].filter(Boolean).map((t) => ({ t, date: b.dates[1] || b.dates[0] })));
        if (section === "achievements") data.achievements = items.map(({ t, date }) => ({ title: t, issuer: "", date, description: "" }));
        else data.certifications = items.map(({ t, date }) => ({ name: t, issuer: "", date, link: "" }));
        break;
      }
      default:
        data[section] = blocks(ls).map((b) => {
          const [title, organization] = splitHead(b.head);
          return { title, organization, location: "", start: b.dates[0], end: b.dates[1], bullets: b.bullets };
        });
    }
  }
  return data;
}
