// A liquid-glass slab, written from scratch (GLSL ES 3.0 / WebGL2).
//
// The model is a thick, clear slab of glass (n = 1.5) floating a few pixels above the pane, polished on top and
// finely ground underneath, lit the way glass is lit on a product table. Its footprint is a rectangle with
// continuous-curvature corners (superellipse arcs, exponent 3: the curvature ramps in from the straight edge rather
// than jumping, Apple's continuous corner; exponent 2 would be a plain circular fillet); its cross-section is a flat top whose rim is cut like beveled
// glass: a round-over of width zR (flatter on top and tighter at the rim for higher profile values) that ends in a
// narrow 45-degree bevel, then a vertical wall. Nothing on top is steeper than 45 degrees, so the outermost visible
// surface still faces the lights and the bright line runs right to the edge.
//
// Per pixel, for a viewer looking straight in:
//   - the view ray refracts at the top surface (Snell), crosses the glass, leaves through the bottom and crosses the
//     air gap to the pane. Near the rim the bend is steep, so the pixel shows pane content from well inside the
//     outline: the lensing that defines the edge. Under the flat top it shows what is straight behind.
//   - the polished top mirrors the room with Fresnel weight, 4% face on and about the same on the bevel. Two long
//     strip lights, one just above the top edge of the screen and a weaker one below, are what the bevel catches
//     as a thin bright line along each edge that faces them, top-left and bottom-right.
//   - the ground underside scatters: it blurs what shows through and sends a little of the light that entered from
//     above back toward the viewer, which is the frost. Being matte, it reflects no light source, so there is
//     one line per edge, not the double reflection a polished bottom would give.
//   - interaction: a small soft light hovers over the pointer while it is on the slab. The flat top mirrors it as a
//     glow under the pointer (bending outward where the round-over tilts) and the pane beneath is lit through the
//     glass more broadly; the frost brightens with hover and press, and on press the slab swells a little on a
//     spring (that part is in the engine, which grows the rect).
// Radiance is conserved along the refracted ray (a diffuse pane looks equally bright from every angle), so the lens
// neither brightens nor darkens the image; all the light in the rim comes from the top surface.
//
// Coordinates are pixels with y UP, panel-centred. Shared by the pane shader and the comparison page.
export const LG_GLSL = /* glsl */ `
struct LGSurf {
  float sdf;     // signed distance to the outline in px, negative inside
  float mask;    // anti-aliased coverage
  vec3  N;       // top-surface normal, z toward the viewer
  vec2  refrPx;  // where the transmitted ray meets the pane, as a px offset from this pixel
  float fTop;    // Fresnel reflectance of the top surface for the view ray
  vec3  R;       // the view ray mirrored by the top surface
  vec2  strips;  // the two strip lights as mirrored by the top surface, Fresnel-weighted, averaged over the pixel
};

// rounded rectangle with superellipse corners (|x|^n + |y|^n = r^n): n = 2 is a circle, so a capsule when r is the
// half-height; n around 2.8 is the continuous corner whose curvature ramps in from the straight edge.
float lgSDF(vec2 p, vec2 b, float r, float n){
  r = min(r, min(b.x, b.y));
  vec2 q = abs(p) - (b - vec2(r));
  if (q.x > 0.0 && q.y > 0.0) {
    float len = length(q);
    vec2 u = q / max(len, 1e-6);
    float rho = r / pow(pow(u.x, n) + pow(u.y, n), 1.0/n);
    return len - rho;
  }
  return max(q.x, q.y) - r;
}

// the rim profile, d px inside the outline: height above the wall and slope dz/dd. A superellipse round-over
// (k = 2 is a quarter circle; larger k keeps the top flatter and bends closer to the rim) whose slope is capped at
// 1: past that point the edge is a plain 45-degree bevel down to the wall.
vec2 lgFillet(float d, float zR, float k){
  if (d >= zR) return vec2(zR, 0.0);
  float u = 1.0 - max(d, 0.0)/zR;                           // 1 at the rim, 0 where the top goes flat
  float uk = pow(u, k);
  float z = zR*pow(max(1.0 - uk, 0.0), 1.0/k);
  float slope = pow(u, k - 1.0)*pow(max(1.0 - uk, 1e-6), 1.0/k - 1.0);
  return vec2(z, min(slope, 1.0));
}

// the surface normal for a fillet slope, g being the outline's outward direction
vec3 lgNormal(vec2 g, float slope){ float c = inversesqrt(1.0 + slope*slope); return vec3(g*slope*c, c); }

float lgFresnel(float cosT, float f0){ float m = 1.0 - clamp(cosT, 0.0, 1.0); float m2 = m*m; return f0 + (1.0 - f0)*m2*m2*m; }

// the two strip lights, seen in direction r: a long soft light just off the top edge of the screen and one just
// off the bottom, each a few degrees in front of the screen plane, so the 45-degree bevel mirrors them squarely and
// the round-over next to it catches their edge. Nothing comes from behind the screen.
vec2 lgStrips(vec3 r){
  float up = atan(r.z, r.y), dn = atan(r.z, -r.y);
  float top = exp(-pow((up - 0.10)/0.30, 2.0))*exp(-pow((r.x + 0.25)/0.8, 2.0));
  float bot = exp(-pow((dn - 0.10)/0.30, 2.0))*exp(-pow((r.x - 0.20)/0.8, 2.0));
  return vec2(top, bot)*step(0.0, r.z);
}

// optics = (index of refraction, wall px, gap px, fillet exponent)
LGSurf lgSurface(vec2 p, vec2 b, float r, float zR, float cornerN, vec4 optics){
  LGSurf s;
  float ior = optics.x, wall = optics.y, gap = optics.z, k = optics.w;
  s.sdf = lgSDF(p, b, r, cornerN);
  s.mask = 1.0 - smoothstep(-0.75, 0.75, s.sdf);
  float d = -s.sdf;
  // the outline's outward direction, from the distance field
  float e = 1.0;
  vec2 g = vec2(lgSDF(p + vec2(e, 0.0), b, r, cornerN) - lgSDF(p - vec2(e, 0.0), b, r, cornerN),
                lgSDF(p + vec2(0.0, e), b, r, cornerN) - lgSDF(p - vec2(0.0, e), b, r, cornerN));
  g /= max(length(g), 1e-6);
  vec2 fz = lgFillet(d, zR, k);
  s.N = lgNormal(g, fz.y);
  float H = wall + fz.x;                                     // glass under this point
  vec3 I = vec3(0.0, 0.0, -1.0);
  float f0 = (ior - 1.0)/(ior + 1.0); f0 *= f0;
  s.fTop = lgFresnel(s.N.z, f0);
  // in through the top, down through the glass, out of the flat bottom, across the gap
  vec3 T = refract(I, s.N, 1.0/ior);
  vec2 walk = T.xy*(H/max(-T.z, 1e-3));
  vec3 T2 = refract(T, vec3(0.0, 0.0, 1.0), ior);
  bool tir = dot(T2, T2) < 1e-6;
  vec2 shift = walk + (tir ? vec2(0.0) : T2.xy*(gap/max(-T2.z, 0.02)));
  float maxShift = max(min(b.x, b.y) - zR, 2.0);           // the sample stays under the flat top
  float L = length(shift); if (L > maxShift) shift *= maxShift/L;
  s.refrPx = shift;
  // the top surface as a mirror (never steeper than 45 degrees, so it always looks out into the room)
  s.R = I + 2.0*s.N.z*s.N;
  // the strip lights in that mirror, taken at three points across the pixel: the line they draw is thinner
  // than a pixel where the round-over turns quickly
  s.strips = vec2(0.0);
  for (int i = 0; i < 3; i++) {
    vec2 f2 = lgFillet(d + (float(i) - 1.0)*0.4, zR, k);
    vec3 N2 = lgNormal(g, f2.y);
    s.strips += lgFresnel(N2.z, f0)*lgStrips(I + 2.0*N2.z*N2);
  }
  s.strips /= 3.0;
  return s;
}

// the room as the pane sees it: bright overhead, a dark floor, a tall soft window off to the upper left
vec3 lgRoom(vec3 r){
  vec3 top = vec3(0.98), mid = vec3(0.78), bot = vec3(0.30);
  vec3 c = r.y > 0.0 ? mix(mid, top, pow(r.y, 0.6)) : mix(mid, bot, pow(-r.y, 0.8));
  vec2 w = vec2(r.x + 0.55, r.y - 0.35);
  float win = smoothstep(0.42, 0.0, length(w*vec2(1.0, 0.6)));
  return c + vec3(1.0)*win*0.9;
}

// the pointer light: state = (pointer x, pointer y, hover, press) in slab px; it sits about one glow radius above
// the glass. Returns the light mirrored in the top face plus the wash it throws on the pane through the glass.
float lgTouch(LGSurf s, vec2 p, vec2 b, vec4 state, float glow){
  float on = state.z*(1.0 + state.w);
  if (on <= 0.001 || glow <= 0.0) return 0.0;
  float gr = 0.9*min(b.x, b.y);
  vec2 hit = p + s.R.xy*(gr/max(s.R.z, 0.05));            // where the mirrored view ray reaches the light's height
  float d = length(hit - state.xy)/gr;
  float dd = length(p - state.xy)/(2.2*gr);
  return on*glow*(s.fTop*exp(-d*d) + 0.012*exp(-dd*dd));
}

// seen: the pane where the transmitted ray meets it. lift: the frost. key, fill: the radiance of the strip lights.
// state, glow: the pointer light (see lgTouch).
vec3 lgShade(LGSurf s, vec2 p, vec2 b, vec4 state, vec3 seen, float lift, float key, float fill, float glow){
  vec3 body = mix(seen, vec3(1.0), lift);
  return s.fTop*lgRoom(s.R) + (1.0 - s.fTop)*body + vec3(key*s.strips.x + fill*s.strips.y + lgTouch(s, p, b, state, glow));
}

// the slab's shadow on the pane around it: the outline blurred (a Gaussian penumbra of width spread), dropped by offY
float lgShadow(vec2 p, vec2 b, float r, float n, float alpha, float spread, float offY){
  float sd = lgSDF(p + vec2(0.0, offY), b, r, n);
  return alpha/(1.0 + exp(max(sd, 0.0)*1.7/max(spread, 1.0)));
}
`;

// One set of numbers for every slab on the site (sizes come from the layout; px values are CSS px).
export const LG_PARAMS = {
  ior: 1.5,         // crown glass
  wall: 3,          // straight side wall under the fillet: the slab's thickness at the rim
  gap: 8,           // how far the slab floats above the pane; this is what turns the rim's bend into lensing
  profile: 5.0,     // round-over cross-section: 2 = quarter circle, higher = flatter top and a tighter bend at the rim
  lift: 0.16,       // frost: how much the slab whitens what shows through it
  blur: 1.5,        // frost: extra scatter inside the slab, 0..2 across the pane's blur levels (1 = 30 px, 2 = 62 px)
  key: 60,          // radiance of the strip light above the screen (light sources are far brighter than the pane)
  fill: 18,         // and of the one below it
  shadowOpacity: 0.09, shadowSpread: 16, shadowOffsetY: 5,
  corner: 3.0,      // corner curve exponent: 3 is a continuous-curvature (G2) corner, 2 a circular one
  // interaction, the way Apple's interactive glass behaves: it lights up under the pointer, brightens on hover,
  // and on press it brightens more and swells slightly on a spring
  touchGlow: 6.0,   // radiance of the small light that hovers over the pointer
  hoverLift: 0.06,  // extra frost while hovered (buttons)
  pressLift: 0.10,  // extra frost while pressed (buttons)
  pressGrow: 0.035, // how much the slab swells when pressed (buttons)
};
