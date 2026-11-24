export interface Settings {
  backgroundId: string | null;
  durationMs: number;
  chime: boolean;
  /** 1 = native resolution; lower for slower GPUs. */
  renderScale: number;
}

const KEY = 'focus-timer:v1';
const DEFAULTS: Settings = { backgroundId: null, durationMs: 25 * 60_000, chime: true, renderScale: 1 };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode) */
  }
  return next;
}
