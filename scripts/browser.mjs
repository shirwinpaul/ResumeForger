// Shared helper for local browser checks (uses the installed Microsoft Edge — no download).
import { chromium } from "playwright-core";

export const BASE = process.env.BASE_URL ?? "http://localhost:3000";

export async function launch({ width = 1400, height = 900 } = {}) {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  return { browser, context, page, errors };
}
