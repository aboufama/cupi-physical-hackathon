# Cornell University Physical Hackathon — site

[Live website](https://aboufama.github.io/cupi-physical-hackathon/) · [Public repository](https://github.com/aboufama/cupi-physical-hackathon)

Vite + React. A frosted-glass pane (Three.js post shader) with the real SO-101 arm behind it; the copy is painted onto
the pane and the arm can nudge it. Liquid-glass slabs with continuous-curvature corners (a ray-traced slab model,
`src/engine/shaders/liquidGlass.glsl.js`) float over the pane behind the sign-up and the sponsors; they light up under the
pointer and the button swells on press.

    npm install --ignore-scripts   # @ybouane/liquidglass ships a postinstall we don't need
    npm run dev                    # http://localhost:5173
    npm run build && npm run preview

- `src/App.jsx` — all the copy, dates, links and sponsors in one `EVENT` object.
- `src/engine/` — the scene, the URDF loader (`public/so101`), IK, letter physics, and the shaders.
- `compare.html` — the liquid-glass library vs our from-scratch shader, side by side.
- `legacy/` — the original single-file version, kept for reference.
- `so101/assets` — source STLs; `public/so101/meshes.bin` is generated from them (16-bit quantised, degenerate faces removed).

Debug query strings: `?raw` (scene without the glass), `?bare` (pane without copy), `?smooth` (frosted pane with no etch texture).

The alternate exhibition design is at `/variation.html`; the original remains at `/`.
Its generated design seed is `2673036982` (cobalt and acid yellow, exhibition placard, coordinate grid).
Reproduce the brief with `node scripts/design-seed.mjs 2673036982`, or omit the number to generate a new brief.
The variation uses the existing SO-101 model and company logos. Registration is marked as coming soon until the real form URL is supplied in `EVENT`.

Checking a change without a browser: `node scripts/shot.mjs <url> <out.png> [w h waitMs expr]` renders a page headlessly (`DPR=2` for retina),
`node scripts/crop.mjs <png> <x> <y> <w> <h> <scale> <out.png>` zooms into part of it. `node scripts/single-file.mjs <out.html>`
folds the whole site into one self-contained HTML file for hosting anywhere that takes a single file.

## Original opening screen

The main page at `/` contains only the original glass and robot opening screen, with company logos at the top right. The expanded sections, navigation, and footer have been removed.

- Edit `src/data/event.js` for event content and the registration URL. Registration is marked as coming soon until a real URL is supplied.
- The live textured glass and robot start automatically. The still image is a loading/WebGL fallback; reduced-motion preferences keep the live scene still.
- The build pre-renders the opening screen so its content is readable without JavaScript.
- Run `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4173` to serve locally.
- `npm run validate` checks responsive layouts, links, accessibility, animation behavior, and the no-JavaScript fallback. Reports default to `/tmp/cupi-validation`.

The expanded-site benchmark in `docs/VALIDATION.md` records the previous version.

## GitHub Pages

Pushes to `main` build and deploy the site with `.github/workflows/pages.yml`.
The build uses the Pages base path for scripts, logos, fonts, and robot assets.
To preview that build locally:

```sh
BASE_PATH=/cupi-physical-hackathon/ npm run build
BASE_PATH=/cupi-physical-hackathon/ npm run preview -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/cupi-physical-hackathon/`.
