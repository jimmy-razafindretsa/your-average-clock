import './styles/app.css';
import { backgrounds, findBackground } from './backgrounds/registry';
import type { BackgroundDefinition } from './backgrounds/types';
import { BackgroundRenderer } from './core/renderer';
import { Timer, formatClock, describeDuration } from './core/timer';
import { playChime, unlockAudio } from './core/chime';
import { loadSettings, saveSettings } from './core/settings';
import { createPicker } from './ui/picker';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const DEFAULT_ACCENT = '#F5F5F7';

let settings = loadSettings();
// ?scale=0.75 lowers render resolution on slower GPUs (remembered for next time)
const scaleParam = Number(new URLSearchParams(location.search).get('scale'));
if (scaleParam > 0 && scaleParam <= 2) settings = saveSettings({ renderScale: scaleParam });
const timer = new Timer(settings.durationMs);
let current: BackgroundDefinition = findBackground(settings.backgroundId);

// ---------- background ----------
const canvas = $<HTMLCanvasElement>('bg');
let renderer: BackgroundRenderer;
try {
  renderer = new BackgroundRenderer(canvas, { renderScale: settings.renderScale });
} catch (e) {
  showError(String(e));
  throw e;
}

function showError(msg: string) {
  const el = $('error');
  el.textContent = msg;
  el.hidden = false;
}

function applyLayout(def: BackgroundDefinition) {
  const root = document.documentElement.style;
  root.setProperty('--time-y', String(def.layout.timeY));
  root.setProperty('--scrim', String(def.layout.scrim ?? 0.45));
  const accent = def.accent ?? DEFAULT_ACCENT;
  root.setProperty('--accent', accent);
  renderer.setAccent(accent);
}

async function useBackground(def: BackgroundDefinition, animate = true) {
  try {
    if (animate) {
      canvas.classList.add('fading');
      await new Promise((r) => setTimeout(r, 300));
    }
    await renderer.setBackground(def);
    current = def;
    applyLayout(def);
    settings = saveSettings({ backgroundId: def.id });
  } catch (e) {
    console.error(e);
    showError(String(e));
  } finally {
    canvas.classList.remove('fading');
  }
}

function cycleBackground(step: number) {
  const i = backgrounds.findIndex((b) => b.id === current.id);
  void useBackground(backgrounds[(i + step + backgrounds.length) % backgrounds.length]);
  picker.sync();
}

const resize = () => renderer.resize();
new ResizeObserver(resize).observe(canvas);
window.addEventListener('resize', resize);

// ---------- UI ----------
const app = $('app');
const digits = $('digits');
const status = $('status');
const sub = $('sub');
const presets = $('presets');
const custom = $<HTMLFormElement>('custom');
const tapPause = $<HTMLButtonElement>('tapPause');
const inputs = { h: $<HTMLInputElement>('inH'), m: $<HTMLInputElement>('inM'), s: $<HTMLInputElement>('inS') };

function render() {
  const s = timer.state;
  app.classList.toggle('running', s.running);
  tapPause.hidden = !s.running;

  const text = formatClock(s.remaining);
  if (digits.textContent !== text) digits.textContent = text;
  digits.classList.toggle('long', text.length > 5);
  document.title = s.running ? `${text} · Focus` : 'Focus Timer';

  status.textContent = s.running ? 'Focus' : s.done ? 'Done' : s.remaining < s.total ? 'Paused' : 'Ready';
  sub.textContent = s.done ? 'Nice work. Take a break.' : `${describeDuration(s.total)} session`;

  $('icoPlay').hidden = s.running;
  $('icoPause').hidden = !s.running;
  $('play').setAttribute('aria-label', s.running ? 'Pause timer' : 'Start timer');

  const wholeMin = s.total % 60_000 === 0 ? s.total / 60_000 : -1;
  let isPreset = false;
  presets.querySelectorAll<HTMLButtonElement>('[data-min]').forEach((b) => {
    const on = Number(b.dataset.min) === wholeMin;
    isPreset ||= on;
    b.classList.toggle('on', on);
  });
  $('customBtn').classList.toggle('on', !isPreset);

  renderer.setProgress(timer.fraction, s.running);
}

function tickClock() {
  $('clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function setDuration(ms: number) {
  timer.setDuration(ms);
  settings = saveSettings({ durationMs: ms });
}

function openCustom(open: boolean) {
  custom.hidden = !open;
  presets.hidden = open;
  if (open) {
    inputs.h.value = inputs.m.value = inputs.s.value = '';
    inputs.h.focus();
  }
}

function readCustom(): number {
  const n = (el: HTMLInputElement) => Math.max(0, parseInt(el.value, 10) || 0);
  return (Math.min(n(inputs.h), 99) * 3600 + n(inputs.m) * 60 + n(inputs.s)) * 1000;
}

function toggle() {
  unlockAudio();
  if (!custom.hidden) {
    const ms = readCustom();
    if (ms > 0) setDuration(ms);
    openCustom(false);
  }
  timer.toggle();
}

presets.querySelectorAll<HTMLButtonElement>('[data-min]').forEach((b) =>
  b.addEventListener('click', () => setDuration(Number(b.dataset.min) * 60_000)),
);
$('customBtn').addEventListener('click', () => openCustom(true));
$('cancelCustom').addEventListener('click', () => openCustom(false));
custom.addEventListener('submit', (e) => {
  e.preventDefault();
  const ms = readCustom();
  if (ms > 0) setDuration(ms);
  openCustom(false);
});
custom.addEventListener('keydown', (e) => { if (e.key === 'Escape') openCustom(false); });
$('play').addEventListener('click', toggle);
tapPause.addEventListener('click', toggle);
$('reset').addEventListener('click', () => timer.reset());
$('plus').addEventListener('click', () => timer.add(60_000));

const picker = createPicker({
  root: $('picker'),
  grid: $('pickerGrid'),
  closeButton: $('closePicker'),
  backgrounds,
  getCurrent: () => current.id,
  getAccent: () => current.accent ?? DEFAULT_ACCENT,
  onPick: (id) => void useBackground(findBackground(id)),
});
$('bgButton').addEventListener('click', () => picker.open());

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'Space' && !picker.isOpen) { e.preventDefault(); toggle(); }
  else if (e.key === 'b' || e.key === 'B') cycleBackground(e.shiftKey ? -1 : 1);
  else if (e.key === 'f' || e.key === 'F') {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
    else void document.exitFullscreen?.();
  }
});

timer.onChange(render);
timer.onDone(() => { if (settings.chime) playChime(); });

// ---------- boot ----------
applyLayout(current);
renderer.resize();
renderer.setProgress(timer.fraction, false, true);
void useBackground(current, false).then(() => renderer.startLoop());
render();
tickClock();
setInterval(tickClock, 1000);

// Expose a tiny hook for automated screenshots / debugging.
(window as unknown as { focusTimer: object }).focusTimer = {
  backgrounds: backgrounds.map((b) => b.id),
  use: (id: string) => useBackground(findBackground(id), false),
  progress: (remaining: number) => renderer.setProgress(remaining, false, true),
  timer,
};
