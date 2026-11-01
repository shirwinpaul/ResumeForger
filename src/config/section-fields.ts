import {
  ACHIEVEMENT_LEVELS,
  ACTIVITY_CATEGORIES,
  EXPERIENCE_TYPES,
  SCORE_TYPES,
  type ListSectionId,
} from "@/lib/resume/schema";

/** Field definitions that drive the generic item editor for each list section. */
export type FieldType = "text" | "textarea" | "month" | "select" | "tags" | "bullets" | "current" | "url";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: readonly string[];
  /** Takes half the row on wider screens. */
  half?: boolean;
  help?: string;
}

const dates: FieldDef[] = [
  { key: "start", label: "Start", type: "month", half: true },
  { key: "end", label: "End", type: "month", half: true },
  { key: "current", label: "I currently do this", type: "current" },
];

const roleFields = (titleLabel: string, titlePh: string, orgPh: string): FieldDef[] => [
  { key: "title", label: titleLabel, type: "text", placeholder: titlePh, half: true },
  { key: "organization", label: "Organisation", type: "text", placeholder: orgPh, half: true },
  { key: "location", label: "Location", type: "text", placeholder: "City or Remote", half: true },
  ...dates,
  { key: "bullets", label: "What you did", type: "bullets" },
];

export const SECTION_FIELDS: Record<ListSectionId, FieldDef[]> = {
  education: [
    { key: "institution", label: "School / college / university", type: "text", placeholder: "e.g. Sunrise Public School", half: true },
    { key: "board", label: "Board / university", type: "text", placeholder: "e.g. CBSE, ICSE, State Board", half: true },
    { key: "degree", label: "Class / degree", type: "text", placeholder: "e.g. Class 12, B.Sc", half: true },
    { key: "major", label: "Stream / major", type: "text", placeholder: "e.g. Science (PCM)", half: true },
    { key: "scoreType", label: "Score type", type: "select", options: SCORE_TYPES, half: true },
    { key: "score", label: "Score", type: "text", placeholder: "e.g. 92 or 8.7/10", half: true },
    { key: "location", label: "Location", type: "text", placeholder: "City", half: true },
    ...dates,
    { key: "highlights", label: "Highlights (optional)", type: "bullets", help: "Relevant coursework, honours, rank in class." },
  ],
  experience: [
    ...roleFields("Role", "e.g. Web Development Intern", "Company or organisation"),
    { key: "type", label: "Type", type: "select", options: EXPERIENCE_TYPES, half: true },
  ],
  projects: [
    { key: "name", label: "Project name", type: "text", placeholder: "e.g. Library Seat Finder", half: true },
    { key: "role", label: "Your role (optional)", type: "text", placeholder: "e.g. Team lead", half: true },
    { key: "tech", label: "Tools / technologies", type: "tags", placeholder: "Type and press Enter" },
    { key: "link", label: "Link (optional)", type: "url", placeholder: "github.com/you/project" },
    ...dates,
    { key: "bullets", label: "What you built and what happened", type: "bullets" },
  ],
  leadership: roleFields("Position", "e.g. Club President", "Club, school or organisation"),
  volunteering: roleFields("Role", "e.g. Volunteer Tutor", "NGO or community group"),
  achievements: [
    { key: "title", label: "Award / achievement", type: "text", placeholder: "e.g. Finalist, Science Olympiad", half: true },
    { key: "issuer", label: "Awarded by", type: "text", placeholder: "Organisation", half: true },
    { key: "level", label: "Level", type: "select", options: ACHIEVEMENT_LEVELS, half: true },
    { key: "date", label: "Date", type: "month", half: true },
    { key: "description", label: "Details (optional)", type: "textarea", placeholder: "Rank, number of participants (only if you know it)…" },
  ],
  certifications: [
    { key: "name", label: "Certificate", type: "text", placeholder: "e.g. Introduction to Databases", half: true },
    { key: "issuer", label: "Issued by", type: "text", placeholder: "Platform or organisation", half: true },
    { key: "date", label: "Date", type: "month", half: true },
    { key: "link", label: "Link (optional)", type: "url", half: true },
  ],
  activities: [
    { key: "name", label: "Activity", type: "text", placeholder: "e.g. Debate Society", half: true },
    { key: "category", label: "Category", type: "select", options: ACTIVITY_CATEGORIES, half: true },
    { key: "position", label: "Position / leadership", type: "text", placeholder: "e.g. Captain", half: true },
    { key: "organization", label: "Organisation", type: "text", placeholder: "School or club", half: true },
    ...dates,
    { key: "description", label: "Short description", type: "textarea", placeholder: "What you do and any impact" },
    { key: "bullets", label: "Bullets (optional)", type: "bullets" },
  ],
  publications: [
    { key: "title", label: "Title", type: "text", half: true },
    { key: "venue", label: "Journal / conference / website", type: "text", half: true },
    { key: "authors", label: "Authors", type: "text", placeholder: "e.g. P. Sharma, A. Rao", half: true },
    { key: "date", label: "Date", type: "month", half: true },
    { key: "link", label: "Link (optional)", type: "url" },
  ],
};

/** Short label for a collapsed item card. */
export function itemLabel(section: ListSectionId, item: Record<string, unknown>): string {
  const s = (k: string) => (typeof item[k] === "string" ? (item[k] as string).trim() : "");
  switch (section) {
    case "education":
      return [s("degree"), s("institution")].filter(Boolean).join(" — ") || "New education entry";
    case "projects":
      return s("name") || "New project";
    case "achievements":
      return s("title") || "New achievement";
    case "certifications":
      return s("name") || "New certification";
    case "activities":
      return s("name") || "New activity";
    case "publications":
      return s("title") || "New publication";
    default:
      return [s("title"), s("organization")].filter(Boolean).join(" — ") || "New entry";
  }
}

/** Friendly guided-builder prompts and clearly-labelled generic examples. */
export const GUIDED_PROMPTS: Partial<Record<ListSectionId | "skills" | "summary", { prompt: string; example: string }>> = {
  education: {
    prompt: "Where are you studying (or where did you study)? Add your most recent school or college first.",
    example: "Example: Class 12, Science (PCM) — Sunrise Public School, CBSE — 92% — 2022–2024",
  },
  projects: {
    prompt:
      "Tell me about a project you're proud of — what did you build, what tools did you use, and what happened because of it?",
    example:
      "Example: \"Me and two friends made a website that shows which library seats are free. I did the database and the booking page using Firebase. Lots of students in our hostel started using it.\"",
  },
  experience: {
    prompt: "Any internships, part-time jobs or freelance work? What did you do day to day, and what did you learn or improve?",
    example: "Example: \"I interned at a learning startup for 2 months, made a quiz page in React and fixed mobile layout bugs.\"",
  },
  leadership: {
    prompt: "Have you led anything — a club, team, event or class responsibility? What did you organise or change?",
    example: "Example: \"I coordinate our college coding club and run weekly sessions for first-years.\"",
  },
  volunteering: {
    prompt: "Have you volunteered or helped your community? Who did you help and how?",
    example: "Example: \"I taught basic computer skills to school kids at a community centre on weekends.\"",
  },
  achievements: {
    prompt: "Any awards, competitions, olympiads or ranks? Include the level (school, district, state, national, international).",
    example: "Example: Finalist, Smart City Hackathon — state level — 2025",
  },
  activities: {
    prompt: "What do you do outside class — clubs, sports, arts, music, debate? What's your role?",
    example: "Example: Debate Society member — took part in inter-school debates.",
  },
  skills: {
    prompt: "Which skills can you actually show? Add technical skills, tools, languages you speak and a few soft skills.",
    example: "Example: Technical — Python, HTML/CSS · Tools — Git, Canva · Languages — English, Tamil",
  },
  summary: {
    prompt: "In 2–3 lines, who are you and what are you looking for? You can also let AI draft it from what you've added.",
    example: "Example: \"Computer science student who enjoys building web apps for her community, looking for a summer internship.\"",
  },
};
