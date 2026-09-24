# Cornell University Physical Hackathon — site

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

Checking a change without a browser: `node scripts/shot.mjs <url> <out.png> [w h waitMs expr]` renders a page headlessly (`DPR=2` for retina),
`node scripts/crop.mjs <png> <x> <y> <w> <h> <scale> <out.png>` zooms into part of it. `node scripts/single-file.mjs <out.html>`
folds the whole site into one self-contained HTML file for hosting anywhere that takes a single file.
