import * as THREE from 'three';
import { setJoint } from './robot.js';

// Damped-least-squares IK over the arm's five revolute joints, with an analytic Jacobian.
// Position (3 dof) and aim direction (2 dof) are solved together; damping rises near singularities,
// a weak pull toward a rest posture keeps the elbow from flipping, and wrist_roll (which can't move
// the tip) mostly rests. The caller rate-limits the shown joints, so the arm never snaps.
//
// Posture bounds, tighter than the servo limits in the URDF (which let the forearm fold flat onto the upper arm
// and the elbow lock straight): the arm only reaches forward toward the pane, the elbow stays between about
// 55 and 170 degrees, the wrist within about 75 degrees of straight. Conventions, from the URDF as the engine
// mounts it: shoulder_lift < 0 pitches forward, elbow_flex > 0 closes the elbow (+1.69 is the fold).
const BOUNDS = {
  shoulder_pan: [-1.5, 1.5], shoulder_lift: [-1.6, 0.15], elbow_flex: [-1.1, 0.95], wrist_flex: [-1.3, 1.3], wrist_roll: [-1.0, 1.0],
};
export function createIK({ robot, armRoot, tip, wristNode, floorY = -Infinity }) {
  const J = robot.joints;
  const NAMES = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll'];
  const CHAIN = NAMES.map((n) => J[n]);
  const N = CHAIN.length;
  const LO = CHAIN.map((j, i) => Math.max(j.lower, BOUNDS[NAMES[i]][0])), HI = CHAIN.map((j, i) => Math.min(j.upper, BOUNDS[NAMES[i]][1]));
  const qS = CHAIN.map(() => 0);                               // joint angles actually shown (rate-limited)
  const qT = CHAIN.map(() => 0);                               // IK solution, warm-started every frame
  const Q_REST = [0, -0.5, 0.45, 0.25, 0];                     // posture the nullspace relaxes toward: reaching forward, elbow open
  const W_REST = [0.02, 0.03, 0.03, 0.02, 0.4];
  const Q_VEL = [3.5, 3.0, 3.2, 4.0, 4.0];                     // rad/s, roughly STS3215 under load
  const DIR_W = 0.35;                                          // aim (2 dof) vs position (3 dof)
  const _v = new THREE.Vector3(), _ax = new THREE.Vector3(), _o = new THREE.Vector3(), _tp = new THREE.Vector3(), _dir = new THREE.Vector3();
  const shoulderW = new THREE.Vector3();
  let dirSign = 1, REACH = 1;

  // forward kinematics + analytic Jacobian: for a revolute joint, ∂tip/∂q = a × (tip − o), ∂dir/∂q = a × dir
  const Jm = Array.from({ length: 6 }, () => new Array(N).fill(0));
  const f0 = new Array(6);
  function fk(qs) {
    CHAIN.forEach((j, i) => setJoint(j, qs[i]));
    armRoot.updateMatrixWorld(true);
    tip.getWorldPosition(_tp);
    _dir.set(0, 0, dirSign).transformDirection(tip.matrixWorld);   // gripper axis, pointing out of the jaws
    f0[0] = _tp.x; f0[1] = _tp.y; f0[2] = _tp.z; f0[3] = _dir.x; f0[4] = _dir.y; f0[5] = _dir.z;
    for (let i = 0; i < N; i++) {
      const j = CHAIN[i];
      _ax.copy(j.axis).transformDirection(j.node.parent.matrixWorld);
      j.node.parent.getWorldPosition(_o);
      _v.subVectors(_tp, _o); _v.crossVectors(_ax, _v);
      Jm[0][i] = _v.x; Jm[1][i] = _v.y; Jm[2][i] = _v.z;
      _v.crossVectors(_ax, _dir);
      Jm[3][i] = _v.x * DIR_W; Jm[4][i] = _v.y * DIR_W; Jm[5][i] = _v.z * DIR_W;
    }
  }
  // calibrate once: which way the gripper frame points, where the shoulder is, how far it can reach
  fk(qT);
  { const w = new THREE.Vector3(); wristNode.getWorldPosition(w); if (_dir.dot(_v.subVectors(_tp, w)) < 0) dirSign = -1; }
  J.shoulder_lift.node.parent.getWorldPosition(shoulderW);
  { let r = 0; const prev = shoulderW.clone(), p = new THREE.Vector3();
    for (const n of ['elbow_flex', 'wrist_flex', 'wrist_roll']) { J[n].node.parent.getWorldPosition(p); r += p.distanceTo(prev); prev.copy(p); }
    r += _tp.distanceTo(prev); REACH = r * 0.88; }                           // short of full stretch, so the elbow keeps a bend

  // (JᵀJ + λ²I + W) dq = Jᵀe + W (q_rest − q), with λ growing as the arm approaches a singularity
  function solveN(A, b) {
    const M = A.map((row, i) => [...row, b[i]]); let det = 1;
    for (let c = 0; c < N; c++) {
      let p = c; for (let r = c + 1; r < N; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (p !== c) { [M[c], M[p]] = [M[p], M[c]]; det = -det; }
      det *= M[c][c];
      for (let r = c + 1; r < N; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= N; k++) M[r][k] -= f * M[c][k]; }
    }
    const x = new Array(N);
    for (let r = N - 1; r >= 0; r--) { let sum = M[r][N]; for (let k = r + 1; k < N; k++) sum -= M[r][k] * x[k]; x[r] = sum / M[r][r]; }
    return { x, det };
  }
  const A = Array.from({ length: N }, () => new Array(N)), bvec = new Array(N), e = new Array(6), want = new Array(6);
  function iterate(iterations) {
    for (let it = 0; it < iterations; it++) {
      fk(qT);
      for (let r = 0; r < 6; r++) e[r] = (want[r] - f0[r]) * (r < 3 ? 1 : DIR_W);
      for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) { let sum = 0; for (let r = 0; r < 6; r++) sum += Jm[r][i] * Jm[r][k]; A[i][k] = sum; }
      const manip = Math.sqrt(Math.max(solveN(A, new Array(N).fill(0)).det, 0));
      const lambda2 = 0.004 + 0.25 * Math.pow(1 - Math.min(manip / 0.05, 1), 2);
      for (let i = 0; i < N; i++) {
        A[i][i] += lambda2 + W_REST[i];
        let sum = 0; for (let r = 0; r < 6; r++) sum += Jm[r][i] * e[r];
        bvec[i] = sum + W_REST[i] * (Q_REST[i] - qT[i]);
      }
      const dq = solveN(A, bvec).x;
      let done = true;
      for (let i = 0; i < N; i++) {
        const step = THREE.MathUtils.clamp(dq[i], -0.25, 0.25);
        qT[i] = THREE.MathUtils.clamp(qT[i] + step, LO[i], HI[i]);
        if (Math.abs(step) > 1e-4) done = false;
      }
      if (done) break;
    }
    fk(qT);
    return Math.hypot(want[0] - f0[0], want[1] - f0[1], want[2] - f0[2]);
  }
  const qKeep = new Array(N);
  function solve(tipTarget, aim, iterations = 8) {
    want[0] = tipTarget.x; want[1] = tipTarget.y; want[2] = tipTarget.z; want[3] = aim.x; want[4] = aim.y; want[5] = aim.z;
    const err = iterate(iterations);
    // a warm start can leave the arm wedged against its bounds far from the target; then try again from rest and
    // keep whichever solution lands closer
    if (err > 0.12) {
      for (let i = 0; i < N; i++) { qKeep[i] = qT[i]; qT[i] = Q_REST[i]; }
      const err2 = iterate(iterations + 6);
      if (err2 > err) for (let i = 0; i < N; i++) qT[i] = qKeep[i];
    }
  }

  // where the tip should be so that the gripper, pointing from the shoulder, aims at a point on the sheet
  const P = new THREE.Vector3(), aim = new THREE.Vector3(), tipT = new THREE.Vector3();
  function aimAt(sheetX, sheetY, depth, touchZ) {
    P.set(sheetX, sheetY, 0);
    aim.subVectors(P, shoulderW).normalize();
    const along = Math.max(-depth, 0.02) / Math.max(aim.z, 0.25);       // pull back along the aim line to sit `depth` behind the pane
    tipT.copy(P).addScaledVector(aim, -along);
    const d = tipT.distanceTo(shoulderW);                                // stay inside the workspace, aim unchanged
    if (d > REACH) tipT.lerpVectors(shoulderW, tipT, REACH / d);
    if (tipT.z > touchZ) tipT.z = touchZ;
    if (tipT.y < floorY) tipT.y = floorY;                                // never dive below the bench; hover over it instead
  }

  // servo-like motion: each joint moves toward the solution at a bounded rate
  function step(dt) {
    for (let i = 0; i < N; i++) {
      const diff = qT[i] - qS[i];
      const maxStep = Q_VEL[i] * dt;
      qS[i] += THREE.MathUtils.clamp(diff * (1 - Math.exp(-dt * 14)), -maxStep, maxStep);
    }
    CHAIN.forEach((j, i) => setJoint(j, qS[i]));
  }

  return { aimAt, solve, step, aim, tipT, joints: J };
}
