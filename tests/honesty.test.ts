import { describe, expect, it } from "vitest";
import { findNewDetails, highlightSegments } from "@/lib/checks/honesty";
import { collectPlaceholders, findPlaceholders } from "@/lib/checks/placeholders";
import { getSampleResume } from "@/data/sample-resume";

const kinds = (orig: string | string[], out: string) => findNewDetails(orig, out).map((d) => `${d.kind}:${d.text}`);

describe("honesty check — new details", () => {
  it("flags an invented number", () => {
    expect(kinds("Taught kids basic computer skills", "Taught 50 kids basic computer skills")).toEqual(["number:50"]);
  });

  it("flags invented percentages and currency", () => {
    expect(kinds("Improved page speed", "Improved page speed by 40%")).toEqual(["percent:40%"]);
    expect(kinds("Raised money for the library", "Raised ₹25,000 for the library")).toEqual(["currency:₹25,000"]);
    expect(kinds("Raised money", "Raised Rs. 5000 in donations")).toEqual(["currency:Rs. 5000"]);
    expect(kinds("Sold crafts", "Sold crafts worth $300")).toEqual(["currency:$300"]);
  });

  it("flags invented dates", () => {
    expect(kinds("Organised a coding camp", "Organised a coding camp in June 2024")).toEqual(["date:June 2024"]);
    expect(kinds("Organised a coding camp", "Organised a coding camp in 2023")).toEqual(["date:2023"]);
  });

  it("flags invented proper nouns, tools and acronyms", () => {
    expect(kinds("Built a website for my school", "Built a website for my school using React and AWS")).toEqual([
      "proper-noun:React",
      "proper-noun:AWS",
    ]);
    expect(kinds("Interned at a startup", "Interned at Google")).toEqual(["proper-noun:Google"]);
  });

  it("does not flag details present in the original (case/format-insensitive)", () => {
    expect(kinds("led a team of 3 using python", "Led a team of three using Python")).toEqual([]);
    expect(kinds("Grew club to 1,200 members", "Expanded the club to 1200 members")).toEqual([]);
    expect(kinds("Won 2nd place at the Smart City Hackathon 2025", "Secured 2nd place at the Smart City Hackathon (2025)")).toEqual([]);
  });

  it("has no false positives on unchanged content", () => {
    const sample = getSampleResume();
    const bullets = [...sample.projects.flatMap((p) => p.bullets), ...sample.experience.flatMap((e) => e.bullets)];
    for (const b of bullets) expect(findNewDetails(b, b)).toEqual([]);
    expect(findNewDetails(sample.summary, sample.summary)).toEqual([]);
  });

  it("does not flag new action verbs at the start of a bullet", () => {
    expect(kinds("Made a quiz page", "Developed a quiz page")).toEqual([]);
    expect(kinds("Made a quiz page", "Spearheaded creation of a quiz page")).toEqual([]);
    expect(kinds("did charts for a talk", "Visualised data in charts for a talk")).toEqual([]);
  });

  it("never flags [placeholders]", () => {
    expect(kinds("Taught kids", "Taught [number of students] kids over [duration]")).toEqual([]);
  });

  it("accepts multiple sources (e.g. bullet + project tech list)", () => {
    expect(kinds(["Built the booking screen", "Firebase, JavaScript"], "Built the booking screen with Firebase")).toEqual([]);
  });

  it("produces highlight segments", () => {
    const out = "Taught 50 kids in Pune";
    const segs = highlightSegments(out, findNewDetails("Taught kids", out));
    expect(segs.filter((s) => s.flagged).map((s) => s.text)).toEqual(["50", "Pune"]);
    expect(segs.map((s) => s.text).join("")).toBe(out);
  });
});

describe("placeholders", () => {
  it("finds bracket placeholders", () => {
    expect(findPlaceholders("Taught [number of students] students for [months] months")).toEqual(["[number of students]", "[months]"]);
    expect(findPlaceholders("No placeholders here")).toEqual([]);
  });

  it("collects placeholders across the resume with locations", () => {
    const r = getSampleResume();
    r.projects[0].bullets.push("Served [number of users] users");
    r.summary = "Student with [X] years of coding";
    const found = collectPlaceholders(r);
    expect(found.map((f) => f.placeholder)).toEqual(["[X]", "[number of users]"]);
    expect(found[1].where).toBe("Projects › Library Seat Finder");
  });

  it("ignores hidden sections", () => {
    const r = getSampleResume();
    r.projects[0].bullets.push("Served [number of users] users");
    r.layout.hidden = ["projects"];
    expect(collectPlaceholders(r)).toEqual([]);
  });
});
