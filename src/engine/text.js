// The painted copy: every word element is a body with a spring back to its home, rasterised into a mask
// texture (r = coverage, g = relief) that the pane shader turns into enamel. The arm's fingertip shoves them.
// Only the copy on the bare pane is painted: anything resting on a liquid-glass slab (the sign-up, the sponsor
// logos) is ordinary DOM, drawn clean on top of the glass.

export function createText({ letters: sel = '.sub i, .desc i', links: linkSel = '' }) {
  const bodies = [];
  const mk = (el, extra) => ({ el, x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, cx: 0, cy: 0, hw: 0, hh: 0, hit: 0, font: '', ls: 0, text: el.textContent, hover: 0, ...extra });
  for (const el of document.querySelectorAll(sel)) bodies.push(mk(el));
  if (linkSel) for (const el of document.querySelectorAll(linkSel)) bodies.push(mk(el, { noIdle: true }));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let dirty = true;

  function measure() {
    for (const L of bodies) {
      const t = L.el.style.transform; L.el.style.transform = '';
      const b = L.el.getBoundingClientRect();
      L.cx = b.left + b.width / 2; L.cy = b.top + b.height / 2; L.hw = b.width / 2; L.hh = b.height / 2;
      L.el.style.transform = t;
    }
    dirty = true;
  }
  function fonts() {
    for (const L of bodies) {
      const cs = getComputedStyle(L.el);
      L.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      L.ls = parseFloat(cs.letterSpacing) || 0;
      L.text = cs.textTransform === 'uppercase' ? L.el.textContent.toUpperCase() : L.el.textContent;
      L.small = parseFloat(cs.fontSize) < 17;                 // thin, flat paint below this size keeps small type crisp
    }
    dirty = true;
  }
  function draw(dpr) {
    const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (const L of bodies) {
      if (!L.font || L.hw === 0) continue;                    // hidden at this width
      ctx.save();
      ctx.translate(L.cx + L.x, L.cy + L.y);
      if (L.r) ctx.rotate(L.r);
      ctx.font = L.font;
      ctx.fillStyle = L.small ? '#f00' : '#ff0';            // r = coverage, g = relief
      let x = -L.hw;
      for (const ch of L.text) { ctx.fillText(ch, x, 0); x += ctx.measureText(ch).width + L.ls; }
      ctx.restore();
    }
    dirty = false;
  }

  // push words that are under the fingertip while it's close to the pane; spring everything home
  function step(dt, tipS, contact) {
    const reach = 22 + 40 * contact;
    for (const L of bodies) {
      const lx = L.cx + L.x, ly = L.cy + L.y;
      const ox = lx - tipS.x, oy = ly - tipS.y;
      const rad = Math.max(L.hw, L.hh) * 0.9 + reach;
      const dist = Math.hypot(ox, oy);
      if (contact > 0.02 && dist < rad) {
        const push = (1 - dist / rad) * contact * 1600 * dt;
        const nx = dist > 1e-3 ? ox / dist : 1, ny = dist > 1e-3 ? oy / dist : 0;
        L.vx += nx * push; L.vy += ny * push;
        L.vr += (nx * oy - ny * ox) / rad * push * 0.02;
        L.hit = 1;
      }
      const k = 110, c = 11;
      L.vx += (-k * L.x - c * L.vx) * dt; L.vy += (-k * L.y - c * L.vy) * dt; L.vr += (-k * L.r - c * L.vr) * dt;
      L.x += L.vx * dt; L.y += L.vy * dt; L.r += L.vr * dt;
      L.hit = Math.max(0, L.hit - dt * 1.6);
      if (Math.abs(L.x) + Math.abs(L.y) + Math.abs(L.r) > 0.02) {
        L.el.style.transform = `translate(${L.x.toFixed(2)}px,${L.y.toFixed(2)}px) rotate(${(L.r * 57.3).toFixed(2)}deg)`;
        dirty = true;
      } else if (L.el.style.transform) { L.el.style.transform = ''; dirty = true; }
    }
  }
  function pickIdle() {
    const vis = bodies.filter((L) => !L.noIdle && L.cy > 0 && L.cy < innerHeight && L.cx > 0 && L.cx < innerWidth);
    return vis.length ? vis[Math.floor(Math.random() * vis.length)] : null;
  }

  measure(); fonts();
  return { bodies, canvas, measure, fonts, draw, step, pickIdle, get dirty() { return dirty; }, set dirty(v) { dirty = v; } };
}
