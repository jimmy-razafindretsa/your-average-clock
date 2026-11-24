// Glass Links — four dark glass links in a diagonal chain, each holding a rod of light.
// Progress: each rod is a quarter of the session. Rods shorten and fade in turn, top first.

#include common

const int N = 4;
const float ANG = -0.80;   // chain tilt
const float LA = 0.30;     // half straight length
const float LR = 0.150;    // radius

vec2 linkCenter(int k) { return vec2(0.03 * (float(k) - 1.5), -0.60 + float(k) * 0.40); }

float rodLight(int k) { return 1.0 - sat(u_elapsed * float(N) - float(k)); }

vec3 shadeLink(vec2 p, int k, float px, inout float cov) {
  vec2 q = rot(ANG) * (p - linkCenter(k));
  vec2 m = vec2(max(abs(q.x) - LA, 0.0), q.y);
  float rr = length(m);
  float d = rr - LR;
  cov = fillAA(d, px);
  float e = min(rr / LR, 0.999);
  vec2 dirL = rr > 1e-5 ? m / rr : vec2(0.0, 1.0);
  dirL.x *= sign(q.x);
  vec2 dir = rot(-ANG) * dirL;                // back to screen space
  vec3 n = normalize(vec3(dir * e, sqrt(1.0 - e * e)));
  vec3 refl = studioEnv(2.0 * n.z * n - vec3(0.0, 0.0, 1.0));
  float fr = fresnel(n, 3.2);
  // broad soft studio light so the dark glass still reads as a volume
  float soft = pow(sat(dot(n, normalize(vec3(-0.5, -0.6, 0.62)))), 3.0);
  vec3 c = vec3(0.010 + 0.06 * soft) + refl * (0.06 + 0.8 * fr);

  // rod of light inside the link (offset toward one wall, like a lit slot)
  float lit = rodLight(k);
  float rodLen = LA * 0.78 * mix(0.15, 1.0, lit);
  vec2 rq = q - vec2(-LA * 0.78 + rodLen, LR * 0.38);
  float dr = sdStadium(rq, rodLen, LR * 0.10);
  float draining = step(0.001, lit) * step(lit, 0.999) * u_running;
  float glow = lit * (1.0 + draining * 0.08 * sin(u_time * 2.0));
  vec3 rod = u_accent * (fillAA(dr + 0.002, px) * 0.7 + exp(-max(dr, 0.0) / 0.01) * 0.3 + exp(-max(dr, 0.0) / 0.06) * 0.16 + exp(-max(dr, 0.0) / 0.16) * 0.07);
  // the rod's light also falls on the inside walls of the link
  c += rod * glow * (0.6 + 0.4 * (1.0 - e));
  // ghost of the rod when it's dark
  c += vec3(0.05) * exp(-pow(sdStadium(q - vec2(0.0, LR * 0.38), LA * 0.78, LR * 0.10) / 0.002, 2.0)) * (1.0 - lit);
  // silhouette rim
  c += vec3(0.55) * exp(-pow(d / max(0.8 * px, 0.0005), 2.0)) * (0.3 + 0.7 * fr) * (0.5 + 0.5 * lit);
  return c;
}

vec3 scene(vec2 p, float px) {
  vec3 col = vec3(0.004 + 0.012 * exp(-length(p - vec2(-0.3, -0.5)) / 0.6));
  // soft drop shadows
  for (int k = 0; k < N; k++) {
    vec2 q = rot(ANG) * (p - linkCenter(k) - vec2(0.02, 0.03));
    float d = sdStadium(q, LA, LR);
    col *= 1.0 - 0.6 * exp(-max(d, 0.0) / 0.04);
  }
  // odd links behind, even links in front: an interlocking chain
  for (int pass = 0; pass < 2; pass++) {
    for (int k = 0; k < N; k++) {
      if ((k % 2 == 0) == (pass == 0)) continue;
      float cov = 0.0;
      vec3 c = shadeLink(p, k, px, cov);
      col = mix(col, c, cov);
    }
  }
  return col;
}
