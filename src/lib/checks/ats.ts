/**
 * ATS check (no AI): scores how safely an applicant tracking system can read
 * the resume, out of 100, with a checklist explaining every point.
 */
import { RESUME_FONTS, TEMPLATES } from "@/config/templates";
import { getCountry } from "@/config/countries";
import { LIST_SECTIONS, type Resume } from "@/lib/resume/schema";
import { DEFAULT_HEADINGS, headingFor, isStandardHeading, visibleSections } from "@/lib/resume/sections";
import { suggestFileName } from "@/lib/resume/render-model";

export type CheckStatus = "pass" | "warn" | "fail";

export interface AtsItem {
  id: string;
  label: string;
  status: CheckStatus;
  /** Points earned out of `weight`. */
  points: number;
  weight: number;
  detail: string;
}

export interface AtsResult {
  score: number;
  items: AtsItem[];
  fileName: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

function item(id: string, label: string, weight: number, status: CheckStatus, detail: string): AtsItem {
  const points = status === "pass" ? weight : status === "warn" ? Math.round(weight / 2) : 0;
  return { id, label, weight, status, points, detail };
}

export function wordCount(resume: Resume): number {
  const texts: string[] = [resume.summary];
  for (const s of LIST_SECTIONS) {
    for (const it of resume[s] as unknown as Record<string, unknown>[]) {
      for (const v of Object.values(it)) {
        if (typeof v === "string") texts.push(v);
        else if (Array.isArray(v)) texts.push(...v.filter((x): x is string => typeof x === "string"));
      }
    }
  }
  const sk = resume.skills;
  texts.push(...sk.technical, ...sk.tools, ...sk.languages, ...sk.soft, ...resume.hobbies);
  return texts.join(" ").split(/\s+/).filter(Boolean).length;
}

/**
 * @param pages measured page count from the live preview, when available
 */
export function runAtsCheck(resume: Resume, pages?: number): AtsResult {
  const items: AtsItem[] = [];
  const c = resume.contact;
  const visible = visibleSections(resume);

  // 1. Standard headings (15)
  const nonStandard = visible.filter((s) => !isStandardHeading(s, resume.layout.headings[s] ?? ""));
  items.push(
    item(
      "headings",
      "Standard section headings",
      15,
      visible.length === 0 ? "fail" : nonStandard.length === 0 ? "pass" : nonStandard.length === 1 ? "warn" : "fail",
      visible.length === 0
        ? "No sections with content yet."
        : nonStandard.length === 0
        ? "All headings are ones ATS systems recognise."
        : `Rename: ${nonStandard.map((s) => `“${headingFor(resume, s)}” → “${DEFAULT_HEADINGS[s]}”`).join(", ")}.`,
    ),
  );

  // 2. Contact info as body text (15)
  const missing = [!c.fullName.trim() && "name", !c.email.trim() && "email", !c.phone.trim() && "phone"].filter(Boolean);
  items.push(
    item(
      "contact",
      "Contact info in the body text",
      15,
      missing.length === 0 ? "pass" : missing.length === 1 ? "warn" : "fail",
      missing.length === 0 ? "Name, email and phone are plain text at the top." : `Add your ${missing.join(", ")}.`,
    ),
  );

  // 3. ATS-safe template — no images/tables/columns (15)
  const tpl = TEMPLATES[resume.layout.template];
  items.push(
    item(
      "template",
      "No images, tables or columns",
      15,
      tpl.atsFriendly ? "pass" : "fail",
      tpl.atsFriendly
        ? `${tpl.name} is a single-column, text-only layout.`
        : `${tpl.name} uses two columns${c.photo ? " and a photo" : ""}. Switch to Classic ATS or Modern Clean for online applications.`,
    ),
  );

  // 4. Readable font (10)
  const fontOk = RESUME_FONTS.some((f) => f.id === resume.layout.font);
  const size = resume.layout.fontSizePt;
  items.push(
    item(
      "font",
      "Readable font and size",
      10,
      fontOk && size >= 10 ? "pass" : fontOk && size >= 9 ? "warn" : "fail",
      size >= 10 ? `Standard font at ${size}pt.` : `${size}pt is small — 10pt or larger reads best.`,
    ),
  );

  // 5. Reasonable length (10)
  const words = wordCount(resume);
  const target = getCountry(resume.profile.country).studentPages;
  let lengthStatus: CheckStatus;
  let lengthDetail: string;
  if (words < 120) {
    lengthStatus = "fail";
    lengthDetail = `Only about ${words} words — add more about your projects and activities.`;
  } else if (pages !== undefined && pages > target) {
    lengthStatus = "warn";
    lengthDetail = `${pages} pages — aim for ${target} as a student. Try “Fit to one page”.`;
  } else if (words > 900) {
    lengthStatus = "warn";
    lengthDetail = `About ${words} words — consider trimming older or less relevant items.`;
  } else {
    lengthStatus = "pass";
    lengthDetail = `About ${words} words${pages ? `, ${pages} page${pages > 1 ? "s" : ""}` : ""}.`;
  }
  items.push(item("length", "Reasonable length", 10, lengthStatus, lengthDetail));

  // 6. Consistent, complete dates (10)
  const dated = [
    ...resume.education,
    ...resume.experience,
    ...resume.projects,
    ...resume.leadership,
    ...resume.volunteering,
    ...resume.activities,
  ];
  const starts = dated.map((d) => d.start).filter(Boolean);
  const precisions = new Set(starts.map((s) => (s.length === 4 ? "year" : "month")));
  const undated = dated.filter((d) => !d.start && !d.end && !d.current).length;
  items.push(
    item(
      "dates",
      "Consistent, complete dates",
      10,
      dated.length === 0 ? "warn" : precisions.size <= 1 && undated === 0 ? "pass" : undated > 2 ? "fail" : "warn",
      dated.length === 0
        ? "Add education, projects or experience with dates."
        : precisions.size > 1
        ? "Some dates have months and some only years — use the same style everywhere."
        : undated > 0
          ? `${undated} item${undated > 1 ? "s have" : " has"} no dates.`
          : "All items have dates in one format.",
    ),
  );

  // 7. No empty sections / entries (10)
  const emptyEntries: string[] = [];
  for (const s of LIST_SECTIONS) {
    if (resume.layout.hidden.includes(s)) continue;
    for (const it of resume[s] as unknown as Record<string, unknown>[]) {
      const main = ["title", "name", "institution"].map((k) => (typeof it[k] === "string" ? (it[k] as string).trim() : "")).find(Boolean);
      if (!main) emptyEntries.push(DEFAULT_HEADINGS[s]);
    }
  }
  items.push(
    item(
      "empty",
      "No empty sections or entries",
      10,
      emptyEntries.length === 0 ? "pass" : "warn",
      emptyEntries.length === 0 ? "Every entry has a title." : `Fill in or delete the blank entry in: ${[...new Set(emptyEntries)].join(", ")}.`,
    ),
  );

  // 8. Valid-looking links (10)
  const bad: string[] = [];
  if (c.email.trim() && !EMAIL_RE.test(c.email.trim())) bad.push("email");
  if (c.phone.trim() && !PHONE_RE.test(c.phone.trim())) bad.push("phone");
  for (const [k, v] of [["LinkedIn", c.linkedin], ["GitHub", c.github], ["portfolio", c.portfolio]] as const) {
    if (v.trim() && !URL_RE.test(v.trim())) bad.push(k);
  }
  for (const p of resume.projects) if (p.link.trim() && !URL_RE.test(p.link.trim())) bad.push(`project “${p.name || "untitled"}” link`);
  for (const ce of resume.certifications) if (ce.link.trim() && !URL_RE.test(ce.link.trim())) bad.push(`certificate “${ce.name || "untitled"}” link`);
  const nothingToCheck = !c.email.trim() && !c.phone.trim();
  items.push(
    item(
      "links",
      "Valid-looking email, phone and links",
      10,
      nothingToCheck ? "warn" : bad.length === 0 ? "pass" : bad.length === 1 ? "warn" : "fail",
      nothingToCheck ? "Add an email and phone number." : bad.length === 0 ? "Email, phone and links look valid." : `Check: ${bad.join(", ")}.`,
    ),
  );

  // 9. Core sections present (5)
  const hasEdu = visible.includes("education");
  const hasExp = visible.some((s) => s === "experience" || s === "projects");
  items.push(
    item(
      "core",
      "Education plus experience or projects",
      5,
      hasEdu && hasExp ? "pass" : hasEdu || hasExp ? "warn" : "fail",
      hasEdu && hasExp ? "Core sections are present." : `Add ${!hasEdu ? "education" : "a project or experience"}.`,
    ),
  );

  // 10. File name (always a tip, counts as pass)
  const fileName = suggestFileName(resume, "pdf");
  items.push(item("filename", "Clear file name", 0, "pass", `Save it as ${fileName}.`));

  const total = items.reduce((s, i) => s + i.weight, 0);
  const earned = items.reduce((s, i) => s + i.points, 0);
  return { score: Math.round((earned / total) * 100), items, fileName };
}
