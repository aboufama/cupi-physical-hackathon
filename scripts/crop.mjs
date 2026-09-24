// A zoomed crop of an image, for checking pixel-level detail (rims, hairlines) in a screenshot.
//   node scripts/crop.mjs <image.png or url> <x> <y> <w> <h> <scale> <out.png>
import { chromium } from 'playwright-core';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const [src, x, y, w, h, s, out] = process.argv.slice(2);
const cache = join(homedir(), 'Library/Caches/ms-playwright');
const dir = readdirSync(cache).find((d) => d.startsWith('chromium_headless_shell'));
const exe = join(cache, dir, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
if (!existsSync(exe)) throw new Error('no chromium headless shell under ' + cache);

const url = /^https?:/.test(src) ? src : `data:image/png;base64,${readFileSync(src).toString('base64')}`;
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: Math.ceil(w * s), height: Math.ceil(h * s) }, deviceScaleFactor: 1 });
await page.setContent(`<body style="margin:0;overflow:hidden;background:#888"><img src="${url}" style="position:absolute;left:${-x * s}px;top:${-y * s}px;transform-origin:0 0;transform:scale(${s})"></body>`);
await page.waitForTimeout(300);
await page.screenshot({ path: out });
await browser.close();
console.log('saved', out);
