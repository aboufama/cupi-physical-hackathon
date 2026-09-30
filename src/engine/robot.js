import * as THREE from 'three';

// The real SO-101: links, joints and meshes straight from so101_new_calib.urdf (TheRobotStudio/SO-ARM100).
// Meshes are served as one binary of 16-bit quantised triangles (public/so101/meshes.bin + meshes.json).

export const MATERIALS = {
  pla:   new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.55, metalness: 0.0 }),
  servo: new THREE.MeshStandardMaterial({ color: '#2c2c2c', roughness: 0.4, metalness: 0.2 }),
  pcb:   new THREE.MeshStandardMaterial({ color: '#3a3a3a', roughness: 0.5, metalness: 0.2 }),
};

function decodeGeometry(bin, m) {
  const q = new Uint16Array(bin, m.offset, m.tris * 9);
  const pos = new Float32Array(q.length);
  const ext = [0, 1, 2].map((i) => (m.max[i] - m.min[i]) / 65535);
  for (let i = 0; i < q.length; i++) { const c = i % 3; pos[i] = m.min[c] + q[i] * ext[c]; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();                                   // non-indexed → flat shading, like the STL
  return g;
}

function applyOrigin(obj, o) {
  if (!o) return;
  const xyz = (o.getAttribute('xyz') || '0 0 0').split(/\s+/).map(Number);
  const rpy = (o.getAttribute('rpy') || '0 0 0').split(/\s+/).map(Number);
  obj.position.set(xyz[0], xyz[1], xyz[2]);
  obj.rotation.set(rpy[0], rpy[1], rpy[2], 'ZYX');            // URDF rpy = fixed-axis roll, pitch, yaw
}

export async function loadRobot(base = `${import.meta.env.BASE_URL}so101`) {
  const [urdf, manifest, bin] = await Promise.all([
    fetch(`${base}/so101.urdf`).then((r) => r.text()),
    fetch(`${base}/meshes.json`).then((r) => r.json()),
    fetch(`${base}/meshes.bin`).then((r) => r.arrayBuffer()),
  ]);
  const geometries = {};
  const geometry = (name) => (geometries[name] ||= decodeGeometry(bin, manifest[name]));

  const doc = new DOMParser().parseFromString(urdf, 'text/xml');
  const links = {}, joints = {};
  doc.querySelectorAll('robot > link').forEach((l) => {
    const g = new THREE.Group(); g.name = l.getAttribute('name'); links[g.name] = g;
    l.querySelectorAll('visual').forEach((v) => {
      const meshEl = v.querySelector('mesh'); if (!meshEl) return;
      const file = meshEl.getAttribute('filename').split('/').pop();
      const mat = /sts3215/.test(file) ? MATERIALS.servo : /waveshare/.test(file) ? MATERIALS.pcb : MATERIALS.pla;
      const mesh = new THREE.Mesh(geometry(file), mat);
      applyOrigin(mesh, v.querySelector('origin'));
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
    });
  });
  doc.querySelectorAll('robot > joint').forEach((j) => {
    const name = j.getAttribute('name');
    const parent = links[j.querySelector('parent').getAttribute('link')];
    const child = links[j.querySelector('child').getAttribute('link')];
    const frame = new THREE.Group(); frame.name = name + '_frame';
    applyOrigin(frame, j.querySelector('origin'));
    parent.add(frame); frame.add(child);
    if (j.getAttribute('type') === 'revolute') {
      const ax = j.querySelector('axis').getAttribute('xyz').split(/\s+/).map(Number);
      const lim = j.querySelector('limit');
      joints[name] = { node: child, axis: new THREE.Vector3(...ax).normalize(), lower: +lim.getAttribute('lower'), upper: +lim.getAttribute('upper'), q: 0 };
    }
  });
  return { root: links.base_link, links, joints };
}

export const setJoint = (j, v) => {
  j.q = THREE.MathUtils.clamp(v, j.lower, j.upper);
  j.node.quaternion.setFromAxisAngle(j.axis, j.q);
};
