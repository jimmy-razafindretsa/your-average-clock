import type { BackgroundDefinition } from '../backgrounds/types';
import commonGlsl from './common.glsl?raw';
import imageFrag from './image.frag?raw';

const VERTEX = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const PRELUDE = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_remaining;
uniform float u_elapsed;
uniform float u_running;
uniform vec3 u_accent;
uniform sampler2D u_image;
uniform vec2 u_imageSize;
out vec4 outColor;
`;

const MAIN = `
void main() {
  float unit = min(u_res.x, u_res.y * 0.5625);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / unit;
  p.y = -p.y;
  vec3 c = scene(p, 1.0 / unit);
  // static film grain + dither: keeps gradients clean on big screens
  vec2 f = gl_FragCoord.xy;
  c += (hash12(f) - 0.5) * (2.0 / 255.0) + (hash12(f * 1.37 + 11.0) - 0.5) * (1.0 / 255.0);
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

/** Expands `#include common` and wraps a background's scene() into a full fragment shader. */
export function buildFragment(source: string): string {
  const body = source.replace(/^\s*#include\s+common\s*$/m, '');
  return PRELUDE + commonGlsl + '\n#line 1\n' + body + MAIN;
}

interface Program {
  prog: WebGLProgram;
  loc: Record<string, WebGLUniformLocation | null>;
}

const UNIFORMS = ['u_res', 'u_time', 'u_remaining', 'u_elapsed', 'u_running', 'u_accent', 'u_image', 'u_imageSize'];

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export interface RendererOptions {
  /** Max frames per second while animating (the timer only needs ~30). */
  fps?: number;
  /** Multiplier on device pixels (1 = native). Lower it on slow GPUs. */
  renderScale?: number;
  /** Keep the drawing buffer so it can be read back (thumbnails). */
  preserve?: boolean;
}

export class BackgroundRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private programs = new Map<string, Program>();
  private current: { def: BackgroundDefinition; program: Program } | null = null;
  private imageTex: WebGLTexture;
  private imageSize: [number, number] = [1, 1];
  private textures = new Map<string, { tex: WebGLTexture; size: [number, number] }>();
  private raf = 0;
  private last = 0;
  private start = performance.now();
  private opts: Required<RendererOptions>;

  // target vs. displayed values (displayed values ease toward targets for smooth transitions)
  private target = { remaining: 1, running: 0 };
  private shown = { remaining: 1, running: 0 };
  private accent: [number, number, number] = [0.96, 0.96, 0.97];

  constructor(canvas: HTMLCanvasElement, opts: RendererOptions = {}) {
    this.canvas = canvas;
    this.opts = { fps: 30, renderScale: 1, preserve: false, ...opts };
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: this.opts.preserve,
    });
    if (!gl) throw new Error('WebGL2 is not available in this browser.');
    this.gl = gl;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // one oversized triangle covers the screen
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    this.imageTex = this.makeTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  }

  setRenderScale(scale: number) {
    this.opts.renderScale = scale;
    this.resize();
  }

  setAccent(hex: string) {
    this.accent = hexToRgb(hex);
  }

  /** remaining: 1 → 0. Pass `instant` to skip easing (e.g. on first paint). */
  setProgress(remaining: number, running: boolean, instant = false) {
    this.target.remaining = Math.min(1, Math.max(0, remaining));
    this.target.running = running ? 1 : 0;
    if (instant) Object.assign(this.shown, this.target);
  }

  async setBackground(def: BackgroundDefinition): Promise<void> {
    const program = this.getProgram(def);
    if (def.kind === 'image') {
      const t = await this.loadImage(def.src);
      this.imageTex = t.tex;
      this.imageSize = t.size;
    }
    this.current = { def, program };
    this.draw();
  }

  startLoop() {
    const frame = (now: number) => {
      this.raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const minDt = 1000 / this.opts.fps;
      if (now - this.last < minDt - 1) return;
      const dt = Math.min(0.25, (now - (this.last || now)) / 1000);
      this.last = now;
      const k = 1 - Math.exp(-dt * 4);
      this.shown.remaining += (this.target.remaining - this.shown.remaining) * k;
      this.shown.running += (this.target.running - this.shown.running) * k;
      this.draw();
    };
    this.raf = requestAnimationFrame(frame);
  }

  stopLoop() {
    cancelAnimationFrame(this.raf);
  }

  resize() {
    const dpr = (window.devicePixelRatio || 1) * this.opts.renderScale;
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    // cap at ~4K-vertical pixel count to keep it smooth on any display
    const maxPx = 2160 * 3840 * 1.05;
    const s = Math.min(1, Math.sqrt(maxPx / (w * h)));
    const cw = Math.round(w * s), ch = Math.round(h * s);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
      this.draw();
    }
  }

  /** Renders one frame at an explicit size (used for thumbnails). */
  renderStill(width: number, height: number, remaining: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.shown.remaining = this.target.remaining = remaining;
    this.shown.running = this.target.running = 0;
    this.draw();
  }

  draw() {
    if (!this.current) return;
    const gl = this.gl;
    const { prog, loc } = this.current.program;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(prog);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(loc.u_res, this.canvas.width, this.canvas.height);
    gl.uniform1f(loc.u_time, (performance.now() - this.start) / 1000);
    gl.uniform1f(loc.u_remaining, this.shown.remaining);
    gl.uniform1f(loc.u_elapsed, 1 - this.shown.remaining);
    gl.uniform1f(loc.u_running, this.shown.running);
    gl.uniform3f(loc.u_accent, ...this.accent);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.current.def.kind === 'image' ? this.imageTex : null);
    gl.uniform1i(loc.u_image, 0);
    gl.uniform2f(loc.u_imageSize, ...this.imageSize);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private getProgram(def: BackgroundDefinition): Program {
    const cached = this.programs.get(def.id);
    if (cached) return cached;
    const source = def.kind === 'shader' ? def.fragment : def.fragment ?? imageFrag;
    const prog = this.link(VERTEX, buildFragment(source), def.id);
    const loc: Program['loc'] = {};
    for (const u of UNIFORMS) loc[u] = this.gl.getUniformLocation(prog, u);
    const p = { prog, loc };
    this.programs.set(def.id, p);
    return p;
  }

  private link(vs: string, fs: string, label: string): WebGLProgram {
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error(`[${label}] shader compile error:\n${log}`);
      }
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(`[${label}] program link error:\n${gl.getProgramInfoLog(prog)}`);
    }
    return prog;
  }

  private makeTexture(data: TexImageSource | Uint8Array, w = 0, h = 0): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (data instanceof Uint8Array) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private async loadImage(src: string) {
    const hit = this.textures.get(src);
    if (hit) return hit;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    await img.decode();
    const entry = { tex: this.makeTexture(img), size: [img.naturalWidth, img.naturalHeight] as [number, number] };
    this.textures.set(src, entry);
    return entry;
  }
}
