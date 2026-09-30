import * as THREE from 'three';
import { loadRobot, MATERIALS, setJoint } from '../engine/robot.js';

// A self-contained exhibit. The existing loader's shared materials stay untouched.
export function createRobotStage({ canvas, container, onReady, onError }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    onError();
    return { dispose() {}, setPaused() {} };
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 30);
  const exhibit = new THREE.Group();
  scene.add(exhibit);
  scene.add(new THREE.HemisphereLight('#ffffff', '#c2c490', 2.5));
  const key = new THREE.DirectionalLight('#ffffff', 4);
  key.position.set(-3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -2;
  key.shadow.camera.right = key.shadow.camera.top = 2;
  key.shadow.normalBias = 0.025;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#aebeff', 2.5);
  rim.position.set(4, 3, -3);
  scene.add(rim);

  const ownedMaterials = new Set();
  const material = (settings) => {
    const value = new THREE.MeshStandardMaterial(settings);
    ownedMaterials.add(value);
    return value;
  };
  const shell = material({ color: '#e9e7d9', roughness: 0.35, metalness: 0.2 });
  const servo = material({ color: '#202744', roughness: 0.48, metalness: 0.25 });
  const board = material({ color: '#ceeb69', roughness: 0.6, metalness: 0.12 });
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 0.08, 80),
    material({ color: '#d5e942', roughness: 0.7 }),
  );
  plinth.receiveShadow = true;
  plinth.position.y = -0.04;
  exhibit.add(plinth);
  const rimRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.64, 0.006, 8, 96),
    material({ color: '#2946bc', roughness: 0.6 }),
  );
  rimRing.rotation.x = -Math.PI / 2;
  rimRing.position.y = 0.008;
  exhibit.add(rimRing);

  let disposed = false;
  let ready = false;
  let paused = false;
  let raf = 0;
  let pointer = null;
  let lastX = 0;
  let rotation = -0.6;
  let interactionAt = 0;
  let radius = 1.15;
  const target = new THREE.Vector3(0, 0.75, 0);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = [];
  const on = (element, event, callback, options) => {
    element.addEventListener(event, callback, options);
    listeners.push(() => element.removeEventListener(event, callback, options));
  };

  function draw() {
    if (!disposed) renderer.render(scene, camera);
  }
  function frame(now) {
    raf = 0;
    if (disposed || document.hidden || !ready) return;
    const animate = !paused && !motion.matches && pointer === null;
    const idle = animate && now - interactionAt > 2500;
    exhibit.rotation.y = rotation + (idle ? Math.sin((now - interactionAt - 2500) * 0.0002) * 0.2 : 0);
    draw();
    if (animate) raf = requestAnimationFrame(frame);
  }
  function invalidate() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height || disposed) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const halfHeight = radius / Math.min(aspect, 1);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.position.copy(target).add(new THREE.Vector3(3.2, 1.75, 5));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    invalidate();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  on(canvas, 'pointerdown', (event) => {
    if (!ready || event.button !== 0) return;
    pointer = event.pointerId;
    lastX = event.clientX;
    rotation = exhibit.rotation.y;
    canvas.setPointerCapture(pointer);
    canvas.style.cursor = 'grabbing';
    invalidate();
  });
  on(canvas, 'pointermove', (event) => {
    if (pointer !== event.pointerId) return;
    rotation += (event.clientX - lastX) * 0.009;
    lastX = event.clientX;
    interactionAt = performance.now();
    invalidate();
  });
  const release = (event) => {
    if (pointer !== event.pointerId) return;
    pointer = null;
    interactionAt = performance.now();
    canvas.style.cursor = 'grab';
    invalidate();
  };
  on(canvas, 'pointerup', release);
  on(canvas, 'pointercancel', release);
  on(canvas, 'lostpointercapture', release);
  on(canvas, 'keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    rotation = event.key === 'Home' ? -0.6 : rotation + (event.key === 'ArrowLeft' ? -0.15 : 0.15);
    interactionAt = performance.now();
    invalidate();
  });
  on(motion, 'change', invalidate);
  on(document, 'visibilitychange', invalidate);
  on(canvas, 'webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(raf);
    ready = false;
    onError();
  });

  function disposeGeometry(root) {
    const geometries = new Set();
    root.traverse((node) => { if (node.geometry) geometries.add(node.geometry); });
    geometries.forEach((geometry) => geometry.dispose());
  }
  loadRobot().then((robot) => {
    if (disposed) { disposeGeometry(robot.root); return; }
    const pose = { shoulder_pan: 0, shoulder_lift: -0.65, elbow_flex: 0.5, wrist_flex: 0.3, wrist_roll: 0.25, gripper: 0.6 };
    Object.entries(pose).forEach(([name, value]) => setJoint(robot.joints[name], value));
    robot.root.traverse((node) => {
      if (node.isMesh) node.material = node.material === MATERIALS.servo ? servo : node.material === MATERIALS.pcb ? board : shell;
    });
    const upright = new THREE.Group();
    upright.rotation.set(-Math.PI / 2, 0, Math.PI / 2, 'YXZ');
    upright.scale.setScalar(4);
    upright.add(robot.root);
    exhibit.add(upright);
    exhibit.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(upright);
    upright.position.y -= bounds.min.y;
    exhibit.updateMatrixWorld(true);
    const allBounds = new THREE.Box3().setFromObject(exhibit);
    // Center the viewing axis on the base so a complete manual rotation stays in frame.
    target.set(0, (allBounds.max.y + allBounds.min.y) / 2, 0);
    radius = 0;
    for (const x of [allBounds.min.x, allBounds.max.x]) {
      for (const y of [allBounds.min.y, allBounds.max.y]) {
        for (const z of [allBounds.min.z, allBounds.max.z]) {
          radius = Math.max(radius, new THREE.Vector3(x, y, z).distanceTo(target));
        }
      }
    }
    ready = true;
    onReady();
    resize();
  }).catch(() => { if (!disposed) onError(); });
  resize();

  return {
    setPaused(value) { paused = value; interactionAt = performance.now(); invalidate(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      listeners.forEach((remove) => remove());
      disposeGeometry(scene);
      ownedMaterials.forEach((value) => value.dispose());
      key.shadow.map?.dispose();
      renderer.dispose();
    },
  };
}
