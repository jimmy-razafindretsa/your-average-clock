// Liquid Glass — a thick smoked-glass tube folding down the screen.
// Progress: a soft light runs inside the glass. It drains from the start of the tube to the
// end, with a bright meniscus where it stops.

#include common

const int ROWS = 7;
const float Y0 = -0.78;
const float PITCH = 0.26;
const float XL = -0.27;
const float XR = 0.27;
const float LEAD = 2.5;   // long enough to leave the screen at any aspect ratio
const float RT = 0.112;   // tube radius

vec3 scene(vec2 p, float px) {
  // charcoal backdrop with a soft top light
  float key = exp(-(pow((p.x + 0.25) / 0.9, 2.0) + pow((p.y + 0.6) / 1.1, 2.0)));
  vec3 col = vec3(0.012 + 0.03 * key);

  vec4 sp = serpentine(p, Y0, PITCH, ROWS, XL, XR, LEAD);
  float d = sp.x, s = sp.y;
  vec2 bn = sp.zw;
  float total = serpentineLength(ROWS, XL, XR, PITCH, LEAD);

  // how much light is left: lit for arclength beyond the drained part
  // progress covers the on-screen path; the off-screen lead-in drains instantly
  float drained = LEAD * smoothstep(0.0, 0.004, u_elapsed) + u_elapsed * (total - 2.0 * LEAD);
  float litMask = smoothstep(drained - 0.02, drained + 0.06, s);
  float meniscus = exp(-pow((s - drained - 0.015) / 0.02, 2.0)) * step(0.002, u_elapsed) * step(u_elapsed, 0.998);

  // ambient occlusion in the gaps + halo of inner light
  float outside = max(d - RT, 0.0);
  col *= 1.0 - 0.75 * exp(-outside / 0.02);
  col += u_accent * 0.05 * exp(-outside / 0.035) * litMask;

  if (d < RT + 2.0 * px) {
    float t = sat(d / RT);
    float h = sqrt(max(1.0 - t * t, 0.0));
    vec3 n = normalize(vec3(bn * t, h));
    vec3 r = 2.0 * n.z * n - vec3(0.0, 0.0, 1.0);
    float fr = fresnel(n, 2.6);

    vec3 tint = vec3(1.0, 0.95, 0.88);
    vec3 refl = studioEnv(r) * tint;
    vec3 body = vec3(0.018, 0.017, 0.016);
    // light living inside the glass: a bright core and a scattered fill
    float core = exp(-pow(t / 0.34, 2.0));
    // soft, slightly uneven glow so it reads as light in liquid, not a neon tube
    float swirl = 0.85 + 0.15 * sin(s * 9.0 - u_time * 0.6 + t * 3.0);
    vec3 inner = u_accent * (0.42 * core * swirl + 0.13 * (1.0 - t * t)) * litMask;
    inner += u_accent * meniscus * (0.55 * core + 0.18);
    // the glass transmits more of the inner light where it is thinner
    vec3 glass = body + inner * (0.55 + 0.45 * h);
    vec3 c = glass * (1.0 - 0.6 * fr) + refl * (0.18 + 0.82 * fr);
    // internal reflection line (light bounced off the far wall)
    float bounce = exp(-pow((t - 0.86) / 0.035, 2.0)) * sat(dot(bn, normalize(vec2(0.3, 1.0))));
    c += 0.35 * bounce * tint;
    // crisp silhouette rim
    c += 0.6 * exp(-pow((d - RT) / max(0.8 * px, 0.0005), 2.0)) * (0.35 + 0.65 * sat(-bn.y * 0.6 + 0.5)) * tint;

    col = mix(col, c, fillAA(d - RT, px));
  }
  return col;
}
