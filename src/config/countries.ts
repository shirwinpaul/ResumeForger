/** General resume guidance by country. Shown as tips, never enforced. */
export interface CountryTips {
  code: string;
  name: string;
  /** Whether a photo is normally expected, optional or discouraged. */
  photo: "discouraged" | "optional" | "common";
  dateOfBirth: "never" | "optional";
  /** Recommended max pages for a student resume. */
  studentPages: number;
  /** Preferred paper size. */
  paper: "A4" | "Letter";
  /** "Resume" or "CV" — what people locally call the document. */
  docName: "Resume" | "CV";
  tips: string[];
}

export const COUNTRIES: CountryTips[] = [
  {
    code: "US",
    name: "United States",
    photo: "discouraged",
    dateOfBirth: "never",
    studentPages: 1,
    paper: "Letter",
    docName: "Resume",
    tips: [
      "Don't include a photo, date of birth, gender or marital status.",
      "Keep it to 1 page as a student.",
      "Use US Letter paper size.",
      "GPA is common if it's 3.0/4.0 or higher.",
    ],
  },
  {
    code: "UK",
    name: "United Kingdom",
    photo: "discouraged",
    dateOfBirth: "never",
    studentPages: 1,
    paper: "A4",
    docName: "CV",
    tips: [
      "No photo or date of birth.",
      "1 page for school students; 2 pages is fine for graduates.",
      "Include predicted or achieved grades (e.g. A-levels, degree classification).",
    ],
  },
  {
    code: "CA",
    name: "Canada",
    photo: "discouraged",
    dateOfBirth: "never",
    studentPages: 1,
    paper: "Letter",
    docName: "Resume",
    tips: [
      "No photo, date of birth or personal details.",
      "Keep it to 1 page as a student.",
      "Volunteer experience is valued — list it.",
    ],
  },
  {
    code: "IN",
    name: "India",
    photo: "optional",
    dateOfBirth: "optional",
    studentPages: 1,
    paper: "A4",
    docName: "Resume",
    tips: [
      "A photo is optional — skip it when applying abroad or to multinational companies.",
      "Include your board (CBSE / ICSE / State Board) and percentage or CGPA.",
      "List Class 10 and Class 12 results for school and early-college applications.",
    ],
  },
  {
    code: "DE",
    name: "Germany",
    photo: "optional",
    dateOfBirth: "optional",
    studentPages: 2,
    paper: "A4",
    docName: "CV",
    tips: [
      "A professional photo is still common but no longer required.",
      "A tabular CV (Lebenslauf) in reverse chronological order is standard.",
      "Gaps in the timeline are often questioned — keep dates complete.",
    ],
  },
  {
    code: "AU",
    name: "Australia",
    photo: "discouraged",
    dateOfBirth: "never",
    studentPages: 2,
    paper: "A4",
    docName: "Resume",
    tips: [
      "No photo or date of birth.",
      "1–2 pages is normal for students.",
      "Referees are often listed or 'available on request'.",
    ],
  },
  {
    code: "OTHER",
    name: "Other / not sure",
    photo: "discouraged",
    dateOfBirth: "never",
    studentPages: 1,
    paper: "A4",
    docName: "Resume",
    tips: [
      "When in doubt, leave out the photo and personal details.",
      "Keep it to 1 page as a student.",
    ],
  },
];

export const COUNTRY_GUIDANCE_LABEL =
  "General guidance only — check what your target employer or university expects.";

export function getCountry(code: string): CountryTips {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[COUNTRIES.length - 1];
}
