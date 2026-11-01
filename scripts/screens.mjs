// Screenshot tour (light/dark, desktop/360px) + horizontal-overflow check.
// Run against a dev server with MOCK_AI=true.
// Usage: BASE_URL=http://localhost:3005 OUT=<dir> node scripts/screens.mjs
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "screens";
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const problems = [];

async function tour({ theme, width, height }) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript((t) => {
    try {
      const key = "resumeforge:settings";
      const s = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(key, JSON.stringify({ ...s, theme: t, aiNoticeAccepted: true }));
    } catch {}
  }, theme);
  const page = await context.newPage();
  page.on("pageerror", (e) => problems.push(`${theme}/${width} pageerror: ${e.message}`));
  const tag = `${theme}-${width}`;
  const shot = async (name, full = false) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) problems.push(`${tag} ${name}: horizontal overflow ${overflow}px`);
    await page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`), fullPage: full });
  };

  await page.goto(`${BASE}/`);
  await shot("landing", true);
  await page.goto(`${BASE}/start`);
  await shot("start");
  await page.getByRole("button", { name: /Try with sample data/ }).click();
  await page.waitForURL(/\/editor/);
  if (width < 1024) {
    await shot("editor-edit");
    await page.getByRole("tab", { name: /Preview/ }).click();
    await shot("editor-preview");
    await page.getByRole("tab", { name: /Edit/ }).click();
  }
  await page.getByRole("button", { name: /^Projects/ }).click();
  await page.getByRole("button", { name: /Library Seat Finder/ }).first().click();
  await page.getByRole("button", { name: "Polish bullet 1" }).first().click();
  await page.getByText("Pick one — or reject all:").waitFor();
  await page.getByText("Pick one — or reject all:").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await shot("polish");

  await page.getByRole("tab", { name: /Tailor/ }).click();
  await page.getByLabel("Job description").fill("We are hiring a Software Intern who knows Python, SQL, React and Docker. Teamwork and Communication matter.");
  await page.getByRole("button", { name: "Analyse match" }).click();
  await page.getByText("Consider adding if true").waitFor();
  await shot("tailor", true);

  await page.getByRole("tab", { name: /Checks/ }).click();
  await page.waitForTimeout(900);
  await shot("checks");

  await page.getByRole("button", { name: "⬇️ Export" }).click();
  await page.getByRole("dialog").waitFor();
  await shot("export");
  await page.getByRole("button", { name: "Close" }).click();

  await page.goto(`${BASE}/builder`);
  await page.getByRole("navigation", { name: "Steps" }).getByRole("button", { name: "Projects" }).click();
  await shot("builder");

  await page.goto(`${BASE}/import`);
  await shot("import");
  await context.close();
}

try {
  await tour({ theme: "light", width: 1400, height: 900 });
  await tour({ theme: "dark", width: 1400, height: 900 });
  await tour({ theme: "light", width: 360, height: 760 });
  await tour({ theme: "dark", width: 360, height: 760 });
} catch (e) {
  problems.push(`tour failed: ${e.message}`);
} finally {
  await browser.close();
}
console.log(problems.length ? `Problems:\n${problems.join("\n")}` : `No problems. Screens in ${OUT}`);
if (problems.length) process.exitCode = 1;
