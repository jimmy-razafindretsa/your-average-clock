// Midnight Folds — wide navy glass bands folding down the screen, edged with iridescent light.
// Progress: the light along the edges runs out from the start of the fold to the end,
// with a small spark where it stops.

#include common

const int ROWS = 5;
const float Y0 = -0.70;
const float PITCH = 0.355;
const float XL = -0.20;
const float XR = 0.20;
const float LEAD = 2.5;   // long enough to leave the screen at any aspect ratio
const float BH = 0.158;   // half height of a band

vec3 irid(float t) {
  vec3 c = 0.5 + 0.5 * cos(TAU * (t + vec3(0.0, 0.33, 0.67)));
  return mix(vec3(0.38, 0.45, 1.0), c, 0.45);
}

vec3 scene(vec2 p, float px) {
  vec3 navy = vec3(0.010, 0.013, 0.035);
  vec3 col = navy * 0.6;

  vec4 sp = serpentine(p, Y0, PITCH, ROWS, XL, XR, LEAD);
  float d = sp.x, s = sp.y;
  vec2 bn = sp.zw;
  float total = serpentineLength(ROWS, XL, XR, PITCH, LEAD);
  // progress covers the on-screen path; the off-screen lead-in drains instantly
  float drained = LEAD * smoothstep(0.0, 0.004, u_elapsed) + u_elapsed * (total - 2.0 * LEAD);
  float lit = smoothstep(drained - 0.01, drained + 0.05, s);
  float spark = exp(-pow((s - drained) / 0.025, 2.0)) * step(0.002, u_elapsed) * step(u_elapsed, 0.998);

  float edge = d - BH;          // < 0 inside the band
  // deep shadow in the folds between bands
  col *= 1.0 - 0.7 * exp(-max(edge, 0.0) / 0.012);

  if (edge < 3.0 * px) {
    // bevel: the surface curls down within the last few mm of the edge
    float bev = smoothstep(BH - 0.03, BH, d);
    vec3 n = normalize(vec3(bn * bev * 0.9, 1.0 - 0.6 * bev));
    vec3 refl = studioEnv(2.0 * n.z * n - vec3(0.0, 0.0, 1.0));
    float shade = 0.5 + 0.5 * sat(1.0 - abs(bn.y) * 0.6);
    vec3 c = navy * (0.9 + 0.6 * shade) + refl * vec3(0.30, 0.36, 0.70) * (0.25 + 0.75 * bev) * 0.35;
    // faint inner glow fed by the lit edge
    c += irid(s * 1.3) * 0.05 * lit * exp(-(-edge) / 0.03);
    col = mix(col, c, fillAA(edge, px));
  }

  // iridescent edge line: bright where lit, a faint ghost where drained
  float w = max(0.9 * px, 0.0006);
  float line = exp(-pow(edge / w, 2.0));
  float halo = exp(-abs(edge) / 0.008);
  vec3 ic = irid(s * 1.3 + bn.y * 0.15);
  float facing = 0.45 + 0.55 * sat(bn.y * 0.7 + 0.6);
  col += ic * (line * 0.95 + halo * 0.18) * facing * mix(0.12, 1.0, lit);
  col += u_accent * spark * (line * 1.5 + halo * 0.6 + exp(-abs(edge) / 0.03) * 0.25);
  return col;
}
