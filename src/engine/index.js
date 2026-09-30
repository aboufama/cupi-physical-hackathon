import * as THREE from 'three';
import { QUAD_VS, BLUR_FS, PANE_FS } from './shaders/pane.glsl.js';
import { LG_PARAMS } from './shaders/liquidGlass.glsl.js';
import { loadRobot, setJoint } from './robot.js';
import { createIK } from './ik.js';
import { createText } from './text.js';

// The whole thing behind and on the pane. Created once by <GlassPane/>; dispose() tears it all down.
export function createEngine({ canvas, paused = false, onError = () => {} }) {
  let sceneDirty = true;
  const RAW = location.search.includes('raw');                 // ?raw: the scene without the glass
  const SMOOTH = location.search.includes('smooth') || !!window.SMOOTH_FROST;   // ?smooth: frosted with no etch texture
  const disposers = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); disposers.push(() => target.removeEventListener(type, fn, opts)); };

  /* ---- renderer ---------------------------------------------------- */
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
  catch { canvas.hidden = true; onError(); return { dispose() {}, setPaused() {} }; }
  on(canvas, 'webglcontextlost', (event) => { event.preventDefault(); canvas.hidden = true; delete document.documentElement.dataset.glassReady; onError(); });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // we gamma-encode in the pane shader
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* ---- studio -------------------------------------------------------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d9d9d9');
  const CAM_Z = 2.2, FOV = 40;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 12);
  camera.position.set(0, 0, CAM_Z);
  scene.add(new THREE.HemisphereLight('#f2f2f2', '#7a7a7a', 0.9));
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(-1.6, 2.6, 1.8); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0008; key.shadow.normalBias = 0.02;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#eeeeee', 0.6); fill.position.set(2.2, 0.6, 1.2); scene.add(fill);
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ color: '#d4d4d4', roughness: 1 }));
  backWall.position.set(0, 1, -3.2); backWall.receiveShadow = true; scene.add(backWall);
  const FLOOR_Y = -1.05;
  // the floor is toned so that, through the pane, it matches the wall: no gradient toward the bottom edge
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ color: '#c6c6c6', roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR_Y; floor.receiveShadow = true; scene.add(floor);
  const BENCH_Y = -0.72;
  // the bench too: it reads through the arm's shadow on it, not as a lighter patch
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, BENCH_Y - FLOOR_Y, 0.8), new THREE.MeshStandardMaterial({ color: '#c9c9c9', roughness: 0.85 }));
  bench.position.set(0.45, (BENCH_Y + FLOOR_Y) / 2, -0.75); bench.castShadow = bench.receiveShadow = true; scene.add(bench);
  // the top of the pane fades to this flat matte tone (see matteAt in the pane shader). It is the tone the far wall
  // shows through the frost, so the join is invisible; given as the on-screen colour and taken back through the
  // pane's tone curve (ACES then gamma 2.2) to the linear value the shader mixes in.
  const MATTE = '#d4d4d4';
  const matteLinear = (() => {
    const t = Math.pow(parseInt(MATTE.slice(1, 3), 16) / 255, 2.2);          // display -> ACES output (grey: one channel is enough)
    const a = 2.51 - 2.43 * t, b = 0.03 - 0.59 * t, c = -0.14 * t;           // ACES(y) = t, solved for y
    return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a) / 1.02;
  })();

  // the arm: URDF is z-up in metres; the bench is in our scene units
  const SCALE = 3.6;
  const BASE = new THREE.Vector3(0.32, BENCH_Y, -0.62);
  const armRoot = new THREE.Group(); armRoot.position.copy(BASE); scene.add(armRoot);
  const upright = new THREE.Group(); upright.rotation.set(-Math.PI / 2, 0, Math.PI / 2, 'YXZ'); upright.scale.setScalar(SCALE); armRoot.add(upright);
  let robot = null, ik = null, tip = null, J = null;
  loadRobot().then((r) => {
    if (disposed) return;
    robot = r; upright.add(robot.root);
    tip = robot.links.gripper_frame_link;                    // the point between the fingertips
    ik = createIK({ robot, armRoot, tip, wristNode: robot.links.wrist_link, floorY: BENCH_Y + 0.12 });
    J = robot.joints;
    sceneDirty = true;
  }).catch((err) => { if (!disposed) { canvas.hidden = true; delete document.documentElement.dataset.glassReady; onError(); console.error('SO-101 failed to load', err); } });

  /* ---- the copy, painted ------------------------------------------- */
  const text = createText({});                               // only the copy is painted; the whole top row is plain DOM
  const paintTex = new THREE.CanvasTexture(text.canvas);
  paintTex.minFilter = THREE.LinearFilter; paintTex.magFilter = THREE.LinearFilter; paintTex.generateMipmaps = false;
  document.fonts?.ready.then(() => { text.measure(); text.fonts(); });
  on(window, 'scroll', () => text.measure(), { passive: true });

  /* ---- offscreen buffers + pane shader ------------------------------ */
  let rt, rtH = [], rtQ = [], rtE = [];
  const mk = (w, h, depth) => {
    const t = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: depth });
    if (depth) { t.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType); t.depthTexture.format = THREE.DepthFormat; }
    return t;
  };
  const allRT = () => [rt, ...rtH, ...rtQ, ...rtE].filter(Boolean);
  function makeRT(w, h) {
    allRT().forEach((t) => t.dispose());
    rt = mk(w, h, true);
    rtH = [mk(w >> 1, h >> 1, false), mk(w >> 1, h >> 1, false)];
    rtQ = [mk(w >> 2, h >> 2, false), mk(w >> 2, h >> 2, false)];
    rtE = [mk(w >> 3, h >> 3, false), mk(w >> 3, h >> 3, false)];
  }
  const blurMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: QUAD_VS, fragmentShader: BLUR_FS, depthTest: false, depthWrite: false });
  const blurScene = new THREE.Scene(); blurScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat));
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  function blurInto(pair, src, passes, step) {
    let from = src;
    for (let i = 0; i < passes; i++) {
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const to = from === pair[0] ? pair[1] : pair[0];
        blurMat.uniforms.tex.value = from.texture;
        blurMat.uniforms.dir.value.set(dx * step / pair[0].width, dy * step / pair[0].height);
        renderer.setRenderTarget(to); renderer.render(blurScene, postCam);
        from = to;
      }
    }
    return from;
  }
  const P = LG_PARAMS;
  const glassMat = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null }, tDepth: { value: null }, tBlurA: { value: null }, tBlurB: { value: null }, tBlurC: { value: null }, tPaint: { value: paintTex },
      uRes: { value: new THREE.Vector2() }, uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uNear: { value: camera.near }, uFar: { value: camera.far }, uCamZ: { value: CAM_Z },
      uTanHalf: { value: Math.tan(FOV * Math.PI / 360) }, uAspect: { value: 1 },
      uMatte: { value: new THREE.Vector3(matteLinear, matteLinear, matteLinear) },
      uSmooth: { value: SMOOTH ? 1 : 0 },
      // liquid-glass slabs: rect = (cx, cy, hw, hh) in device px y-up; param = (corner radius, fillet radius, corner exponent, extra frost);
      // state = (pointer x, pointer y in slab px, hover, press)
      uLGCount: { value: 0 },
      uLGRect: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
      uLGParam: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
      uLGState: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
      uLG1: { value: new THREE.Vector4(P.ior, P.wall, P.gap, P.profile) },            // px terms are rescaled to device px each frame
      uLG2: { value: new THREE.Vector4(P.lift, P.blur, P.key, P.fill) },
      uLG3: { value: new THREE.Vector4(P.shadowOpacity, P.shadowSpread, P.shadowOffsetY, P.touchGlow) },
    },
    vertexShader: QUAD_VS, fragmentShader: PANE_FS, depthTest: false, depthWrite: false,
  });
  const postScene = new THREE.Scene(); postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glassMat));

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    makeRT(Math.round(w * dpr), Math.round(h * dpr));
    glassMat.uniforms.uRes.value.set(w * dpr, h * dpr);
    glassMat.uniforms.uAspect.value = w / h;
    text.measure(); text.fonts(); sceneDirty = true;
  }
  resize();
  on(window, 'resize', resize);

  // liquid-glass slabs, sized from the layout: corner radius and rim fillet zR in CSS px. Buttons brighten and swell
  // when hovered and pressed; every slab lights up under the pointer.
  const PANELS = [
    { sel: '.signup',   radius: 16, zR: 9, button: true },
    // { sel: '.hosts',    radius: 24, zR: 12 },   // the top row sits bare on the pane (glass removed 2026-09-02)
    // { sel: '.sponsors', radius: 24, zR: 12 },
    // { sel: '#copy',   radius: 28, zR: 14 },   // off for now
  ];
  for (const p of PANELS) { p.el = document.querySelector(p.sel); p.hover = 0; p.press = 0; p.pressV = 0; p.inside = false; p.held = false; }
  const over = (p, x, y) => p.cx !== undefined && Math.abs(x - p.cx) <= p.hw && Math.abs(y - p.cy) <= p.hh;
  on(window, 'pointerdown', (e) => { for (const p of PANELS) if (over(p, e.clientX, e.clientY)) p.held = true; });
  on(window, 'pointerup', (e) => { for (const p of PANELS) p.held = false; if (e.pointerType === 'touch') mouse.present = false; });
  on(window, 'pointercancel', () => { for (const p of PANELS) p.held = false; });
  function updatePanels(dt) {
    const dpr = renderer.getPixelRatio();
    const cs = getComputedStyle(document.documentElement);           // slab padding lives in CSS so layout and shader agree
    const padX = parseFloat(cs.getPropertyValue('--slab-px')) || 28, padY = parseFloat(cs.getPropertyValue('--slab-py')) || 14;
    const pointerHere = mouse.present;
    let n = 0;
    for (const p of PANELS) {
      if (!p.el || n >= 4) continue;
      const r = p.el.getBoundingClientRect();
      if (r.width === 0) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let hw = r.width / 2 + padX, hh = r.height / 2 + padY;
      p.cx = cx; p.cy = cy; p.hw = hw; p.hh = hh;
      p.inside = pointerHere && over(p, mouse.x, mouse.y);
      // hover eases in quickly and out a little slower; press is a spring, so the glass swells and settles
      p.hover += ((p.inside ? 1 : 0) - p.hover) * (1 - Math.exp(-dt * (p.inside ? 16 : 9)));
      const w0 = 22, zeta = 0.6, pressT = p.button && p.held ? 1 : 0;
      p.pressV += (w0 * w0 * (pressT - p.press) - 2 * zeta * w0 * p.pressV) * dt; p.press += p.pressV * dt;
      const grow = paused ? 1 : 1 + P.pressGrow * p.press;
      hw *= grow; hh *= grow;
      const radius = Math.min(p.radius * grow, hh);
      const lift = p.button ? P.hoverLift * p.hover + P.pressLift * p.press : 0;
      glassMat.uniforms.uLGRect.value[n].set(cx * dpr, (innerHeight - cy) * dpr, hw * dpr, hh * dpr);
      glassMat.uniforms.uLGParam.value[n].set(radius * dpr, p.zR * dpr, P.corner, lift);
      glassMat.uniforms.uLGState.value[n].set((mouse.x - cx) * dpr, (cy - mouse.y) * dpr, p.hover, p.press);
      n++;
    }
    glassMat.uniforms.uLGCount.value = n;
    glassMat.uniforms.uLG1.value.set(P.ior, P.wall * dpr, P.gap * dpr, P.profile);
    glassMat.uniforms.uLG3.value.set(P.shadowOpacity, P.shadowSpread * dpr, P.shadowOffsetY * dpr, 0);
  }

  /* ---- screen <-> glass plane ---------------------------------------- */
  const halfH = () => CAM_Z * Math.tan(FOV * Math.PI / 360);
  const screenToGlass = (sx, sy, out) => out.set(((sx / innerWidth) * 2 - 1) * halfH() * camera.aspect, (1 - (sy / innerHeight) * 2) * halfH(), 0);
  const _p = new THREE.Vector3();
  const worldToScreen = (v) => { _p.copy(v).project(camera); return { x: (_p.x + 1) / 2 * innerWidth, y: (1 - _p.y) / 2 * innerHeight }; };

  /* ---- behaviour ------------------------------------------------------ */
  const HOVER_Z = -0.42;   // resting: a soft silhouette
  const NEAR_Z = -0.24;    // cursor over the copy: close enough to read the gripper
  const TOUCH_Z = -0.19;   // a poke: the fingertips sharpen, the servo block behind them stays a soft blob
  const target = new THREE.Vector3(-0.4, 0.1, HOVER_Z), goal = target.clone(), goalV = new THREE.Vector3(), tmp = new THREE.Vector3();
  const mouse = { x: innerWidth * 0.5, y: innerHeight * 0.5, t: -1e9, down: false, present: false };   // present: a pointer is over the page
  const poke = { on: false, t: 0, dur: 1.5 };
  const idle = { next: 1.5 };
  on(window, 'pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = performance.now(); mouse.present = true; glassMat.uniforms.uMouse.value.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight); }, { passive: true });
  on(window, 'pointerdown', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = performance.now(); mouse.present = true; mouse.down = true; poke.t = 0; poke.on = true; });
  on(window, 'pointerup', () => { mouse.down = false; });
  on(document, 'mouseleave', () => { mouse.t = -1e9; mouse.present = false; });
  const copyEl = document.getElementById('copy');

  /* ---- frame loop ------------------------------------------------------ */
  const clock = new THREE.Clock();
  const tipW = new THREE.Vector3();
  let disposed = false, raf = 0;
  on(document, 'visibilitychange', () => { if (!document.hidden) { clock.getDelta(); cancelAnimationFrame(raf); loop(); } });

  function loop() {
    if (disposed || document.hidden || canvas.hidden) return;
    raf = requestAnimationFrame(loop);
    const hero = document.getElementById('home');
    if (hero && scrollY > hero.offsetHeight) return;
    if (paused && !text.dirty && !sceneDirty) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // --- decide where the fingertip should go
    const userActive = !paused && performance.now() - mouse.t < 3000;
    if (userActive) {
      screenToGlass(mouse.x, mouse.y, tmp); target.x = tmp.x; target.y = tmp.y;
      const tb = copyEl ? copyEl.getBoundingClientRect() : null, pad = 48;
      const overText = tb && mouse.x > tb.left - pad && mouse.x < tb.right + pad && mouse.y > tb.top - pad && mouse.y < tb.bottom + pad;
      const restZ = overText ? NEAR_Z : HOVER_Z;
      if (poke.on) { poke.t += dt; const u = THREE.MathUtils.clamp(poke.t / poke.dur, 0, 1); target.z = THREE.MathUtils.lerp(restZ, TOUCH_Z, Math.sin(u * Math.PI)); if (u >= 1) poke.on = false; }
      else target.z = mouse.down ? TOUCH_Z : restZ;
      idle.next = t + 1.2;
    } else if (!paused) {
      if (poke.on) {
        poke.t += dt; const u = THREE.MathUtils.clamp(poke.t / poke.dur, 0, 1);
        target.z = THREE.MathUtils.lerp(HOVER_Z, TOUCH_Z, Math.pow(Math.max(0, Math.sin(u * Math.PI)), 0.7));
        if (u >= 1) { poke.on = false; idle.next = t + 1.2 + Math.random() * 1.8; }
      } else if (t > idle.next) {
        const L = text.pickIdle();
        if (L) { screenToGlass(L.cx, L.cy, tmp); target.x = tmp.x + (Math.random() - 0.5) * 0.06; target.y = tmp.y - 0.02 + (Math.random() - 0.5) * 0.04; }
        idle.next = t + 1.1; poke.on = true; poke.t = -0.55; poke.dur = 1.5;   // wait a beat over the word, then lean in
        target.z = HOVER_Z;
      } else {
        target.z = HOVER_Z;
        target.x += Math.sin(t * 0.7) * 0.0004; target.y += Math.cos(t * 0.9) * 0.0003;   // gentle drift while thinking
      }
    }

    // --- critically-damped spring toward the target (the servo feel)
    const w0 = userActive ? 9.0 : 5.5;
    for (const ax of ['x', 'y', 'z']) {
      const acc = w0 * w0 * (target[ax] - goal[ax]) - 2 * w0 * goalV[ax];
      goalV[ax] += acc * dt; goal[ax] += goalV[ax] * dt;
    }
    goal.z = Math.min(goal.z, TOUCH_Z);   // hard floor: the arm stays behind the glass

    if (ik && (!paused || sceneDirty)) {
      ik.aimAt(goal.x, goal.y, goal.z, TOUCH_Z);
      ik.solve(ik.tipT, ik.aim);
      ik.step(dt);
      const sJ = 1 - Math.exp(-dt * 10);
      setJoint(J.gripper, J.gripper.q + ((poke.on ? 0.12 : 0.9) - J.gripper.q) * sJ);
      scene.updateMatrixWorld();
      tip.getWorldPosition(tipW);
      text.step(dt, worldToScreen(tipW), THREE.MathUtils.smoothstep(tipW.z, -0.30, -0.20));
    }

    // --- render the world, then look at it through the glass
    if (text.dirty) { text.draw(renderer.getPixelRatio()); paintTex.needsUpdate = true; }
    updatePanels(dt);
    glassMat.uniforms.uTime.value = t;
    if (RAW) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    const A = blurInto(rtH, rt, 3, 1.4);
    const B = blurInto(rtQ, A, 3, 2.0);
    const C = blurInto(rtE, B, 3, 2.2);
    glassMat.uniforms.tScene.value = rt.texture; glassMat.uniforms.tDepth.value = rt.depthTexture;
    glassMat.uniforms.tBlurA.value = A.texture; glassMat.uniforms.tBlurB.value = B.texture; glassMat.uniforms.tBlurC.value = C.texture;
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    sceneDirty = false;
    document.documentElement.dataset.glassReady = 'true';
    canvas.dataset.status = 'ready';
    canvas.dataset.paused = String(paused);
  }
  loop();

  return {
    setPaused(value) { paused = value; sceneDirty = true; },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      disposers.forEach((d) => d());
      allRT().forEach((t) => t.dispose());
      paintTex.dispose(); glassMat.dispose(); blurMat.dispose();
      const geometries = new Set();
      const materials = new Set();
      for (const group of [scene, blurScene, postScene]) group.traverse(node => {
        if (node.geometry) geometries.add(node.geometry);
        // Robot materials are shared by its loader. Keep them available to other views.
        if (node.material && !upright.getObjectById(node.id)) materials.add(node.material);
      });
      geometries.forEach(value => value.dispose());
      materials.forEach(value => value.dispose());
      key.shadow.map?.dispose();
      renderer.dispose();
    },
  };
}
