import { describe, expect, it } from "vitest";
import { buildRenderDoc, formatDate, formatRange, suggestFileName, toHref } from "@/lib/resume/render-model";
import { nextFitStep, pageBreaksPx, pageCount, pageHeightPx, PX_PER_MM, resetSpacing } from "@/lib/resume/page-fit";
import { getSampleResume } from "@/data/sample-resume";
import { LAYOUT_LIMITS } from "@/config/limits";
import { TEMPLATE_IDS } from "@/config/templates";

describe("date formatting", () => {
  it("formats in each style", () => {
    expect(formatDate("2025-06", "MMM YYYY")).toBe("Jun 2025");
    expect(formatDate("2025-06", "MM/YYYY")).toBe("06/2025");
    expect(formatDate("2025-06", "YYYY")).toBe("2025");
    expect(formatDate("2025-06", "MMMM YYYY")).toBe("June 2025");
    expect(formatDate("2025", "MMM YYYY")).toBe("2025");
    expect(formatDate("", "MMM YYYY")).toBe("");
  });

  it("formats ranges", () => {
    expect(formatRange({ start: "2024-08", end: "", current: true }, "MMM YYYY")).toBe("Aug 2024 – Present");
    expect(formatRange({ start: "2024-08", end: "2025-01", current: false }, "MMM YYYY")).toBe("Aug 2024 – Jan 2025");
    expect(formatRange({ start: "2024", end: "2024", current: false }, "YYYY")).toBe("2024");
    expect(formatRange({ start: "", end: "2025-01", current: false }, "MMM YYYY")).toBe("Jan 2025");
  });
});

describe("render model", () => {
  it("builds sections in order, skipping hidden and empty ones", () => {
    const r = getSampleResume();
    r.layout.hidden = ["hobbies"];
    const doc = buildRenderDoc(r);
    const ids = doc.sections.map((s) => s.id);
    expect(ids[0]).toBe("summary");
    expect(ids).not.toContain("hobbies");
    expect(ids).not.toContain("publications");
    expect(doc.name).toBe("Priya Sharma");
  });

  it("formats education, skills and references", () => {
    const doc = buildRenderDoc(getSampleResume());
    const edu = doc.sections.find((s) => s.id === "education")!;
    expect(edu.entries[0].title).toBe("B.Tech, Computer Science");
    expect(edu.entries[0].date).toBe("Aug 2024 – Present");
    expect(edu.entries[0].meta).toContain("CGPA: 8.7/10");
    expect(edu.entries[1].meta).toContain("92%");
    const skills = doc.sections.find((s) => s.id === "skills")!;
    expect(skills.entries.map((e) => e.title)).toEqual(["Technical", "Tools", "Languages", "Soft skills"]);
    expect(skills.entries[0].text).toBe("JavaScript, Python, SQL, React");
    const refs = doc.sections.find((s) => s.id === "references")!;
    expect(refs.entries[0].text).toBe("Available on request");
  });

  it("uses custom headings", () => {
    const r = getSampleResume();
    r.layout.headings.experience = "Work Experience";
    expect(buildRenderDoc(r).sections.find((s) => s.id === "experience")!.heading).toBe("Work Experience");
  });

  it("renders contact info as text with clickable links", () => {
    const doc = buildRenderDoc(getSampleResume());
    const kinds = doc.contacts.map((c) => c.kind);
    expect(kinds).toEqual(["email", "phone", "location", "linkedin", "github"]);
    expect(doc.contacts[0].href).toBe("mailto:priya.sharma@example.com");
    expect(doc.contacts.find((c) => c.kind === "linkedin")!.href).toBe("https://linkedin.com/in/priya-sharma-example");
  });

  it("only uses photos and sidebars in the creative template", () => {
    const r = getSampleResume();
    r.contact.photo = "data:image/png;base64,AAAA";
    for (const t of TEMPLATE_IDS) {
      r.layout.template = t;
      const doc = buildRenderDoc(r);
      expect(Boolean(doc.photo)).toBe(t === "creative");
      expect(doc.sections.some((s) => s.column === "side")).toBe(t === "creative");
    }
  });

  it("suggests ATS-friendly file names", () => {
    const r = getSampleResume();
    expect(suggestFileName(r, "pdf")).toBe("Priya_Sharma_Resume.pdf");
    r.contact.fullName = "  josé  d'souza ";
    expect(suggestFileName(r, "docx")).toBe("Jose_D_Souza_Resume.docx");
    r.contact.fullName = "";
    expect(suggestFileName(r, "txt")).toBe("Resume.txt");
  });

  it("normalises links", () => {
    expect(toHref("github.com/x")).toBe("https://github.com/x");
    expect(toHref("http://a.org")).toBe("http://a.org");
    expect(toHref("not a link")).toBeUndefined();
  });
});

describe("page fit", () => {
  it("counts pages with a small tolerance", () => {
    const h = pageHeightPx("A4");
    expect(pageCount(h, "A4")).toBe(1);
    expect(pageCount(h + 1, "A4")).toBe(1);
    expect(pageCount(h + 10, "A4")).toBe(2);
    expect(pageCount(0, "A4")).toBe(1);
  });

  it("counts pages like the PDF, where every page repeats the margins", () => {
    const h = pageHeightPx("A4");
    const m = 18 * PX_PER_MM;
    // Full-height content with 18mm margins fits one page only if the body fits inside the margins.
    expect(pageCount(h, "A4", 18)).toBe(1);
    expect(pageCount(h + 10, "A4", 18)).toBe(2);
    expect(pageBreaksPx(2, "A4", 18)).toEqual([h - m]);
    expect(pageHeightPx("Letter")).toBeLessThan(h);
  });

  it("tightens step by step and always stays within safe limits", () => {
    let layout = getSampleResume().layout;
    let steps = 0;
    for (let next = nextFitStep(layout); next; next = nextFitStep(layout)) {
      layout = next;
      steps++;
      expect(layout.fontSizePt).toBeGreaterThanOrEqual(LAYOUT_LIMITS.fontSizePt.min);
      expect(layout.marginMm).toBeGreaterThanOrEqual(LAYOUT_LIMITS.marginMm.min);
      expect(layout.lineHeight).toBeGreaterThanOrEqual(LAYOUT_LIMITS.lineHeight.min);
      expect(layout.sectionGapPt).toBeGreaterThanOrEqual(LAYOUT_LIMITS.sectionGapPt.min);
      expect(steps).toBeLessThan(50);
    }
    expect(layout.fontSizePt).toBe(LAYOUT_LIMITS.fontSizePt.min);
    expect(layout.marginMm).toBe(LAYOUT_LIMITS.marginMm.min);
    expect(resetSpacing(layout).fontSizePt).toBe(LAYOUT_LIMITS.fontSizePt.default);
  });

  it("tightens spacing before shrinking the font", () => {
    const first = nextFitStep(getSampleResume().layout)!;
    expect(first.fontSizePt).toBe(LAYOUT_LIMITS.fontSizePt.default);
    expect(first.sectionGapPt).toBeLessThan(LAYOUT_LIMITS.sectionGapPt.default);
  });
});
