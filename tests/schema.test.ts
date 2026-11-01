import { describe, expect, it } from "vitest";
import {
  createEmptyResume,
  emptyItem,
  migrateResume,
  normalizeLayout,
  resumeSchema,
  SCHEMA_VERSION,
  SECTION_IDS,
} from "@/lib/resume/schema";
import { getSampleResume, SAMPLE_RESUME_INPUT } from "@/data/sample-resume";
import { sectionHasContent, visibleSections, isStandardHeading, headingFor } from "@/lib/resume/sections";

describe("resume schema", () => {
  it("accepts the fake sample resume", () => {
    const parsed = resumeSchema.safeParse(SAMPLE_RESUME_INPUT);
    expect(parsed.success).toBe(true);
  });

  it("fills defaults for an empty resume", () => {
    const r = createEmptyResume("Test");
    expect(r.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.layout.template).toBe("classic");
    expect(r.layout.sectionOrder).toEqual([...SECTION_IDS]);
    expect(r.skills).toEqual({ technical: [], tools: [], languages: [], soft: [] });
    expect(r.references.mode).toBe("hidden");
  });

  it("does not share default arrays between resumes", () => {
    const a = createEmptyResume("A");
    const b = createEmptyResume("B");
    a.hobbies.push("Chess");
    expect(b.hobbies).toEqual([]);
  });

  it("rejects invalid data", () => {
    const bad = { ...getSampleResume(), name: "" };
    expect(resumeSchema.safeParse(bad).success).toBe(false);
    const badDate = getSampleResume();
    badDate.education[0].start = "June 2024";
    expect(resumeSchema.safeParse(badDate).success).toBe(false);
    const badTemplate = { ...getSampleResume(), layout: { ...getSampleResume().layout, template: "fancy" } };
    expect(resumeSchema.safeParse(badTemplate).success).toBe(false);
    const badFont = { ...getSampleResume(), layout: { ...getSampleResume().layout, fontSizePt: 30 } };
    expect(resumeSchema.safeParse(badFont).success).toBe(false);
  });

  it("creates valid empty items for every list section", () => {
    for (const make of Object.values(emptyItem)) {
      const item = make() as { id: string };
      expect(item.id).toBeTruthy();
    }
  });
});

describe("migrations", () => {
  const v1 = {
    schemaVersion: 1,
    id: "old-1",
    name: "Old resume",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    contact: { fullName: "Test Student" },
    template: "modern",
    skills: ["Python", "Excel"],
    references: "Available on request",
    projects: [{ id: "p1", name: "Robot", bullets: "- Built a robot\n- Won a prize\n" }],
    education: [{ id: "e1", institution: "Test School", highlights: "Top of class" }],
  };

  it("migrates v1 to the current version", () => {
    const result = migrateResume(v1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(true);
    expect(result.resume.schemaVersion).toBe(SCHEMA_VERSION);
    expect(result.resume.skills.technical).toEqual(["Python", "Excel"]);
    expect(result.resume.projects[0].bullets).toEqual(["Built a robot", "Won a prize"]);
    expect(result.resume.education[0].highlights).toEqual(["Top of class"]);
    expect(result.resume.layout.template).toBe("modern");
    expect(result.resume.references.mode).toBe("on-request");
  });

  it("treats a missing version as v1", () => {
    const { schemaVersion: _unused, ...noVersion } = v1;
    void _unused;
    expect(migrateResume(noVersion).ok).toBe(true);
  });

  it("passes current resumes through unchanged", () => {
    const sample = getSampleResume();
    const result = migrateResume(sample);
    expect(result.ok && result.migrated).toBe(false);
    expect(result.ok && result.resume).toEqual(sample);
  });

  it("rejects resumes from a newer version and non-objects", () => {
    expect(migrateResume({ ...getSampleResume(), schemaVersion: 99 }).ok).toBe(false);
    expect(migrateResume(null).ok).toBe(false);
    expect(migrateResume("text").ok).toBe(false);
  });

  it("normalizes section order (dedupe + add missing)", () => {
    const r = getSampleResume();
    r.layout.sectionOrder = ["skills", "skills", "education"];
    const n = normalizeLayout(r);
    expect(n.layout.sectionOrder[0]).toBe("skills");
    expect(n.layout.sectionOrder[1]).toBe("education");
    expect(new Set(n.layout.sectionOrder).size).toBe(SECTION_IDS.length);
  });
});

describe("sections", () => {
  it("detects content and visibility", () => {
    const r = getSampleResume();
    expect(sectionHasContent(r, "publications")).toBe(false);
    expect(sectionHasContent(r, "references")).toBe(true);
    r.layout.hidden = ["hobbies"];
    const visible = visibleSections(r);
    expect(visible).not.toContain("hobbies");
    expect(visible).not.toContain("publications");
    expect(visible).toContain("education");
  });

  it("knows standard headings", () => {
    expect(isStandardHeading("experience", "Work Experience")).toBe(true);
    expect(isStandardHeading("experience", "My Cool Journey")).toBe(false);
    const r = getSampleResume();
    r.layout.headings.skills = "  ";
    expect(headingFor(r, "skills")).toBe("Skills");
  });
});
