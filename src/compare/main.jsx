import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { LiquidGlass } from '@ybouane/liquidglass';
import { mountOurs } from './ours.js';
import { LG_PARAMS } from '../engine/shaders/liquidGlass.glsl.js';
import './compare.css';

// Our side runs the site's numbers (LG_PARAMS). The library has its own parameter set, given values that sit as
// close to the same look as it gets. The shapes are shared; our side gives them continuous-curvature corners.
const CFG = LG_PARAMS;
const LIB_CFG = {
  refraction: 0.6, chromAberration: 0, edgeHighlight: 0.06, specular: 0.15, fresnel: 0.6, blurAmount: 0.25,
  brightness: 0.03, saturation: 0, tintStrength: 0, shadowOpacity: 0.12, shadowSpread: 16, shadowOffsetY: 5, bevelMode: 0,
};
const SHAPES = {
  box: { cornerRadius: 28, zRadius: 14 },
  btn: { cornerRadius: 16, zRadius: 9 },
  row: { cornerRadius: 24, zRadius: 12 },
};

function Panels() {
  return (
    <>
      <div className="glass btn" data-kind="btn">Sign up →</div>
      <div className="glass box" data-kind="box">
        <p className="t">Cornell University Hosted Physical AI Hackathon</p>
        <p>Teams will have a week to plan and design working solutions, then a day on site to test on real robots.</p>
        <p>Date: November 14, 2026</p>
      </div>
      <div className="glass row" data-kind="row">
        <span>FOUNDATION</span><span>PICOGRID</span><span>◆ Kite</span>
      </div>
    </>
  );
}

// Left: ybouane/liquidglass, the published package (it rasterises the DOM behind each glass element,
// then runs its own WebGL shader per element).
function Library() {
  const root = useRef(null);
  const state = useRef({ promise: null, timer: 0 });
  // StrictMode mounts, unmounts and remounts in dev; two library instances on the same elements
  // tear each other down, so keep one instance and only destroy it if the unmount is real.
  useEffect(() => {
    const st = state.current;
    clearTimeout(st.timer);
    if (!st.promise) {
      const els = root.current.querySelectorAll('.glass');
      els.forEach((el) => { el.dataset.config = JSON.stringify({ ...LIB_CFG, ...SHAPES[el.dataset.kind] }); });
      st.promise = LiquidGlass.init({ root: root.current, glassElements: els })
        .catch((err) => { console.error('LiquidGlass init failed:', err); return null; });
    }
    return () => { st.timer = setTimeout(() => { st.promise?.then((i) => i?.destroy()); st.promise = null; }, 0); };
  }, []);
  return (
    <div className="root lib" ref={root}>
      <img className="bg" src="/compare/bg.png" alt="" />
      <Panels />
    </div>
  );
}

// Right: the site's own slab shader (src/engine/shaders/liquidGlass.glsl.js) over the same image.
function Ours() {
  const root = useRef(null), canvas = useRef(null);
  useEffect(() => mountOurs(root.current, canvas.current, CFG, SHAPES), []);
  return (
    <div className="root ours" ref={root}>
      <canvas ref={canvas} />
      <Panels />
    </div>
  );
}

function App() {
  return (
    <div className="compare">
      <div className="col">
        <h2>@ybouane/liquidglass · the library</h2>
        <Library />
      </div>
      <div className="col">
        <h2>from scratch · this site's shader</h2>
        <Ours />
      </div>
      <pre className="cfg">{JSON.stringify({ ours: CFG, library: LIB_CFG, shapes: SHAPES }, null, 2)}</pre>
    </div>
  );
}

// No StrictMode here: its simulated unmount/remount in dev tears down the library instance mid-init.
createRoot(document.getElementById('root')).render(<App />);
