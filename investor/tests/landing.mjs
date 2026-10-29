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
    const errors = [],
      writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (r.method() === "POST") writes.push(r.url());
    });
    await page.goto("http://127.0.0.1:8099/");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `/downloads/adya-landing-${width}.png`,
      fullPage: width === 1440,
    });
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
    );
    await page.locator("#chooseFounder").click();
    assert(await page.locator("#founder").isVisible());
    await page.locator("#invited").click();
    assert((await page.locator("#codeError").textContent()).includes("format"));
    await page.locator("#founderCode").fill("ADYA-ABCDE");
    await page.locator("#invited").click();
    assert(
      (await page.locator("#founderRoute").textContent()).includes(
        "No review fee",
      ),
    );
    for (let n = 0; n < 3; n++) await page.locator("#founderNext").click();
    assert(
      (await page.locator("#founderState").textContent()).includes(
        "NOT submitted",
      ),
    );
    await page.locator("#openFounder").click();
    for (let n = 0; n < 4; n++) await page.locator("#founderNext").click();
    assert(
      (await page.locator("#founderState").textContent()).includes(
        "No payment or ticket",
      ),
    );
    await page.screenshot({
      path: `/downloads/adya-founder-route-${width}.png`,
    });
    await page.locator("#chooseInvestor").click();
    assert(!(await page.locator("#founder").isVisible()));
    assert(await page.locator("#investorEntry").isVisible());
    await page.locator("#investorEntry").scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      document
        .querySelector("#investorEntry")
        .scrollIntoView({ block: "start", behavior: "instant" });
    });
    await page.screenshot({
      path: `/downloads/adya-investor-entry-${width}.png`,
    });
    await page
      .getByRole("link", { name: "Explore sample investor journey" })
      .click();
    await page.getByRole("button", { name: "Explore the preview" }).click();
    assert(await page.locator("#startupGrid").isVisible());
    await page.locator("#industry").selectOption("SaaS");
    assert.equal(await page.locator("#startupGrid .card").count(), 1);
    assert(await page.locator("#directory").isVisible());
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
    );
    assert.equal(writes.length, 0);
    assert.deepEqual(errors, []);
    await page.close();
  }
  await browser.close();
  console.log(
    "Landing 1440/390/320: role transitions, invitation format guard, free invited walkthrough,499payment boundary, investor sample flow/filter/direct directory, no overflow/errors/POST writes: PASS",
  );
} finally {
  server.kill();
  await new Promise((r) => server.once("exit", r));
}
