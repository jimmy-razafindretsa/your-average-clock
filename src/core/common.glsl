// ---------------------------------------------------------------------------
// Shared helpers for background shaders. Included automatically.
// Conventions: design space, width = 1 in a portrait 9:16 frame, origin centre, +y DOWN.
// ---------------------------------------------------------------------------

#define PI 3.14159265359
#define TAU 6.28318530718

float sat(float x) { return clamp(x, 0.0, 1.0); }
vec3 sat(vec3 x) { return clamp(x, 0.0, 1.0); }

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x),
             mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}

float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// Horizontal capsule: straight half-length a, radius r.
float sdStadium(vec2 p, float a, float r) { p.x = max(abs(p.x) - a, 0.0); return length(p) - r; }

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Thin anti-aliased line on a distance field (w = half width in design units).
float lineAA(float d, float w, float px) { return 1.0 - smoothstep(w, w + 1.5 * px, abs(d)); }

// Coverage of the inside of a distance field.
float fillAA(float d, float px) { return sat(0.5 - d / px); }

// Studio lighting used for reflections. r = reflected view ray (z toward viewer, +y down).
vec3 studioEnv(vec3 r) {
  float key   = sat(dot(r, normalize(vec3(-0.55, -0.62, 0.56))));
  float strip = sat(dot(r, normalize(vec3(0.92, -0.05, 0.38))));
  float floorL = sat(dot(r, normalize(vec3(0.0, 1.0, 0.25))));
  float v = 0.015 + 1.15 * pow(key, 6.0) + 0.55 * pow(strip, 40.0) + 0.05 * pow(floorL, 3.0);
  return vec3(v);
}

// Schlick-style fresnel from a normal facing the viewer (n.z = 1 head-on).
float fresnel(vec3 n, float power) { return pow(1.0 - sat(n.z), power); }

// ---------------------------------------------------------------------------
// Serpentine path: rows of horizontal runs joined by half-circle turns.
// Row 0 runs right→left (entering from off-screen right), the last row leaves off-screen.
// Returns vec4(distance to centreline, arclength from start, outward unit normal).
// ---------------------------------------------------------------------------
float serpentineLength(int rows, float xL, float xR, float pitch, float lead) {
  float Lr = xR - xL, T = PI * pitch * 0.5;
  return float(rows) * Lr + 2.0 * lead + float(rows - 1) * T;
}

vec4 serpentine(vec2 p, float y0, float pitch, int rows, float xL, float xR, float lead) {
  float Lr = xR - xL, R = pitch * 0.5, T = PI * R;
  float best = 1e9; float bs = 0.0; vec2 bn = vec2(0, 1);
  int kk = int(floor((p.y - y0) / pitch + 0.5));
  for (int o = -1; o <= 1; o++) {
    int k = kk + o;
    if (k < 0 || k > rows - 1) continue;
    float yk = y0 + float(k) * pitch;
    bool even = (k % 2) == 0;
    bool last = k == rows - 1;
    float lo = xL - ((last && even) ? lead : 0.0);
    float hi = xR + ((k == 0 || (last && !even)) ? lead : 0.0);
    float Sk = (k == 0) ? 0.0 : (Lr + lead) + T + float(k - 1) * (Lr + T);
    float rowLen = hi - lo;
    // straight run
    float cx = clamp(p.x, lo, hi);
    vec2 v = p - vec2(cx, yk);
    float d = length(v);
    if (d < best) {
      best = d;
      bs = Sk + (even ? (hi - cx) : (cx - lo));
      bn = d > 1e-6 ? v / d : vec2(0, 1);
    }
    // turn after this row
    if (k < rows - 1) {
      vec2 c = vec2(even ? xL : xR, yk + R);
      vec2 w = p - c;
      bool side = even ? (w.x < 0.0) : (w.x > 0.0);
      if (side) {
        float lw = length(w);
        float dt = abs(lw - R);
        if (dt < best) {
          best = dt;
          float phi = even ? atan(-w.x, -w.y) : atan(w.x, -w.y);
          bs = Sk + rowLen + phi * R;
          bn = sign(lw - R) * w / max(lw, 1e-6);
        }
      }
    }
  }
  return vec4(best, bs, bn);
}
