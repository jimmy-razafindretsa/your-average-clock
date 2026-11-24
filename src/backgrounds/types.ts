/**
 * A background is a self-contained folder in `src/backgrounds/<id>/` whose `index.ts`
 * default-exports a `BackgroundDefinition`. The registry discovers folders automatically,
 * so adding a background never requires touching app code.
 */

export interface BackgroundLayout {
  /** Vertical centre of the time display, as a fraction of the viewport height (0 = top, 1 = bottom). */
  timeY: number;
  /** Strength (0–1) of the soft dark halo drawn behind the digits for legibility. */
  scrim?: number;
}

interface BackgroundBase {
  /** Stable id, used for persistence. Defaults to the folder name convention — keep it kebab-case. */
  id: string;
  /** Display name in the picker. */
  name: string;
  /** One line shown under the name in the picker. */
  description?: string;
  /** Sort order in the picker (lower first). */
  order?: number;
  /** Where the UI sits so it never collides with the artwork. */
  layout: BackgroundLayout;
  /** Suggested accent (progress light, buttons). Hex, e.g. `#F5F5F7`. */
  accent?: string;
}

/**
 * Procedural background rendered in real time by a WebGL2 fragment shader.
 *
 * The shader must define:
 *   vec3 scene(vec2 p, float px)
 * where `p` is in design space (portrait 9:16 frame, width = 1, origin at the centre, +y down)
 * and `px` is the size of one device pixel in those units (use it for anti-aliasing).
 *
 * Available uniforms (see core/shader-prelude.glsl):
 *   u_time      seconds since start
 *   u_remaining 1 → 0 as the session runs (smoothed)
 *   u_elapsed   0 → 1 (= 1 - u_remaining)
 *   u_running   0 / 1 (smoothed), handy for subtle "alive" motion only while focusing
 *   u_accent    accent colour (linear-ish RGB 0–1)
 * Plus every helper in core/common.glsl (`#include common` is added for you).
 */
export interface ShaderBackground extends BackgroundBase {
  kind: 'shader';
  fragment: string;
}

/**
 * Photo / render background. Any image works (keep it ≥ 2160×3840 for a 4K vertical screen).
 * Progress is drawn by a built-in shader: a soft dusk that descends as time passes, with a fine
 * light line at its edge. Provide `fragment` to override that effect for this image.
 */
export interface ImageBackground extends BackgroundBase {
  kind: 'image';
  /** URL of the image, typically `new URL('./photo.jpg', import.meta.url).href`. */
  src: string;
  fragment?: string;
}

export type BackgroundDefinition = ShaderBackground | ImageBackground;
