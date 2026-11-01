import type { Resume, SectionId } from "./schema";

/** Standard headings ATS systems recognise. */
export const DEFAULT_HEADINGS: Record<SectionId, string> = {
  summary: "Summary",
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  leadership: "Leadership",
  volunteering: "Volunteering",
  achievements: "Awards & Achievements",
  certifications: "Certifications",
  skills: "Skills",
  activities: "Activities",
  publications: "Publications",
  hobbies: "Interests",
  references: "References",
};

/**
 * Headings that ATS parsers commonly map to each section. A renamed heading
 * outside this list triggers a "non-standard heading" warning.
 */
export const STANDARD_HEADINGS: Record<SectionId, string[]> = {
  summary: ["summary", "profile", "professional summary", "objective", "career objective", "about me"],
  education: ["education", "academic background", "academics", "education and qualifications"],
  experience: ["experience", "work experience", "professional experience", "employment", "internships", "employment history"],
  projects: ["projects", "academic projects", "personal projects", "key projects"],
  leadership: ["leadership", "leadership experience", "positions of responsibility"],
  volunteering: ["volunteering", "volunteer experience", "community service", "volunteer work"],
  achievements: ["awards", "achievements", "awards & achievements", "awards and achievements", "honors", "honours", "honors and awards", "honours and awards"],
  certifications: ["certifications", "certificates", "licenses & certifications", "licenses and certifications", "courses"],
  skills: ["skills", "technical skills", "skills & interests", "key skills", "core skills"],
  activities: ["activities", "extracurricular activities", "extracurriculars", "co-curricular activities"],
  publications: ["publications", "research", "papers", "research & publications"],
  hobbies: ["interests", "hobbies", "hobbies & interests", "hobbies and interests"],
  references: ["references", "referees"],
};

export function isStandardHeading(section: SectionId, heading: string): boolean {
  const h = heading.trim().toLowerCase();
  return h === "" || STANDARD_HEADINGS[section].includes(h);
}

export function headingFor(resume: Resume, section: SectionId): string {
  return resume.layout.headings[section]?.trim() || DEFAULT_HEADINGS[section];
}

/** True when a section has content worth rendering. */
export function sectionHasContent(resume: Resume, section: SectionId): boolean {
  switch (section) {
    case "summary":
      return resume.summary.trim().length > 0;
    case "skills": {
      const s = resume.skills;
      return [s.technical, s.tools, s.languages, s.soft].some((l) => l.some((x) => x.trim()));
    }
    case "hobbies":
      return resume.hobbies.some((h) => h.trim());
    case "references":
      return (
        resume.references.mode === "on-request" ||
        (resume.references.mode === "list" && resume.references.entries.length > 0)
      );
    default:
      return resume[section].length > 0;
  }
}

/** Sections that will appear on the page, in order. */
export function visibleSections(resume: Resume): SectionId[] {
  return resume.layout.sectionOrder.filter(
    (s) => !resume.layout.hidden.includes(s) && sectionHasContent(resume, s),
  );
}
