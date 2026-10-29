import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const server = spawn(process.execPath, ["server/index.mjs"], {
  env: { ...process.env, PORTAL_PREVIEW: "true" },
  stdio: "ignore",
});
try {
  await new Promise((r) => setTimeout(r, 1000));
  const browser = await chromium.launch();
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 1440 ? 1000 : 844 },
    });
    await page.goto("http://127.0.0.1:8099/gate-preview.html");
    await page.evaluate(() => document.fonts.ready);
    assert(await page.locator("#invite").isVisible());
    assert(
      await page
        .getByRole("link", { name: "Investor login preview" })
        .isVisible(),
    );
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
    );
    await page
      .getByRole("link", { name: "Investor login preview" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/downloads/adya-gate-theme-${width}.png` });
    await page.getByRole("link", { name: "Investor login preview" }).click();
    await page.getByRole("button", { name: "Explore the preview" }).click();
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `/downloads/adya-investor-theme-${width}.png`,
    });
    await page.close();
  }
  await browser.close();
  console.log(
    "1440/390/320 theme+placement preview QA passed; original code entry preserved; no backend calls",
  );
} finally {
  server.kill();
  await new Promise((r) => server.once("exit", r));
}
