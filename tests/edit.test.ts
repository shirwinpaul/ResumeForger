import { describe, expect, it } from "vitest";
import { listOf, moveInArray, sentencesToBullets, setItemField } from "@/lib/resume/edit";
import { getSampleResume } from "@/data/sample-resume";
import { SECTION_FIELDS, itemLabel } from "@/config/section-fields";
import { emptyItem, LIST_SECTIONS, resumeSchema } from "@/lib/resume/schema";

describe("editing helpers", () => {
  it("moves items within bounds only", () => {
    expect(moveInArray([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(moveInArray([1, 2, 3], 2, 0)).toEqual([3, 1, 2]);
    const same = [1, 2];
    expect(moveInArray(same, 0, 5)).toBe(same);
  });

  it("sets a field on the right item", () => {
    const r = getSampleResume();
    setItemField(r, "projects", "proj-2", "name", "Rain Charts");
    expect(r.projects[1].name).toBe("Rain Charts");
    expect(listOf(r, "projects")[0].name).toBe("Library Seat Finder");
  });

  it("splits plain answers into bullets without adding words", () => {
    const text =
      "Me and two friends made a website that shows free library seats. I did the database and the booking page. Lots of students used it! ok.";
    const bullets = sentencesToBullets(text);
    expect(bullets).toEqual([
      "Me and two friends made a website that shows free library seats",
      "I did the database and the booking page",
      "Lots of students used it",
    ]);
    const words = new Set(text.toLowerCase().match(/[a-z]+/g));
    for (const b of bullets) for (const w of b.toLowerCase().match(/[a-z]+/g)!) expect(words.has(w)).toBe(true);
    expect(sentencesToBullets("")).toEqual([]);
    expect(sentencesToBullets("a. b. c. d. e.")).toEqual([]);
  });
});

describe("section field config", () => {
  it("only references keys that exist on each item schema", () => {
    for (const section of LIST_SECTIONS) {
      const item = emptyItem[section]() as Record<string, unknown>;
      for (const f of SECTION_FIELDS[section]) expect(Object.keys(item)).toContain(f.key);
    }
  });

  it("labels items", () => {
    const r = getSampleResume();
    expect(itemLabel("education", r.education[0])).toBe("B.Tech — Greenfield Institute of Technology");
    expect(itemLabel("experience", r.experience[0])).toBe("Web Development Intern — Bluebird Learning Labs");
    expect(itemLabel("projects", { id: "x", name: " " })).toBe("New project");
    expect(resumeSchema.safeParse(r).success).toBe(true);
  });
});
