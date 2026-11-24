// Default progress effect for image backgrounds:
// a soft dusk descends from the top as time passes, edged by a fine line of light.

vec3 scene(vec2 p, float px) {
  // cover-fit the image into the full viewport (not just the design frame)
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.y = 1.0 - uv.y;
  float va = u_res.x / u_res.y, ia = u_imageSize.x / max(u_imageSize.y, 1.0);
  vec2 scale = va > ia ? vec2(1.0, ia / va) : vec2(va / ia, 1.0);
  uv = (uv - 0.5) * scale + 0.5;
  vec3 img = texture(u_image, uv).rgb;

  // progress edge travels top → bottom of the *viewport*
  float y = 1.0 - gl_FragCoord.y / u_res.y;
  float edge = mix(-0.08, 1.08, u_elapsed);
  float soft = 0.10;
  float dusk = smoothstep(edge + soft * 0.5, edge - soft, y);        // 1 above the edge
  vec3 col = img * mix(1.0, 0.16, dusk);
  // fine light line + bloom at the edge
  float dist = abs(y - edge) * u_res.y * px;                         // in design units
  float line = exp(-pow(dist / max(1.4 * px, 0.0007), 2.0));
  float bloom = exp(-dist / 0.035);
  float show = smoothstep(0.0, 0.02, u_elapsed) * smoothstep(1.0, 0.98, u_elapsed);
  col += u_accent * (0.55 * line + 0.10 * bloom) * show;
  return col;
}
