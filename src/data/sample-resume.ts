import { resumeSchema, SCHEMA_VERSION, type Resume } from "@/lib/resume/schema";

/**
 * FAKE sample student — every person, school, company and project here is
 * fictional. Used for "Try with sample data", template thumbnails and tests.
 */
export const SAMPLE_RESUME_INPUT = {
  schemaVersion: SCHEMA_VERSION,
  id: "sample-priya",
  name: "Sample – Priya Sharma",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  profile: { targetType: "Internship", country: "IN", title: "Computer Science Student" },
  contact: {
    fullName: "Priya Sharma",
    email: "priya.sharma@example.com",
    phone: "+91 90000 00000",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    linkedin: "linkedin.com/in/priya-sharma-example",
    github: "github.com/priya-example",
    portfolio: "",
    photo: "",
  },
  summary:
    "Computer science student who enjoys building practical web apps for her community. Comfortable with JavaScript, Python and teamwork in hackathons.",
  education: [
    {
      id: "edu-1",
      institution: "Greenfield Institute of Technology",
      board: "Sample State University",
      degree: "B.Tech",
      major: "Computer Science",
      scoreType: "CGPA",
      score: "8.7/10",
      location: "Pune",
      start: "2024-08",
      end: "",
      current: true,
      highlights: ["Coursework: Data Structures, Databases, Web Development"],
    },
    {
      id: "edu-2",
      institution: "Sunrise Public School",
      board: "CBSE",
      degree: "Class 12",
      major: "Science (PCM)",
      scoreType: "%",
      score: "92",
      location: "Pune",
      start: "2022-06",
      end: "2024-05",
      current: false,
      highlights: [],
    },
  ],
  experience: [
    {
      id: "exp-1",
      title: "Web Development Intern",
      organization: "Bluebird Learning Labs",
      type: "Internship",
      location: "Remote",
      start: "2025-05",
      end: "2025-07",
      current: false,
      bullets: [
        "Built a quiz page in React used by students during summer classes",
        "Fixed layout bugs on mobile screens and wrote short test cases",
      ],
    },
  ],
  projects: [
    {
      id: "proj-1",
      name: "Library Seat Finder",
      role: "Team lead",
      tech: ["JavaScript", "Firebase", "HTML/CSS"],
      link: "github.com/priya-example/seat-finder",
      start: "2025-01",
      end: "2025-03",
      current: false,
      bullets: [
        "Led a team of 3 to build a web app showing free library seats in real time",
        "Designed the database structure and the seat-booking screen",
      ],
    },
    {
      id: "proj-2",
      name: "Rainfall Visualiser",
      role: "",
      tech: ["Python", "Pandas", "Matplotlib"],
      link: "",
      start: "2024-10",
      end: "2024-11",
      current: false,
      bullets: ["Created charts of district rainfall data for a college data-science club talk"],
    },
  ],
  leadership: [
    {
      id: "lead-1",
      title: "Coding Club Coordinator",
      organization: "Greenfield Institute of Technology",
      type: "Other",
      location: "",
      start: "2025-08",
      end: "",
      current: true,
      bullets: ["Organise weekly coding sessions for first-year students"],
    },
  ],
  volunteering: [
    {
      id: "vol-1",
      title: "Volunteer Tutor",
      organization: "Open Books Community Centre",
      type: "Other",
      location: "Pune",
      start: "2023-06",
      end: "2024-03",
      current: false,
      bullets: ["Taught basic computer skills to school children on weekends"],
    },
  ],
  achievements: [
    {
      id: "ach-1",
      title: "Finalist, Smart City Hackathon",
      issuer: "Sample Tech Society",
      level: "state",
      date: "2025-02",
      description: "",
    },
  ],
  certifications: [
    {
      id: "cert-1",
      name: "Introduction to Databases",
      issuer: "Example Online Academy",
      date: "2024-12",
      link: "",
    },
  ],
  skills: {
    technical: ["JavaScript", "Python", "SQL", "React"],
    tools: ["Git", "Firebase", "VS Code"],
    languages: ["English", "Hindi", "Marathi"],
    soft: ["Teamwork", "Public speaking"],
  },
  activities: [
    {
      id: "act-1",
      name: "Debate Society",
      category: "Debate",
      position: "Member",
      organization: "Sunrise Public School",
      description: "",
      start: "2021-06",
      end: "2024-03",
      current: false,
      bullets: ["Took part in inter-school debates on technology and society"],
    },
  ],
  publications: [],
  hobbies: ["Chess", "Sketching"],
  references: { mode: "on-request", entries: [] },
  layout: {},
};

export function getSampleResume(): Resume {
  return resumeSchema.parse(structuredClone(SAMPLE_RESUME_INPUT));
}
