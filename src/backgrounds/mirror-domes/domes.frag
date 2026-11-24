// Mirror Domes — two glass domes facing each other across a sliver of light.
// Progress: the domes slowly close the gap. The light between them gets brighter,
// and they meet when the session ends.

#include common

const vec2 RAD = vec2(0.66, 0.40);   // dome radii (x, y)
const float YC = 0.12;                // composition centre

// approximate ellipse distance + local "radial" coordinate
float sdEllipse(vec2 q, vec2 r, out float e) {
  e = length(q / r);
  float k1 = length(q / (r * r));
  return e * (e - 1.0) / max(k1, 1e-5);
}

vec3 dome(vec2 q, vec2 r, float px, float facing, inout float mask, float gapLight) {
  float e;
  float d = sdEllipse(q, r, e);
  float cov = fillAA(d, px);
  mask = cov;
  float ee = min(e, 0.9995);
  vec2 g = normalize(q / (r * r) + 1e-6);
  vec3 n = normalize(vec3(g * ee * 1.25, sqrt(1.0 - ee * ee)));
  vec3 refl = studioEnv(2.0 * n.z * n - vec3(0.0, 0.0, 1.0));
  float fr = fresnel(n, 3.0);
  // smoky glass body: darker in the middle, brighter toward the rim
  float soft = pow(sat(dot(n, normalize(vec3(-0.45, -0.55 * facing, 0.7)))), 2.5);
  vec3 c = vec3(0.010 + 0.05 * pow(ee, 6.0) + 0.10 * soft);
  c = mix(c, refl, 0.08 + 0.7 * fr);
  // bright internal reflection band just inside the edge facing the gap
  float rim = 1.0 - ee;
  float towardGap = sat(g.y * facing);
  c += vec3(0.95) * exp(-pow((rim - 0.035) / 0.016, 2.0)) * pow(towardGap, 2.0);
  c += vec3(0.30) * exp(-pow((rim - 0.12) / 0.05, 2.0)) * pow(towardGap, 3.0);
  // reflection of the gap light on the near edge
  c += u_accent * gapLight * exp(-rim / 0.05) * pow(towardGap, 4.0) * 0.9;
  // thin silhouette rim
  c += vec3(0.7) * exp(-pow(d / max(0.8 * px, 0.0005), 2.0)) * (0.25 + 0.75 * towardGap);
  return c;
}

vec3 scene(vec2 p, float px) {
  // grey studio sweep: lighter at the corners, black toward the centre
  float vign = length(vec2(p.x * 1.2, (p.y - YC) * 0.7));
  vec3 col = vec3(0.01 + 0.10 * smoothstep(0.35, 1.1, vign));

  float gap = mix(0.0015, 0.17, pow(u_remaining, 0.9));
  float gapLight = 0.25 + 0.75 * pow(u_elapsed, 1.5);

  // light living in the gap (horizon line)
  float dy = abs(p.y - YC);
  float horizon = exp(-dy / (0.004 + gap * 0.35)) * exp(-pow(p.x / 0.75, 2.0));
  col += u_accent * horizon * gapLight * 0.85;

  float mTop = 0.0, mBot = 0.0;
  vec3 top = dome(p - vec2(0.0, YC - gap * 0.5 - RAD.y), RAD, px, 1.0, mTop, gapLight);
  vec3 bot = dome(p - vec2(0.0, YC + gap * 0.5 + RAD.y), RAD, px, -1.0, mBot, gapLight);
  col = mix(col, bot, mBot);
  col = mix(col, top, mTop);

  // a soft flash when they meet
  float meet = smoothstep(0.985, 1.0, u_elapsed);
  col += u_accent * meet * 0.35 * exp(-length(vec2(p.x * 0.5, p.y - YC)) / 0.12);
  return col;
}
