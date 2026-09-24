// liquidglass.glsl.js — a liquid-glass slab, written from scratch (GLSL ES 3.0 / WebGL2).
//
// The model: a rounded-rect slab with a pill cross-section. A half circle of radius zR stands on
// the outline, so the surface is steep at the rim and flat once you're zR inside. The surface
// normal comes from that height field; light entering and leaving the slab bends at both faces,
// which pulls the image behind the rim toward the centre (the lens look). On top of the refracted
// image: dispersion, Fresnel whitening, Blinn-Phong glints, a hairline inner stroke, rim light, an
// inner glow, and a soft two-term drop shadow outside the slab.
//
// Coordinates are pixels with y UP, panel-centred. Shared by index.html and compare.html.
window.LG_GLSL = `
struct LGSurf { float sdf; float mask; float edge; float depth; vec3 N; vec2 refrPx; vec2 caPx; };

float lgSDF(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + vec2(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - r;
}

// height of the slab's top face, as a function of distance inside the outline
float lgHeight(float inside, float zR){
  if (inside <= 0.0) return 0.0;
  if (inside >= zR) return zR;
  return sqrt(inside*(2.0*zR - inside));
}

LGSurf lgSurface(vec2 p, vec2 b, float r, float zR, float refract, float chroma, float bevelMode){
  LGSurf s;
  r = min(r, min(b.x, b.y));
  s.sdf = lgSDF(p, b, r);
  s.mask = 1.0 - smoothstep(-1.5, 0.5, s.sdf);
  float inside = -s.sdf;
  float maxD = min(b.x, b.y);
  s.edge = smoothstep(maxD*0.35, 0.0, inside);           // 1 at the rim, 0 well inside
  // normal from the height field, by central differences two pixels apart
  float e = 2.0;
  float hC = lgHeight(inside, zR);
  float hR = lgHeight(-lgSDF(p + vec2(e, 0.0), b, r), zR), hL = lgHeight(-lgSDF(p - vec2(e, 0.0), b, r), zR);
  float hU = lgHeight(-lgSDF(p + vec2(0.0, e), b, r), zR), hD = lgHeight(-lgSDF(p - vec2(0.0, e), b, r), zR);
  vec2 hGrad = vec2(hR - hL, hU - hD) / (2.0*e);
  s.N = normalize(vec3(-hGrad, 1.0));
  s.depth = smoothstep(0.0, zR, inside);
  // refraction: glass at n = 1.5 bends the ray at the top face and again at the bottom face,
  // and the thicker the slab where the ray passes, the further it walks sideways in between
  float bend = 1.0 - 1.0/1.5;
  float thick = (hC*2.0) / max(zR*2.0, 1.0);
  if (bevelMode < 0.5) {
    vec2 face = hGrad*bend;
    s.refrPx = (face*2.0 + face*thick*0.5)*refract*30.0;
    s.refrPx += (-p / max(b, vec2(1.0)))*refract*4.0*s.depth;     // the slab as a whole acts as a weak lens
  } else {
    s.refrPx = -p*refract*s.depth*0.35;                             // dome: plain magnification toward the centre
  }
  // dispersion: red and blue leave the rim on slightly different paths
  s.caPx = s.N.xy * chroma*18.0*(s.edge*0.7 + 0.3)*2.0;
  return s;
}

// shade the (already refracted) background seen through the slab. Lights sit up-left / low-right.
vec3 lgShade(vec3 col, LGSurf s, vec2 p, vec2 b, float edgeHL, float spec, float fresnel, float brightness, float sat, float tint){
  col *= 1.0 + brightness;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.0 + sat);
  col = mix(col, col*vec3(0.92, 0.95, 1.05), tint);
  col *= 1.0 + 0.06*s.depth;
  vec3 N = s.N;
  float fres = pow(1.0 - abs(N.z), 4.0)*fresnel;
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H1 = normalize(normalize(vec3( 0.4, -0.7, 1.0)) + V); float sp1 = pow(max(dot(N, H1), 0.0), 90.0);
  vec3 H2 = normalize(normalize(vec3(-0.3,  0.5, 1.0)) + V); float sp2 = pow(max(dot(N, H2), 0.0), 50.0)*0.3;
  float spB = pow(max(dot(N, normalize(vec3(0.1, -0.3, 1.0))), 0.0), 6.0)*0.1;
  vec3 H4 = normalize(normalize(vec3( 0.0, -0.9, 0.4)) + V); float sp4 = pow(max(dot(N, H4), 0.0), 120.0)*0.6;
  float glint = (sp1 + sp2 + spB + sp4)*spec;
  // hairline stroke just inside the outline, brighter along the top edge
  float bw = 1.5;
  float stroke = smoothstep(-bw - 1.0, -bw, s.sdf)*(1.0 - smoothstep(-1.0, 0.0, s.sdf));
  stroke *= 0.4 + 0.6*(0.5 + 0.5*(p.y/b.y));
  float rim  = s.edge*edgeHL*0.22;
  float glow = smoothstep(5.0, 0.0, -s.sdf)*edgeHL*0.15;
  float env  = (-N.y*0.5 + 0.5)*fres*0.08;                   // a bright room above, reflected in the rim
  vec3 fin = col + glint + rim + glow + stroke*edgeHL*0.55 + env;
  return mix(fin, vec3(1.0), fres*0.2);
}

// darkening outside the slab: a wide soft shadow plus a tight contact shadow, dropped by offY
float lgShadow(vec2 p, vec2 b, float r, float alpha, float spread, float offY){
  r = min(r, min(b.x, b.y));
  float sd = lgSDF(p + vec2(0.0, offY), b, r);
  float d = max(sd - 1.0, 0.0);
  spread = max(spread, 1.0);
  float outer   = exp(-d*d/(spread*spread))*0.65;
  float contact = exp(-d*0.08/max(spread*0.04, 0.01))*0.35;
  return (outer + contact)*alpha;
}
`;

// the reference library's defaults, plus the values this site uses
window.LG_DEFAULTS = {
  refraction: 0.69, chromAberration: 0.05, edgeHighlight: 0.05, specular: 0.0, fresnel: 1.0,
  blurAmount: 0.0, brightness: 0.0, saturation: 0.0, tintStrength: 0.0,
  shadowOpacity: 0.30, shadowSpread: 10, shadowOffsetY: 1, cornerRadius: 65, zRadius: 40, bevelMode: 0,
};
