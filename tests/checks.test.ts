import { describe, expect, it } from "vitest";
import { runAtsCheck } from "@/lib/checks/ats";
import { removePronouns, removeWeakPhrase, runQualityChecks } from "@/lib/checks/quality";
import { countryAdvice } from "@/lib/checks/country";
import { getSampleResume } from "@/data/sample-resume";
import { createEmptyResume } from "@/lib/resume/schema";

const status = (r: ReturnType<typeof runAtsCheck>, id: string) => r.items.find((i) => i.id === id)!.status;

describe("ATS check", () => {
  it("scores the sample resume highly", () => {
    const r = runAtsCheck(getSampleResume(), 1);
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.fileName).toBe("Priya_Sharma_Resume.pdf");
    expect(r.items.every((i) => i.points <= i.weight)).toBe(true);
  });

  it("scores an empty resume low", () => {
    const r = runAtsCheck(createEmptyResume());
    expect(r.score).toBeLessThan(50);
    expect(status(r, "contact")).toBe("fail");
    expect(status(r, "length")).toBe("fail");
  });

  it("penalises the creative (two-column) template", () => {
    const res = getSampleResume();
    const before = runAtsCheck(res, 1).score;
    res.layout.template = "creative";
    const after = runAtsCheck(res, 1);
    expect(status(after, "template")).toBe("fail");
    expect(after.score).toBe(before - 15);
  });

  it("flags non-standard headings", () => {
    const res = getSampleResume();
    res.layout.headings.experience = "My Journey";
    expect(status(runAtsCheck(res), "headings")).toBe("warn");
    res.layout.headings.skills = "Superpowers";
    const r = runAtsCheck(res);
    expect(status(r, "headings")).toBe("fail");
    expect(r.items.find((i) => i.id === "headings")!.detail).toContain("“Superpowers” → “Skills”");
  });

  it("checks contact fields, links and small fonts", () => {
    const res = getSampleResume();
    res.contact.phone = "";
    expect(status(runAtsCheck(res), "contact")).toBe("warn");
    res.contact.email = "not-an-email";
    expect(status(runAtsCheck(res), "links")).toBe("warn");
    res.contact.linkedin = "my linkedin";
    expect(status(runAtsCheck(res), "links")).toBe("fail");
    res.layout.fontSizePt = 9;
    expect(status(runAtsCheck(res), "font")).toBe("warn");
  });

  it("checks dates and length", () => {
    const res = getSampleResume();
    res.projects[1].start = "2024";
    expect(status(runAtsCheck(res), "dates")).toBe("warn");
    expect(status(runAtsCheck(getSampleResume(), 2), "length")).toBe("warn");
  });

  it("flags blank entries", () => {
    const res = getSampleResume();
    res.projects.push({ ...res.projects[0], id: "blank", name: "" });
    expect(status(runAtsCheck(res), "empty")).toBe("warn");
  });
});

describe("content quality", () => {
  function withBullets(bullets: string[]) {
    const r = getSampleResume();
    r.projects = [{ ...r.projects[0], bullets }];
    r.experience = [];
    r.leadership = [];
    r.volunteering = [];
    r.activities = [];
    r.education = [];
    return r;
  }
  const types = (bullets: string[]) => runQualityChecks(withBullets(bullets)).map((i) => i.type);

  it("detects weak phrases with a quick fix", () => {
    const issues = runQualityChecks(withBullets(["Responsible for managing the club website"]));
    expect(issues[0].type).toBe("weak-phrase");
    expect(issues[0].fix?.replacement).toBe("Managing the club website");
    expect(removeWeakPhrase("Helped with organising events")).toBe("Organising events");
    expect(removeWeakPhrase("Organised events")).toBeNull();
  });

  it("detects first-person pronouns with a quick fix", () => {
    expect(types(["I built my first app"])).toContain("pronoun");
    expect(removePronouns("I built my first app")).toBe("Built first app");
    expect(types(["Built an Identity page"])).not.toContain("pronoun");
  });

  it("detects long bullets", () => {
    expect(types(["Built " + "a very long sentence ".repeat(12)])).toContain("long-bullet");
    expect(types(["Built a short thing"])).not.toContain("long-bullet");
  });

  it("detects repeated verbs (3+ overall or twice in one item) and suggests alternatives", () => {
    const issues = runQualityChecks(withBullets(["Built a site", "Built an app"]));
    const verb = issues.filter((i) => i.type === "repeated-verb");
    expect(verb).toHaveLength(1);
    expect(verb[0].fix?.replacement).toBe("Developed an app");
    expect(types(["Built a site", "Designed an app"])).not.toContain("repeated-verb");
  });

  it("detects missing dates", () => {
    const r = withBullets(["Built a site"]);
    r.projects[0].start = "";
    r.projects[0].end = "";
    expect(runQualityChecks(r).map((i) => i.type)).toContain("missing-dates");
  });

  it("finds nothing on clean bullets", () => {
    expect(types(["Designed the database structure", "Led a team of 3"])).toEqual([]);
  });
});

describe("country tips", () => {
  it("warns about photos where they're discouraged", () => {
    const r = getSampleResume();
    r.profile.country = "US";
    r.contact.photo = "data:image/png;base64,AAAA";
    r.layout.template = "creative";
    const advice = countryAdvice(r, 1);
    expect(advice.warnings.join(" ")).toMatch(/Photos are usually left out/);
    expect(advice.warnings.join(" ")).toMatch(/US Letter/);
    expect(advice.label).toMatch(/General guidance/);
  });

  it("asks Indian students for board and percentage", () => {
    const r = getSampleResume();
    r.education[1].board = "";
    r.education[0].score = "";
    const w = countryAdvice(r).warnings.join(" ");
    expect(w).toMatch(/board/);
    expect(w).toMatch(/percentage or CGPA/);
  });

  it("has no warnings for the sample in India", () => {
    expect(countryAdvice(getSampleResume(), 1).warnings).toEqual([]);
  });
});
