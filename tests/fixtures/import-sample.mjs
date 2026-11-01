// FAKE resume used for import tests and the Phase 11 end-to-end check.
// Shared by tests and scripts/make-fixtures.mjs (which writes the .docx and .pdf).
export const IMPORT_SAMPLE = {
  name: "Arjun Testwala",
  contactLine: "arjun.testwala@example.com | +91 91234 56789 | Nagpur, India | linkedin.com/in/arjun-testwala-example",
  sections: [
    { heading: "SUMMARY", lines: ["Class 12 student who enjoys robotics and teaching younger students."] },
    {
      heading: "EDUCATION",
      lines: ["Class 12, Science", "Lakeview Public School | Jun 2023 - Present", "• Percentage: 91%"],
    },
    {
      heading: "PROJECTS",
      lines: [
        "Line-Following Robot | Jan 2024 - Mar 2024",
        "• Built a line-following robot with an Arduino and two IR sensors",
        "• Presented it at the school science fair",
      ],
    },
    {
      heading: "EXPERIENCE",
      lines: ["Volunteer Tutor | Sunrise Learning Centre | Jun 2022 - May 2023", "• Taught basic maths to Class 5 students on weekends"],
    },
    { heading: "SKILLS", lines: ["Arduino, Python, Public speaking"] },
    { heading: "HOBBIES", lines: ["Chess, Cycling"] },
  ],
};

export function importSampleText() {
  const out = [IMPORT_SAMPLE.name, IMPORT_SAMPLE.contactLine];
  for (const s of IMPORT_SAMPLE.sections) out.push("", s.heading, ...s.lines);
  return out.join("\n");
}
