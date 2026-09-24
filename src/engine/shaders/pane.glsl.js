import { LG_GLSL } from './liquidGlass.glsl.js';

export const QUAD_VS = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// separable gaussian, run a few times at reduced resolution: the scatter of the frosted surface
export const BLUR_FS = /* glsl */ `
  precision highp float; varying vec2 vUv; uniform sampler2D tex; uniform vec2 dir;
  vec3 safe(vec3 c){ return any(isnan(c)) || any(isinf(c)) ? vec3(0.8) : c; }   // never let a bad pixel spread
  void main(){
    vec3 c = safe(texture2D(tex, vUv).rgb)*0.2270270270;
    c += (safe(texture2D(tex, vUv + dir*1.3846153846).rgb) + safe(texture2D(tex, vUv - dir*1.3846153846).rgb))*0.3162162162;
    c += (safe(texture2D(tex, vUv + dir*3.2307692308).rgb) + safe(texture2D(tex, vUv - dir*3.2307692308).rgb))*0.0702702703;
    gl_FragColor = vec4(c, 1.0);
  }`;

// The pane: an acid-etched sheet of glass. Behind it, the scene (sharp + a blur pyramid + depth). On it,
// enamel paint (a mask texture) and, floating just above it, clear liquid-glass slabs.
export const PANE_FS = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tScene, tDepth, tBlurA, tBlurB, tBlurC, tPaint;
  uniform int uLGCount; uniform vec4 uLGRect[4]; uniform vec4 uLGParam[4]; uniform vec4 uLGState[4]; uniform vec4 uLG1, uLG2, uLG3;
  uniform vec2 uRes, uMouse; uniform float uTime, uNear, uFar, uCamZ, uTanHalf, uAspect;
  uniform vec3 uMatte;                    // the flat tone the top of the pane fades to (linear)
  uniform float uSmooth;                  // 1: a plain diffuser with no etch texture, only the depth blur (?smooth)

  // the upper part of the pane is painted out matte on the back, the way a shop window is above eye level:
  // between these heights the scene, the etch and the gloss fade to one flat tone
  float matteAt(vec2 uv){ return smoothstep(0.50, 0.90, uv.y); }

  // ---- noise -------------------------------------------------------
  float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  // acid-etched surface height: fine grain + a little larger-scale unevenness
  float etch(vec2 p){
    return vnoise(p*1.0)*0.55 + vnoise(p*2.3+7.1)*0.28 + vnoise(p*5.1+3.3)*0.17;
  }
  vec2 etchGrad(vec2 uv){
    if (uSmooth > 0.5) return vec2(0.0);
    vec2 p = uv*vec2(uAspect,1.0)*420.0;
    float e = 0.9;
    float dx = etch(p+vec2(e,0)) - etch(p-vec2(e,0));
    float dy = etch(p+vec2(0,e)) - etch(p-vec2(0,e));
    return vec2(dx,dy);
  }

  // ---- depth -------------------------------------------------------
  float distBehind(vec2 uv){               // world distance behind the glass plane (z=0)
    float d = texture2D(tDepth, uv).r;
    float z = d*2.0-1.0;
    float view = (2.0*uNear*uFar)/(uFar+uNear - z*(uFar-uNear));
    return max(view - uCamZ, 0.0);
  }
  // a diffusing surface scatters into a cone: blur radius grows linearly with distance behind it
  float blurRadius(float dist){
    return (1.0 + 44.0*dist) * (uRes.y/900.0);
  }

  ${LG_GLSL}

  // ---- environment reflected in the pane: the same room the slabs mirror
  vec3 env(vec3 r){ return lgRoom(r); }

  vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }

  // ---- the pane as seen through one pixel: etch refraction, cone blur, depth haze
  vec3 pane(vec2 uv, bool full){
    vec2 px = 1.0/uRes;
    float sPx = uRes.y/900.0;
    vec2 g = etchGrad(uv);
    float dc = distBehind(uv);
    float spread = 0.003 + 0.010*(dc/(dc+0.8));
    vec2 refr = g*spread*vec2(1.0/uAspect, 1.0);      // fine sand of the etch, for what's close
    vec2 refrF = g*0.0025*vec2(1.0/uAspect, 1.0);       // what's far has already been scattered by the blur
    float dc0 = distBehind(uv + refr);
    float rr = blurRadius(max(dc0, dc));
    vec3 mid; mid.r = texture2D(tBlurA, uv + refrF*1.3).r; mid.g = texture2D(tBlurA, uv + refrF).g; mid.b = texture2D(tBlurA, uv + refrF*0.7).b;
    vec3 near = mid;
    if (full && uSmooth > 0.5) {
      vec3 c = texture2D(tScene, uv).rgb;                  // smooth frost: what touches the glass stays sharp, no sand
      near = any(isnan(c)) || any(isinf(c)) ? vec3(0.8) : c;
    } else if (full) {
      // a small jittered gather over the sharp image: the sandy look of light just starting to scatter
      float rN = min(rr, 8.0*sPx);
      float ang = hash(uv*uRes)*6.2831;
      float ca = cos(ang), sa = sin(ang);
      mat2 rot = mat2(ca,-sa,sa,ca);
      vec2 poisson[8];
      poisson[0]=vec2(-0.613,0.617); poisson[1]=vec2(0.170,-0.041); poisson[2]=vec2(-0.299,-0.578); poisson[3]=vec2(0.645,0.493);
      poisson[4]=vec2(-0.651,-0.114); poisson[5]=vec2(0.421,-0.615); poisson[6]=vec2(-0.108,0.907); poisson[7]=vec2(0.928,0.036);
      near = vec3(0.0);
      for (int i=0;i<8;i++){
        vec2 suv = uv + refr + (rot*poisson[i])*rN*px;
        vec3 c;
        c.r = texture2D(tScene, suv + refr*0.12).r;
        c.g = texture2D(tScene, suv).g;
        c.b = texture2D(tScene, suv - refr*0.12).b;
        near += any(isnan(c)) || any(isinf(c)) ? vec3(0.8) : c;
      }
      near /= 8.0;
    }
    vec3 farB; farB.r = texture2D(tBlurB, uv + refrF*1.5).r; farB.g = texture2D(tBlurB, uv + refrF).g; farB.b = texture2D(tBlurB, uv + refrF*0.5).b;
    vec3 farC = texture2D(tBlurC, uv + refrF).rgb;
    // pyramid levels sit at ~10 / 30 / 62 px of scatter; interpolate by the cone radius
    float rA = 10.0*sPx, rB = 30.0*sPx, rC = 62.0*sPx;
    vec3 col = rr < rA ? mix(near, mid, rr/rA)
             : rr < rB ? mix(mid, farB, (rr-rA)/(rB-rA))
             :           mix(farB, farC, clamp((rr-rB)/(rC-rB), 0.0, 1.0));
    // multiple scattering: the deeper the object, the more of its light is lost to an even haze
    float haze = 1.0 - exp(-max(dc0, 0.0)*0.55);
    return mix(col, vec3(0.92), 0.03 + 0.30*haze);
  }
  // the pane scattered further, amount 0..2 across the blur pyramid: what a slab's ground underside adds
  vec3 paneBlur(vec2 uv, float amount){
    vec2 refrF = etchGrad(uv)*0.0025*vec2(1.0/uAspect, 1.0);
    vec3 b = amount < 1.0 ? mix(texture2D(tBlurA, uv + refrF).rgb, texture2D(tBlurB, uv + refrF).rgb, amount)
                          : mix(texture2D(tBlurB, uv + refrF).rgb, texture2D(tBlurC, uv + refrF).rgb, clamp(amount - 1.0, 0.0, 1.0));
    float haze = 1.0 - exp(-max(distBehind(uv), 0.0)*0.55);
    return mix(b, vec3(0.92), 0.03 + 0.30*haze);
  }

  void main(){
    vec2 uv = vUv;
    vec2 px = 1.0/uRes;
    vec2 ndc = uv*2.0-1.0;
    vec3 viewDir = normalize(vec3(ndc.x*uTanHalf*uAspect, ndc.y*uTanHalf, -1.0));
    vec2 g = etchGrad(uv);
    vec3 N = normalize(vec3(g*1.8, 1.0));              // fine etch: glints
    vec3 Ns = normalize(vec3(etchGrad(uv*0.35+0.3)*0.9, 1.0)); // broad unevenness: reflection
    float matte = matteAt(uv);
    vec3 col = mix(pane(uv, true), uMatte, matte);

    // ---- liquid glass: clear slabs floating over the frosted pane, behind the button and the sponsors
    vec2 pp = uv*uRes;
    float slab = 0.0;
    int hit = -1; float hitSdf = 1e9;
    for (int i = 0; i < 4; i++) {
      if (i >= uLGCount) break;
      float sd = lgSDF(pp - uLGRect[i].xy, uLGRect[i].zw, uLGParam[i].x, uLGParam[i].z);
      if (sd < hitSdf) { hitSdf = sd; hit = i; }
    }
    if (hit >= 0 && hitSdf > 0.0) {
      float shadow = 0.0;
      for (int i = 0; i < 4; i++) {
        if (i >= uLGCount) break;
        shadow += lgShadow(pp - uLGRect[i].xy, uLGRect[i].zw, uLGParam[i].x, uLGParam[i].z, uLG3.x, uLG3.y, uLG3.z);
      }
      col *= 1.0 - min(shadow, 1.0);
    }
    if (hit >= 0 && hitSdf < 1.0) {
      vec4 rc = uLGRect[hit]; vec4 pr = uLGParam[hit];
      LGSurf s = lgSurface(pp - rc.xy, rc.zw, pr.x, pr.y, pr.z, uLG1);
      vec2 uvR = uv + s.refrPx*px;
      vec3 seen = mix(pane(uvR, true), paneBlur(uvR, uLG2.y), min(uLG2.y, 1.0));   // the pane through the slab, frosted more
      seen = mix(seen, uMatte, matteAt(uvR));
      vec3 glass = lgShade(s, pp - rc.xy, rc.zw, uLGState[hit], seen, uLG2.x + pr.w, uLG2.z, uLG2.w, uLG3.w);
      col = mix(col, glass, s.mask); slab = s.mask;
    }

    // ---- the copy: enamel painted on the front of the pane (mask: r = coverage, g = relief)
    vec4 pt = texture2D(tPaint, uv);
    float pmC = pt.r;
    float rel = pt.g / max(pt.r, 1e-3);                  // 1: raised enamel, 0: thin flat coat
    float hL = texture2D(tPaint, uv - vec2(px.x,0.0)*1.5).r, hR = texture2D(tPaint, uv + vec2(px.x,0.0)*1.5).r;
    float hD = texture2D(tPaint, uv - vec2(0.0,px.y)*1.5).r, hU = texture2D(tPaint, uv + vec2(0.0,px.y)*1.5).r;
    float pm = clamp(pmC*1.08, 0.0, 1.0);
    // paint relief: edges of the stroke are raised, and the body carries faint brush texture
    vec2 pgrad = vec2(hR - hL, hU - hD);
    float brush = vnoise(vec2(uv.x*uRes.x*0.06, uv.y*uRes.y*0.55));
    vec2 bgrad = vec2(vnoise(vec2(uv.x*uRes.x*0.06+3.1, uv.y*uRes.y*0.55)) - brush,
                      vnoise(vec2(uv.x*uRes.x*0.06, uv.y*uRes.y*0.55+3.1)) - brush);
    vec3 Np = normalize(vec3((-pgrad*2.0 - bgrad*0.18*pm)*rel, 1.0));
    // pigment: near-black, unevenly dense the way a loaded brush leaves it
    float pig = 0.003 + 0.004*vnoise(uv*uRes*0.13) + 0.0015*brush;
    col = mix(col, vec3(pig), pm);

    // Fresnel reflection of the room off the front surface: the glass clear-coats everything,
    // and the paint's raised edges catch it at their own angles
    vec3 Nsurf = normalize(mix(Ns, Np, pm));
    float cosT = clamp(dot(-viewDir, Nsurf), 0.0, 1.0);
    float F = 0.035 + 0.965*pow(1.0-cosT, 5.0);
    vec3 R = reflect(viewDir, Nsurf);
    col += env(R)*F*mix(0.55*(1.0 - slab)*(1.0 - matte), 0.85, pm);

    // micro-facet glints: the etch sparkles; the enamel gives one tight gloss highlight
    vec3 Ld = normalize(vec3(-0.45 + (uMouse.x-0.5)*0.15, 0.7 + (uMouse.y-0.5)*0.15, 0.55));
    vec3 H = normalize(Ld - viewDir);
    float specG = pow(max(dot(N,H),0.0), 90.0);
    float specP = pow(max(dot(Np,H),0.0), 160.0);
    col += vec3(1.0)*mix(specG*0.10*(1.0 - slab)*(1.0 - matte)*(1.0 - uSmooth), specP*0.45*rel, pm);

    // the etch grain reads on bare glass, not through the paint, under a slab or on the matte
    col += (hash(uv*uRes*1.7)-0.5)*0.006*(1.0-pm)*(1.0 - slab)*(1.0 - matte)*(1.0 - uSmooth);

    col = aces(col*1.02);
    col = pow(col, vec3(1.0/2.2));
    gl_FragColor = vec4(col, 1.0);
  }`;
