import { readFile } from "node:fs/promises";
import mammoth from "mammoth";
import { describe, expect, it } from "vitest";
import { aiOutputSchemas } from "@/lib/ai/contracts";
import { pdfItemsToText, tidyText } from "@/lib/import/extract";
import { detectContact, importedToResume, normalizeDate, parseByHeadings, sectionCounts } from "@/lib/import/map";
import { resumeSchema } from "@/lib/resume/schema";
import { importSampleText } from "./fixtures/import-sample.mjs";

const text: string = importSampleText();

describe("normalizeDate", () => {
  it.each([
    ["Jan 2024", "2024-01"],
    ["September 2023", "2023-09"],
    ["Sept. 2023", "2023-09"],
    ["03/2022", "2022-03"],
    ["2021-7", "2021-07"],
    ["2020", "2020"],
    ["", ""],
    ["someday", ""],
  ])("%s → %s", (raw, out) => expect(normalizeDate(raw)).toBe(out));
});

describe("detectContact", () => {
  it("finds email, phone and links locally", () => {
    const c = detectContact(text);
    expect(c.email).toBe("arjun.testwala@example.com");
    expect(c.phone.replace(/\D/g, "")).toBe("919123456789");
    expect(c.linkedin).toContain("linkedin.com/in/arjun-testwala-example");
  });
});

describe("parseByHeadings (no AI)", () => {
  const data = parseByHeadings(text);

  it("splits sections by standard headings and keeps wording", () => {
    expect(data.contact.fullName).toBe("Arjun Testwala");
    expect(data.summary).toContain("robotics");
    expect(data.projects[0].name).toBe("Line-Following Robot");
    expect(data.projects[0].bullets).toEqual(["Built a line-following robot with an Arduino and two IR sensors", "Presented it at the school science fair"]);
    expect(data.experience[0]).toMatchObject({ title: "Volunteer Tutor", organization: "Sunrise Learning Centre", start: "Jun 2022", end: "May 2023" });
    expect(data.skills.technical).toEqual(["Arduino", "Python", "Public speaking"]);
    expect(data.hobbies).toEqual(["Chess", "Cycling"]);
  });

  it("produces output that passes the import schema", () => {
    expect(aiOutputSchemas.import.safeParse(data).success).toBe(true);
  });
});

describe("importedToResume", () => {
  const data = parseByHeadings(text);

  it("creates a valid resume with locally detected contact and normalised dates", () => {
    const r = importedToResume(data, text, { name: "Imported" });
    expect(resumeSchema.safeParse(r).success).toBe(true);
    expect(r.contact.email).toBe("arjun.testwala@example.com");
    expect(r.projects[0]).toMatchObject({ start: "2024-01", end: "2024-03", current: false });
    expect(r.education[0].current).toBe(true);
  });

  it("leaves out sections the user unticked", () => {
    const r = importedToResume(data, text, { include: ["projects"] });
    expect(r.projects).toHaveLength(1);
    expect(r.experience).toHaveLength(0);
    expect(r.skills.technical).toEqual([]);
  });

  it("accepts sparse AI output (mocked) and fills defaults", () => {
    const ai = aiOutputSchemas.import.parse({ contact: { fullName: "Asha Fakename" }, projects: [{ name: "Quiz app", bullets: ["• Built a quiz"], end: "Present" }] });
    const r = importedToResume(ai, "asha.fake@example.com");
    expect(r.projects[0]).toMatchObject({ name: "Quiz app", bullets: ["Built a quiz"], current: true });
    expect(sectionCounts(ai).projects).toBe(1);
  });
});

describe("extraction helpers", () => {
  it("joins pdf.js items into lines", () => {
    const out = pdfItemsToText([
      { str: "Arjun", transform: [0, 0, 0, 0, 0, 800] },
      { str: " Testwala", transform: [0, 0, 0, 0, 50, 800], hasEOL: true },
      { str: "PROJECTS", transform: [0, 0, 0, 0, 0, 780] },
      { str: "Robot", transform: [0, 0, 0, 0, 0, 760] },
    ]);
    expect(out).toBe("Arjun Testwala\nPROJECTS\nRobot");
  });

  it("tidies bullets and whitespace", () => {
    expect(tidyText("  Built a robot\n\n\n\nNext")).toBe("• Built a robot\n\nNext");
  });

  it("reads the .docx fixture", async () => {
    const buf = await readFile(new URL("./fixtures/sample-import.docx", import.meta.url));
    const { value } = await mammoth.extractRawText({ buffer: buf });
    const data = parseByHeadings(tidyText(value));
    expect(data.contact.fullName).toBe("Arjun Testwala");
    expect(data.projects[0].bullets.length + data.projects.length).toBeGreaterThan(1);
  });
});
