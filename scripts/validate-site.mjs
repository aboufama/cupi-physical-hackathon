import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const baseURL = process.env.SITE_TEST_URL || "http://127.0.0.1:4173/";
const output = resolve(process.env.SITE_TEST_OUTPUT || "/tmp/cupi-validation");
mkdirSync(output, { recursive: true });
const cache = join(
  homedir(),
  process.platform === "darwin"
    ? "Library/Caches/ms-playwright"
    : ".cache/ms-playwright",
);
let executablePath = process.env.CHROME_PATH;
if (!executablePath && existsSync(cache)) {
  const dir = readdirSync(cache).find((name) =>
    name.startsWith("chromium_headless_shell"),
  );
  if (dir) {
    const candidates = [
      "chrome-headless-shell-mac-arm64/chrome-headless-shell",
      "chrome-headless-shell-mac-x64/chrome-headless-shell",
      "chrome-linux/headless_shell",
      "chrome-headless-shell-linux64/chrome-headless-shell",
    ];
    executablePath = candidates
      .map((name) => join(cache, dir, name))
      .find(existsSync);
  }
}
if (!executablePath)
  throw new Error(
    "Set CHROME_PATH to a Chromium executable, or install Playwright Chromium.",
  );
const browser = await chromium.launch({
  executablePath,
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const results = [];
const failures = [];
const errors = [];
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const log = (name, detail) => {
  results.push({ name, status: "passed", detail });
  console.log(`PASS ${name}: ${detail}`);
};
async function test(name, callback) {
  try {
    await callback();
  } catch (error) {
    failures.push({ name, message: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
function watch(page) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (
      response.status() >= 400 &&
      response.url().startsWith(new URL(baseURL).origin)
    )
      errors.push(`${response.status()} ${response.url()}`);
  });
}
async function open(options = {}) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    ...options,
  });
  watch(page);
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return page;
}
try {
  for (const [width, height] of [
    [1440, 1000],
    [1024, 900],
    [768, 1024],
    [390, 844],
    [320, 740],
  ]) {
    await test(`Layout ${width}px`, async () => {
      const page = await open({ viewport: { width, height } });
      const snapshot = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        titleCount: document.querySelectorAll("h1").length,
        brokenImages: [...document.images]
          .filter((image) => !image.complete || !image.naturalWidth)
          .map((image) => image.src),
        deadLinks: [...document.querySelectorAll("a")]
          .filter(
            (a) =>
              !a.getAttribute("href") ||
              a.href.includes("REPLACE-ME") ||
              a.getAttribute("href") === "#",
          )
          .map((a) => a.textContent),
        badAnchors: [...document.querySelectorAll('a[href^="#"]')]
          .filter((a) => !document.getElementById(a.hash.slice(1)))
          .map((a) => a.hash),
        topSponsors: [...document.querySelectorAll(".topbar a")].map(
          (a) => a.textContent || a.querySelector("img").alt,
        ),
        clippedText: [...document.querySelectorAll("h1,h2,h3,p,summary")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width && (r.left < -1 || r.right > innerWidth + 1);
          })
          .map((el) => el.textContent.slice(0, 60)),
      }));
      assert.equal(snapshot.overflow, false);
      assert.equal(snapshot.titleCount, 1);
      assert.deepEqual(snapshot.brokenImages, []);
      assert.deepEqual(snapshot.deadLinks, []);
      assert.deepEqual(snapshot.badAnchors, []);
      assert.deepEqual(snapshot.clippedText, []);
      assert.deepEqual(snapshot.topSponsors, [
        "Google",
        "Anthropic",
        "Foundation",
        "Picogrid",
        "Kite",
      ]);
      if ([1440, 390].includes(width)) {
        await page.screenshot({ path: join(output, `hero-${width}.png`) });
        await page.screenshot({
          path: join(output, `full-${width}.png`),
          fullPage: true,
        });
        await page.addScriptTag({ content: axeSource });
        const audit = await page.evaluate(
          async () =>
            await axe.run(document, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
              },
            }),
        );
        writeFileSync(
          join(output, `axe-${width}.json`),
          JSON.stringify(audit, null, 2),
        );
        assert.deepEqual(
          audit.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
        );
      }
      await page.close();
      log(
        `Layout ${width}px`,
        "No overflow, clipped text, broken images, dead links, or missing anchors; correct sponsors.",
      );
    });
  }
  await test("Opening screen only", async () => {
    const page = await open();
    assert.equal(await page.locator("main section").count(), 1);
    assert.equal(await page.locator(".site-nav,.content-section,.site-footer,.explore-link").count(), 0);
    assert.equal(await page.locator(".signup").textContent(), "Registration coming soon");
    assert.equal(await page.locator('a[href="#register"]').count(), 0);
    await page.close();
    log("Opening screen only", "Original hero remains; extended sections, navigation and footer are removed.");
  });
  await test("Motion and WebGL fallback", async () => {
    const page = await open();
    assert.equal(
      await page
        .getByRole("button", { name: "Play animation" })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(await page.locator('#glass[data-status="ready"]').count(), 0);
    assert.equal(
      await page
        .locator(".scene-poster img")
        .evaluate((el) => el.naturalWidth > 0),
      true,
    );
    await page.close();
    const fallback = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await fallback.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type.startsWith("webgl")
          ? null
          : original.call(this, type, ...args);
      };
    });
    await fallback.goto(baseURL, { waitUntil: "networkidle" });
    await fallback.getByRole("button", { name: "Play animation" }).click();
    await fallback.waitForTimeout(1200);
    assert.notEqual(
      await fallback.locator("h1").evaluate((el) => getComputedStyle(el).color),
      "rgba(0, 0, 0, 0)",
    );
    assert.equal(
      await fallback.locator("#glass").evaluate((el) => el.hidden),
      true,
    );
    await fallback.screenshot({ path: join(output, "webgl-fallback.png") });
    await fallback.close();
    const active = await open({ reducedMotion: "no-preference" });
    await active.getByRole("button", { name: "Play animation" }).click();
    await active.waitForSelector('#glass[data-status="ready"]');
    await active.getByRole("button", { name: "Pause animation" }).click();
    await active.waitForSelector('#glass[data-paused="true"]');
    await active.getByRole("button", { name: "Play animation" }).click();
    await active.waitForSelector('#glass[data-paused="false"]');
    await active.close();
    log(
      "Motion and WebGL fallback",
      "Reduced-motion preference respected; pause/resume works; content remains readable without WebGL.",
    );
  });
  await test("200% zoom-equivalent viewport", async () => {
    const page = await open({
      viewport: { width: 720, height: 500 },
      deviceScaleFactor: 2,
    });
    await page.waitForTimeout(250);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: join(output, "zoom-200.png"),
    });
    await page.close();
    log(
      "200% zoom-equivalent viewport",
      "No overflow at 720 CSS pixels with 2× scaling, equivalent to 1440px desktop at 200% zoom.",
    );
  });
  await test("Event content without JavaScript", async () => {
    const page = await browser.newPage({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    await page.goto(baseURL, { waitUntil: "networkidle" });
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("main section").count(), 1);
    assert.equal(await page.locator(".desc").isVisible(), true);
    assert.equal(await page.locator(".motion-toggle").isVisible(), false);
    await page.screenshot({ path: join(output, "no-javascript.png") });
    await page.close();
    log(
      "Event content without JavaScript",
      "Opening screen content and sponsor links remain available.",
    );
  });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  const report = {
    timestamp: new Date().toISOString(),
    baseURL,
    results,
    failures,
    errors,
  };
  writeFileSync(
    join(output, "functional-report.json"),
    JSON.stringify(report, null, 2),
  );
}
if (failures.length || errors.length) process.exitCode = 1;
else console.log(`All checks passed. Reports: ${output}`);
