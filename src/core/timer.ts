export interface TimerState {
  /** Session length in ms. */
  total: number;
  /** Time left in ms. */
  remaining: number;
  running: boolean;
  /** True once a session has run all the way to zero. */
  done: boolean;
}

type Listener = (s: Readonly<TimerState>) => void;

/** Wall-clock based countdown: accurate even if the tab is throttled. */
export class Timer {
  private s: TimerState;
  private endAt = 0;
  private iv: number | undefined;
  private listeners = new Set<Listener>();
  private doneListeners = new Set<() => void>();

  constructor(totalMs: number) {
    this.s = { total: totalMs, remaining: totalMs, running: false, done: false };
  }

  get state(): Readonly<TimerState> {
    return this.s;
  }

  /** Fraction of the session left, 1 → 0. */
  get fraction(): number {
    return this.s.total > 0 ? this.s.remaining / this.s.total : 0;
  }

  onChange(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  onDone(fn: () => void) { this.doneListeners.add(fn); return () => this.doneListeners.delete(fn); }

  start() {
    if (this.s.running) return;
    if (this.s.remaining <= 0) this.s.remaining = this.s.total;
    this.endAt = Date.now() + this.s.remaining;
    this.s.running = true;
    this.s.done = false;
    this.iv = window.setInterval(() => this.tick(), 100);
    this.emit();
  }

  pause() {
    if (!this.s.running) return;
    this.s.remaining = Math.max(0, this.endAt - Date.now());
    this.s.running = false;
    window.clearInterval(this.iv);
    this.emit();
  }

  toggle() { this.s.running ? this.pause() : this.start(); }

  reset() {
    this.pause();
    this.s.remaining = this.s.total;
    this.s.done = false;
    this.emit();
  }

  setDuration(ms: number) {
    this.pause();
    this.s.total = Math.max(1000, ms);
    this.s.remaining = this.s.total;
    this.s.done = false;
    this.emit();
  }

  /** Adds time to the current session (keeps progress proportional). */
  add(ms: number) {
    if (this.s.running) this.endAt += ms;
    this.s.remaining += ms;
    this.s.total = Math.max(this.s.total + (this.s.running ? ms : 0), this.s.remaining);
    this.s.done = false;
    this.emit();
  }

  private tick() {
    this.s.remaining = Math.max(0, this.endAt - Date.now());
    if (this.s.remaining === 0) {
      this.s.running = false;
      this.s.done = true;
      window.clearInterval(this.iv);
      this.emit();
      this.doneListeners.forEach((fn) => fn());
      return;
    }
    this.emit();
  }

  private emit() { this.listeners.forEach((fn) => fn(this.s)); }
}

export function formatClock(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export function describeDuration(ms: number): string {
  const t = Math.round(ms / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return [h && `${h} hr`, m && `${m} min`, s && `${s} sec`].filter(Boolean).join(' ') || '0 sec';
}
