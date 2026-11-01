// Automated accessibility audit (axe-core, WCAG 2 A/AA) of the main screens in light and dark mode.
// Usage: BASE_URL=http://localhost:3005 node scripts/check-a11y.mjs
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const axeSource = await readFile(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const browser = await chromium.launch({ channel: "msedge", headless: true });
let total = 0;

async function audit(page, label) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () =>
    // The resume paper is a fixed white document (always light) and mirrors the user's own colour choice.
    window.axe.run({ exclude: [[".resume-paper"], ["nextjs-portal"]] }, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }),
  );
  for (const v of result.violations) {
    total += v.nodes.length;
    console.log(`✗ [${label}] ${v.id} (${v.impact}): ${v.help}`);
    for (const n of v.nodes.slice(0, 4)) console.log(`    ${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`);
  }
  if (!result.violations.length) console.log(`✓ [${label}] no violations`);
}

for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, reducedMotion: "reduce" });
  await context.addInitScript((t) => localStorage.setItem("resumeforge:settings", JSON.stringify({ theme: t, aiNoticeAccepted: true })), theme);
  const page = await context.newPage();
  for (const url of ["/", "/start", "/import"]) {
    await page.goto(`${BASE}${url}`);
    await audit(page, `${theme} ${url}`);
  }
  await page.goto(`${BASE}/start`);
  await page.getByRole("button", { name: /Try with sample data/ }).click();
  await page.waitForURL(/\/editor/);
  await page.getByRole("button", { name: /^Projects/ }).click();
  await page.getByRole("button", { name: /Library Seat Finder/ }).first().click();
  await page.getByRole("button", { name: "Polish bullet 1" }).first().click();
  await page.getByText(/Pick one/).waitFor();
  await audit(page, `${theme} editor+polish`);
  for (const tab of ["Design", "Checks", "Sections"]) {
    await page.getByRole("tab", { name: new RegExp(tab) }).click();
    await page.waitForTimeout(300);
    await audit(page, `${theme} ${tab}`);
  }
  await page.getByRole("tab", { name: /Tailor/ }).click();
  await page.getByLabel("Job description").fill("We are hiring a Software Intern who knows Python, SQL and React for our data team.");
  await page.getByRole("button", { name: "Analyse match" }).click();
  await page.getByText("Consider adding if true").waitFor();
  await audit(page, `${theme} tailor`);
  await page.getByRole("button", { name: "⬇️ Export" }).click();
  await audit(page, `${theme} export dialog`);
  await page.goto(`${BASE}/builder`);
  await audit(page, `${theme} builder`);
  await context.close();
}
await browser.close();
console.log(total ? `${total} issue(s) found.` : "No accessibility violations.");
if (total) process.exitCode = 1;
