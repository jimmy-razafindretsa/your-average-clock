// Sand Dune — a fine-grained ridge winding down the screen under grazing light.
// Progress: the shadow of dusk creeps down the dune. A thin line of light marks where it stops.

#include common

float ridgeX(float y) { return 0.06 + 0.24 * sin(y * 2.9 + 0.95); }
float ridgeDX(float y) { return 0.24 * 2.9 * cos(y * 2.9 + 0.95); }

// grain height at very high frequency (resolution independent: cell ≈ 0.45 mm on a 4K panel)
float grain(vec2 p) {
  return vnoise(p * 1400.0) * 0.6 + vnoise(p * 2900.0 + 7.0) * 0.4;
}

vec3 scene(vec2 p, float px) {
  float dx = ridgeDX(p.y);
  float inv = inversesqrt(1.0 + dx * dx);
  float d = (p.x - ridgeX(p.y)) * inv;                 // signed distance across the ridge
  float w = 0.15 + 0.03 * sin(p.y * 1.7 + 0.4);
  float ridge = exp(-d * d / (w * w));
  // gradient of the ridge in screen space
  vec2 across = vec2(1.0, -dx) * inv;
  vec2 gR = across * (-2.0 * d / (w * w)) * ridge;

  // sand grain normal perturbation
  float e = max(px, 0.00035);
  float g0 = grain(p), gx = grain(p + vec2(e, 0.0)), gy = grain(p + vec2(0.0, e));
  vec2 gG = vec2(gx - g0, gy - g0) / e;

  vec2 grad = gR * 0.22 + gG * 0.0007;
  vec3 n = normalize(vec3(-grad, 1.0));

  vec3 L = normalize(vec3(-0.78, -0.50, 0.36));
  float diff = sat(dot(n, L));
  float wrap = sat(dot(n, L) * 0.5 + 0.5);

  // dusk terminator travels top → bottom with elapsed time
  float yT = mix(-1.0, 1.0, u_elapsed);
  float sun = smoothstep(yT - 0.04, yT + 0.14, p.y);
  float moon = 0.17;
  float light = mix(moon, 1.0, sun);

  float albedo = 1.05 * (0.8 + 0.4 * g0);
  float body = pow(ridge, 0.45);
  float lum = albedo * (0.85 * pow(diff, 1.25) + 0.08 * wrap) * body * light;
  // grazing rim on the lit flank
  lum += 0.35 * pow(diff, 5.0) * body * light;
  // sparkles: a few grains catch the light
  float sp = step(0.9965, hash12(floor(p * 2200.0))) * pow(diff, 3.0) * body * sun;
  lum += sp * 0.6;

  lum = 1.0 - exp(-lum * 1.15);   // soft highlight roll-off, keeps grain in the brights
  vec3 col = vec3(lum) * vec3(1.0, 0.985, 0.97);
  // line of last light along the terminator (accent), only on the sand
  float edge = exp(-pow((p.y - yT - 0.02) / 0.012, 2.0)) * body * pow(diff, 1.5);
  float show = smoothstep(0.0, 0.015, u_elapsed) * smoothstep(1.0, 0.985, u_elapsed);
  col += u_accent * edge * 0.55 * show;

  // deep black surround with a whisper of ambient
  col += vec3(0.006) * (1.0 - body);
  return col;
}
