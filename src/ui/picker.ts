import type { BackgroundDefinition } from '../backgrounds/types';
import { BackgroundRenderer } from '../core/renderer';

const thumbCache = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();
let thumbRenderer: BackgroundRenderer | null = null;

/** Renders a still of each background (at ~60% remaining, so the progress effect is visible). */
function thumbnail(def: BackgroundDefinition, accent: string): Promise<string> {
  // one shared GL context renders thumbnails strictly one at a time
  const job = queue.then(() => renderThumb(def, accent));
  queue = job.catch(() => undefined);
  return job;
}

async function renderThumb(def: BackgroundDefinition, accent: string): Promise<string> {
  const hit = thumbCache.get(def.id);
  if (hit) return hit;
  if (!thumbRenderer) {
    const c = document.createElement('canvas');
    thumbRenderer = new BackgroundRenderer(c, { preserve: true });
  }
  thumbRenderer.setAccent(def.accent ?? accent);
  await thumbRenderer.setBackground(def);
  thumbRenderer.renderStill(360, 640, 0.6);
  const url = thumbRenderer.canvas.toDataURL('image/jpeg', 0.85);
  thumbCache.set(def.id, url);
  return url;
}

export interface PickerOptions {
  root: HTMLElement;
  grid: HTMLElement;
  closeButton: HTMLElement;
  backgrounds: BackgroundDefinition[];
  getCurrent: () => string;
  getAccent: () => string;
  onPick: (id: string) => void;
}

export function createPicker(o: PickerOptions) {
  let built = false;
  let lastFocus: HTMLElement | null = null;

  function build() {
    o.grid.replaceChildren();
    for (const def of o.backgrounds) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.dataset.id = def.id;
      card.innerHTML = `<div class="thumb"></div><span class="name"></span><span class="desc"></span>`;
      card.querySelector('.name')!.textContent = def.name;
      card.querySelector('.desc')!.textContent = def.description ?? '';
      card.addEventListener('click', () => { o.onPick(def.id); sync(); });
      o.grid.appendChild(card);
      // render thumbnails one by one so the sheet opens instantly
      void thumbnail(def, o.getAccent()).then((url) => {
        const img = new Image();
        img.alt = '';
        img.src = url;
        card.querySelector('.thumb')!.appendChild(img);
      }).catch((e) => console.warn(e));
    }
    built = true;
  }

  function sync() {
    const id = o.getCurrent();
    o.grid.querySelectorAll<HTMLElement>('.card').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.id === id)));
  }

  function open() {
    if (!built) build();
    sync();
    lastFocus = document.activeElement as HTMLElement | null;
    o.root.hidden = false;
    o.grid.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
  }

  function close() {
    o.root.hidden = true;
    lastFocus?.focus();
  }

  o.closeButton.addEventListener('click', close);
  o.root.addEventListener('click', (e) => { if (e.target === o.root) close(); });
  o.root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  return { open, close, sync, get isOpen() { return !o.root.hidden; } };
}
