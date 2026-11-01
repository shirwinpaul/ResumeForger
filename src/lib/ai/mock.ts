/**
 * MOCK_AI mode: sample answers built from the request, no provider called and
 * no quota used. Development only — `isMockEnabled` is always false in production.
 *
 * One polish alternative deliberately invents a number ("by 40%") so the honesty
 * check can be seen flagging it.
 */
import { sentencesToBullets } from "@/lib/resume/edit";
import type { AiAction, AiOutput, ParsedInput } from "./contracts";

export function isMockEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && env.MOCK_AI === "true";
}

const VERBS = ["Led", "Built", "Organised", "Designed", "Improved", "Coordinated"];

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Drops a leading weak verb so the mock can put a strong one first. */
function body(bullet: string): string {
  return bullet
    .trim()
    .replace(/^(i\s+)?(was\s+)?(responsible for|helped( to)?|worked on|did|made)\s+/i, "")
    .replace(/[.]+$/, "");
}

/** First real content line (skipping ALL-CAPS headings and bullet markers), as a sentence. */
function firstDetail(content: string): string {
  const line = content
    .split("\n")
    .map((l) => l.replace(/^•\s*/, "").trim())
    .find((l) => l.length > 3 && l !== l.toUpperCase());
  return line ? ` ${line.replace(/[.\s]+$/, "").slice(0, 160)}.` : "";
}

type MockTable ={ [A in AiAction]: (input: ParsedInput<A>) => AiOutput<A> };

const MOCKS: MockTable = {
  bullets: (i) => {
    const bullets = sentencesToBullets(i.answer).slice(0, 4);
    return { bullets: bullets.length ? bullets : [capitalise(body(i.answer))] };
  },
  polish: (i) => {
    const b = body(i.bullet);
    return {
      alternatives: [
        capitalise(b),
        `${capitalise(b)}, improving results by 40%`,
        `${capitalise(b)} for [number of people]`,
      ],
    };
  },
  summary: (i) => ({
    summary: `${i.targetType === "University application" ? "Curious student" : "Motivated early-career candidate"} with hands-on experience drawn from the projects and roles below.${firstDetail(i.content)}`,
  }),
  skills: (i) => ({
    skills: i.items.slice(0, 3).map((it) => ({
      name: it.label.split(/\s+/)[0] || "Teamwork",
      category: "technical" as const,
      sourceId: it.id,
      evidence: it.text.slice(0, 80),
    })),
  }),
  tailor: (i) => {
    const words = Array.from(new Set(i.description.match(/\b[A-Z][a-zA-Z+#.]{2,}\b/g) ?? [])).slice(0, 8);
    const resumeText = [i.summary, ...i.skills, ...i.bullets.map((b) => b.text)].join(" ").toLowerCase();
    return {
      keywords: words.map((keyword) => ({ keyword, present: resumeText.includes(keyword.toLowerCase()) })),
      reorder: [{ suggestion: `Move ${i.targetKind === "job" ? "Projects" : "Education"} higher so the most relevant work is seen first.` }],
      rewrites: i.bullets.slice(0, 2).map((b) => ({ ref: b.ref, rewritten: `${VERBS[3]} ${body(b.text)}`, why: "Leads with a stronger verb." })),
      matchSummary: "Sample (mock) analysis: your resume covers part of what this description asks for. Review the missing keywords and add them only if they are true for you.",
    };
  },
  activity: (i) => ({
    activities: i.activities.map((a) => ({
      id: a.id,
      position: a.position || "Member",
      organization: a.organization || a.name,
      description: (a.details || a.name).replace(/\s+/g, " ").slice(0, 300),
    })),
  }),
  grammar: (i) => ({
    fixes: i.lines
      .filter((l) => /^[a-z]/.test(l.text) || /\s{2,}/.test(l.text))
      .slice(0, 10)
      .map((l) => ({ ref: l.ref, fixed: capitalise(l.text.replace(/\s{2,}/g, " ")), kind: "capitalisation" as const, note: "Start with a capital letter." })),
  }),
  import: (i) => {
    const lines = i.text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    return {
      contact: { fullName: lines[0] ?? "" },
      summary: "",
      education: [],
      experience: [{ title: "Imported role (mock)", organization: "", location: "", start: "", end: "", bullets: lines.slice(1, 4) }],
      leadership: [],
      volunteering: [],
      projects: [],
      achievements: [],
      certifications: [],
      skills: { technical: [], tools: [], languages: [], soft: [] },
      hobbies: [],
    };
  },
  trim: (i) => {
    const words = i.bullet.split(/\s+/);
    let out = "";
    for (const w of words) {
      if ((out + " " + w).trim().length > i.maxChars) break;
      out = (out + " " + w).trim();
    }
    return { shorter: out || i.bullet.slice(0, i.maxChars) };
  },
};

export function mockResponse<A extends AiAction>(action: A, input: ParsedInput<A>): AiOutput<A> {
  return (MOCKS[action] as (i: ParsedInput<A>) => AiOutput<A>)(input);
}
