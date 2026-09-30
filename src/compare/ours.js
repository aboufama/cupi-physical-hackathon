import { LG_GLSL } from '../engine/shaders/liquidGlass.glsl.js';

// A small standalone WebGL2 shell around our slab shader: one background image, a blurred copy made the
// same way the library makes its own (9-tap gaussian, 6 passes, spread = blur * 2.5), and a full-screen
// pass that draws the slabs wherever the DOM's .glass elements sit. No tone mapping here, so the rim
// highlights simply clip to white.

const VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const BLUR_FS = `#version 300 es
precision mediump float; uniform sampler2D uTex; uniform vec2 uDir; in vec2 vUv; out vec4 o;
void main(){
  vec4 s = texture(uTex, vUv)*0.227027;
  s += (texture(uTex, vUv + uDir) + texture(uTex, vUv - uDir))*0.194594;
  s += (texture(uTex, vUv + uDir*2.0) + texture(uTex, vUv - uDir*2.0))*0.121622;
  s += (texture(uTex, vUv + uDir*3.0) + texture(uTex, vUv - uDir*3.0))*0.054054;
  s += (texture(uTex, vUv + uDir*4.0) + texture(uTex, vUv - uDir*4.0))*0.016216;
  o = s;
}`;

const GLASS_FS = `#version 300 es
precision highp float;
uniform sampler2D uBg, uBlur; uniform vec2 uRes; uniform int uCount;
uniform vec4 uRect[4]; uniform vec4 uParam[4]; uniform vec4 uLG1, uLG2, uLG3;
const vec4 NO_TOUCH = vec4(0.0);
out vec4 o;
${LG_GLSL}
void main(){
  vec2 pp = gl_FragCoord.xy; vec2 uv = pp/uRes; vec2 px = 1.0/uRes;
  vec3 col = texture(uBg, uv).rgb;
  int hit = -1; float hitSdf = 1e9;
  for (int i = 0; i < 4; i++) {
    if (i >= uCount) break;
    float sd = lgSDF(pp - uRect[i].xy, uRect[i].zw, uParam[i].x, uParam[i].z);
    if (sd < hitSdf) { hitSdf = sd; hit = i; }
  }
  if (hit >= 0 && hitSdf > 0.0) {
    float shadow = 0.0;
    for (int i = 0; i < 4; i++) { if (i >= uCount) break; shadow += lgShadow(pp - uRect[i].xy, uRect[i].zw, uParam[i].x, uParam[i].z, uLG3.x, uLG3.y, uLG3.z); }
    col *= 1.0 - min(shadow, 1.0);
  }
  if (hit >= 0 && hitSdf < 1.0) {
    vec4 rc = uRect[hit]; vec4 pr = uParam[hit];
    LGSurf s = lgSurface(pp - rc.xy, rc.zw, pr.x, pr.y, pr.z, uLG1);
    vec2 uvR = uv + s.refrPx*px;
    vec3 seen = mix(texture(uBg, uvR).rgb, texture(uBlur, uvR).rgb, min(uLG2.y, 1.0));
    vec3 glass = lgShade(s, pp - rc.xy, rc.zw, NO_TOUCH, seen, uLG2.x + pr.w, uLG2.z, uLG2.w, 0.0);
    col = mix(col, glass, s.mask);
  }
  o = vec4(col, 1.0);
}`;

function program(gl, vs, fs) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
function texture(gl, w, h, src) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (src) { gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); }
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  return t;
}

export function mountOurs(root, canvas, cfg, shapes) {
  const gl = canvas.getContext('webgl2', { antialias: false });
  if (!gl) { canvas.replaceWith(Object.assign(document.createElement('p'), { textContent: 'WebGL2 is needed for this side.' })); return () => {}; }
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const blurP = program(gl, VS, BLUR_FS), glassP = program(gl, VS, GLASS_FS);
  const draw = (p) => { const loc = gl.getAttribLocation(p, 'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  const U = (p, n) => gl.getUniformLocation(p, n);

  let bgTex = null, blurTex = null, fbos = null, disposed = false;
  const img = new Image(); img.src = `${import.meta.env.BASE_URL}compare/bg.png`;

  function render() {
    if (disposed || !img.complete || !img.naturalWidth) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const rr = root.getBoundingClientRect();
    const W = Math.round(rr.width * dpr), H = Math.round(rr.height * dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
      if (bgTex) { gl.deleteTexture(bgTex); fbos.forEach((f) => { gl.deleteFramebuffer(f.fbo); gl.deleteTexture(f.tex); }); }
      bgTex = texture(gl, 0, 0, img);
      fbos = [0, 1].map(() => { const tex = texture(gl, W, H); const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); return { fbo, tex }; });
      // blurred copy, made the library's way
      gl.viewport(0, 0, W, H); gl.useProgram(blurP); gl.uniform1i(U(blurP, 'uTex'), 0); gl.activeTexture(gl.TEXTURE0);
      let from = bgTex; const spread = Math.min(cfg.blur, 2) * 2.5;
      for (let i = 0; i < (cfg.blur > 0 ? 6 : 1); i++) {
        for (const [dx, dy, k] of [[spread / W, 0, 0], [0, spread / H, 1]]) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[k].fbo); gl.bindTexture(gl.TEXTURE_2D, from);
          gl.uniform2f(U(blurP, 'uDir'), cfg.blur > 0 ? dx : 0, cfg.blur > 0 ? dy : 0); draw(blurP); from = fbos[k].tex;
        }
      }
      blurTex = from;
    }
    // slabs from the DOM
    const rects = [], params = [];
    for (const el of root.querySelectorAll('.glass')) {
      const r = el.getBoundingClientRect(), sh = shapes[el.dataset.kind];
      const hw = r.width / 2, hh = r.height / 2;
      rects.push((r.left - rr.left + hw) * dpr, (rr.height - (r.top - rr.top + hh)) * dpr, hw * dpr, hh * dpr);
      params.push(Math.min(sh.cornerRadius, hh) * dpr, sh.zRadius * dpr, sh.cornerN ?? cfg.corner, 0);
    }
    while (rects.length < 16) { rects.push(0); params.push(0); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.useProgram(glassP);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bgTex); gl.uniform1i(U(glassP, 'uBg'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, blurTex); gl.uniform1i(U(glassP, 'uBlur'), 1);
    gl.uniform2f(U(glassP, 'uRes'), W, H);
    gl.uniform1i(U(glassP, 'uCount'), Math.min(4, root.querySelectorAll('.glass').length));
    gl.uniform4fv(U(glassP, 'uRect'), rects); gl.uniform4fv(U(glassP, 'uParam'), params);
    gl.uniform4f(U(glassP, 'uLG1'), cfg.ior, cfg.wall * dpr, cfg.gap * dpr, cfg.profile);
    gl.uniform4f(U(glassP, 'uLG2'), cfg.lift, cfg.blur, cfg.key, cfg.fill);
    gl.uniform4f(U(glassP, 'uLG3'), cfg.shadowOpacity, cfg.shadowSpread * dpr, cfg.shadowOffsetY * dpr, 0);
    draw(glassP);
  }
  img.onload = render;
  const ro = new ResizeObserver(render); ro.observe(root);
  document.fonts?.ready.then(render);
  return () => { disposed = true; ro.disconnect(); };
}
