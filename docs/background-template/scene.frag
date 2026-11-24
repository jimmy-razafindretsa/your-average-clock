// p: design space (portrait frame, width = 1, origin centre, +y down). px: one pixel in those units.
// u_remaining goes 1 → 0, u_elapsed 0 → 1. Make the progress obvious and beautiful.

#include common

vec3 scene(vec2 p, float px) {
  vec3 col = vec3(0.01);
  // a glass capsule whose inner light shrinks as time passes
  float d = sdStadium(p, 0.25, 0.12);
  float s = sat((p.x + 0.37) / 0.74);
  float light = 1.0 - smoothstep(u_remaining - 0.05, u_remaining + 0.05, s);
  col = mix(col, vec3(0.03) + u_accent * 0.6 * light, fillAA(d, px));
  col += 0.6 * lineAA(d, 0.6 * px, px);   // crisp rim
  return col;
}
