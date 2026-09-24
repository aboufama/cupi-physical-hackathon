// Render a page in headless Chromium with real waiting, print its console, optionally evaluate an expression.
//   node scripts/shot.mjs <url> <out.png> [width=1440] [height=900] [waitMs=4000] [expr]
//   DPR=2 node scripts/shot.mjs ...   renders at a retina device scale factor
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const [url, out, w = '1440', h = '900', wait = '4000', expr] = process.argv.slice(2);
const cache = join(homedir(), 'Library/Caches/ms-playwright');
const dir = readdirSync(cache).find((d) => d.startsWith('chromium_headless_shell'));
const exe = join(cache, dir, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
if (!existsSync(exe)) throw new Error('no chromium headless shell under ' + cache);

const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DPR || 1) });
page.on('console', (m) => { if (!/vite|DevTools/.test(m.text())) console.log(`[${m.type()}] ${m.text().slice(0, 300)}`); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(+wait);
if (expr) console.log('eval:', JSON.stringify(await page.evaluate(expr)));
await page.screenshot({ path: out });
await browser.close();
console.log('saved', out);
