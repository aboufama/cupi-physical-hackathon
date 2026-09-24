// Fold the site into one self-contained HTML file: JS, CSS, logos and the SO-101 files all inline, so it can be
// hosted anywhere that takes a single file (a claude.ai artifact, a gist, an email). The robot loader's fetches
// are answered from an embedded copy of the files by a small shim.
//   node scripts/single-file.mjs <out.html> [title] [--fragment] [--smooth]
// --fragment leaves out doctype/html/head/body, for hosts that wrap the file in their own skeleton.
// --smooth bakes in the ?smooth variant (a frosted pane with no etch texture).
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const fragment = args.includes('--fragment'), smooth = args.includes('--smooth');
const [out = 'site.html', title = 'Cornell University Physical Hackathon'] = args.filter((a) => !a.startsWith('--'));
const root = resolve(import.meta.dirname, '..');
const dist = mkdtempSync(join(tmpdir(), 'cupi-single-'));
await build({
  root, configFile: false, logLevel: 'warn', plugins: [react()],
  build: { outDir: dist, emptyOutDir: true, rollupOptions: { input: join(root, 'index.html'), output: { inlineDynamicImports: true } } },
});

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const rel = (p) => join(dist, p.replace(/^\//, ''));
const cssHref = html.match(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"/)[1];
const jsSrc = html.match(/<script type="module"[^>]*src="([^"]+\.js)"/)[1];
const fontLinks = [...html.matchAll(/<link[^>]+>/g)].map((m) => m[0]).filter((t) => /fonts\.g(oogleapis|static)/.test(t));
let js = readFileSync(rel(jsSrc), 'utf8');
const css = readFileSync(rel(cssHref), 'utf8');
const mime = { png: 'image/png', svg: 'image/svg+xml', jpg: 'image/jpeg' };
js = js.replace(/"\/logos\/([\w.-]+)"/g, (m, f) => JSON.stringify(`data:${mime[f.split('.').pop()]};base64,${readFileSync(join(dist, 'logos', f)).toString('base64')}`));
if (/<\/script/i.test(js)) throw new Error('bundle contains </script>');
const files = { '/so101/so101.urdf': 'application/xml', '/so101/meshes.json': 'application/json', '/so101/meshes.bin': 'application/octet-stream' };
const embedded = Object.fromEntries(Object.entries(files).map(([k, t]) => [k, [readFileSync(rel(k)).toString('base64'), t]]));
const shim = `<script>(function(){var A=${JSON.stringify(embedded)};var f=window.fetch.bind(window);
window.fetch=function(u,o){var k=typeof u==='string'?u:(u&&u.url)||'';k=k.replace(/^https?:\\/\\/[^/]+/,'').split('?')[0];var a=A[k];if(!a)return f(u,o);
var s=atob(a[0]),n=s.length,b=new Uint8Array(n);for(var i=0;i<n;i++)b[i]=s.charCodeAt(i);
return Promise.resolve(new Response(new Blob([b],{type:a[1]}),{status:200,headers:{'Content-Type':a[1]}}));};})();</script>`;
const flags = smooth ? '<script>window.SMOOTH_FROST = true;</script>\n' : '';
const body = `<meta charset="utf-8">\n<title>${title}</title>\n${fontLinks.join('\n')}\n<style>${css}</style>\n<div id="root"></div>\n${flags}${shim}\n<script type="module">${js}</script>\n`;
const page = fragment ? body : `<!doctype html>\n<html lang="en">\n<head>\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n${body}</head>\n<body></body>\n</html>\n`;
writeFileSync(out, page);
rmSync(dist, { recursive: true, force: true });
console.log('wrote', out, (page.length / 1e6).toFixed(2) + ' MB');
