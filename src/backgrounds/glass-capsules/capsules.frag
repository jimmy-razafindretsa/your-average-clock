// Glass Capsules — seven frosted glass slabs stacked on matte black.
// Progress: each capsule is one seventh of the session. Its light recedes toward the
// light source and fades until only the glass rim is left. Top capsule goes first.

#include common

const int N = 7;
const float R = 0.0833;     // end-cap radius
const float A = 0.148;      // half straight length
const float STEP = 0.1352;  // vertical spacing
const float TH = 0.0111;    // slab thickness

vec2 capCenter(int i) {
  float fi = float(i);
  return vec2(0.0139 * sin(fi / 6.0 * PI * 1.2 - 0.3), -0.114 + fi * STEP);
}

float sdTop(vec2 q) { q.x = max(abs(q.x) - A, 0.0); return length(q) - R; }
float sdBoth(vec2 q) { q.x = max(abs(q.x) - A, 0.0); q.y = max(abs(q.y - TH * 0.5) - TH * 0.5, 0.0); return length(q) - R; }

float capsuleLight(int i) {
  return 1.0 - sat(u_elapsed * float(N) - float(i));
}

vec3 scene(vec2 p, float px) {
  // matte black card with a soft key light from the upper left
  float key = exp(-(pow((p.x + 0.2) / 0.88, 2.0) + pow((p.y + 0.47) / 1.2, 2.0)));
  float mott = fbm(p * 7.0) - 0.5;
  vec3 col = vec3((0.020 + 0.026 * key) * (1.0 + 0.16 * mott));

  float rimW = max(0.75 * px, 0.00045);

  // paint back (bottom) to front (top)
  for (int i = N - 1; i >= 0; i--) {
    vec2 c = capCenter(i);
    vec2 q = p - c;
    float dAll = sdBoth(q);
    float lit = capsuleLight(i);
    // the capsule currently draining breathes very slightly while focusing
    float draining = step(0.001, lit) * step(lit, 0.999) * u_running;
    float pulse = 1.0 + draining * 0.06 * sin(u_time * 2.2);

    // contact shadow cast below the capsule, plus halo from its rim and light
    float below = step(c.y, p.y);
    col *= 1.0 - 0.62 * exp(-max(dAll, 0.0) / 0.0185) * below;
    float s0 = sat((p.x - (c.x - A - R)) / (2.0 * (A + R)));
    col += exp(-max(dAll, 0.0) / 0.0028) * 0.05 * (0.4 + 0.6 * (1.0 - s0));
    col += exp(-max(dAll, 0.0) / 0.03) * 0.07 * lit * pow(1.0 - s0, 2.0) * pulse;

    if (dAll > 0.012) continue;

    float dTop = sdTop(q);
    float dBot = sdTop(q - vec2(0.0, TH));
    float s = s0;
    float vy = sat((q.y + R) / (2.0 * R));
    float di = max(-dTop, 0.0);

    // frosted face: light falls off left → right; the lit extent shrinks with progress
    float reach = mix(0.10, 0.68, lit);
    float fall = pow(1.0 - smoothstep(-0.08, reach, s), 1.7);
    float face = 0.95 * fall * (0.72 + 0.28 * pow(1.0 - vy, 1.5)) * mix(0.07, 1.0, lit) * pulse;
    // inner rim glow (light trapped in the edge of the glass)
    float glass = 0.22 * exp(-di / 0.0074) * (0.35 + 0.65 * (1.0 - s));
    // internal reflection band hugging the lower rim
    float band = exp(-pow((di - 0.0139) / 0.0051, 2.0)) * smoothstep(0.55, 0.85, vy);
    face += band * (0.30 + 0.45 * (1.0 - s) + 0.35 * smoothstep(0.8, 1.0, s)) * mix(0.22, 1.0, lit);
    // caustic arcs near the right cap
    float rx = A;
    float rr = length(q - vec2(rx, 0.0));
    float ang = smoothstep(rx - 0.055, rx + 0.009, q.x) * (1.0 - smoothstep(-0.009, 0.028, q.y));
    float arcs = exp(-pow((rr - R * 0.80) / 0.0019, 2.0)) + 0.7 * exp(-pow((rr - R * 0.90) / 0.0016, 2.0));
    glass += 0.11 * arcs * ang;
    face += glass * mix(0.45, 1.0, lit);

    // visible slab edge below the face
    float edgeFill = (0.07 + 0.30 * pow(1.0 - s, 2.0)) * mix(0.25, 1.0, lit);
    float inTop = fillAA(dTop, px);
    float shade = mix(edgeFill, face, inTop);

    col = mix(col, vec3(shade), fillAA(dAll, px));

    // crisp fresnel rims (top face and slab bottom)
    col += exp(-pow(dTop / rimW, 2.0)) * (0.45 + 0.5 * (1.0 - s));
    col += exp(-pow(dBot / rimW, 2.0)) * step(0.0, q.y) * (0.35 + 0.45 * (1.0 - s));
  }
  return col;
}
