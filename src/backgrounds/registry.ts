import type { BackgroundDefinition } from './types';

/**
 * Auto-discovers every `src/backgrounds/<folder>/index.ts`.
 * Drop a new folder in, restart `npm run dev`, and it shows up in the picker.
 */
const modules = import.meta.glob<{ default: BackgroundDefinition }>('./*/index.ts', { eager: true });

function validate(def: BackgroundDefinition, path: string): BackgroundDefinition | null {
  if (!def || !def.id || !def.name || !def.layout) {
    console.warn(`[backgrounds] ${path} is missing id, name or layout; skipped.`);
    return null;
  }
  if (def.kind === 'shader' && !def.fragment.includes('scene(')) {
    console.warn(`[backgrounds] ${path} shader has no scene() function; skipped.`);
    return null;
  }
  return def;
}

export const backgrounds: BackgroundDefinition[] = Object.entries(modules)
  .map(([path, mod]) => validate(mod.default, path))
  .filter((d): d is BackgroundDefinition => d !== null)
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));

const ids = new Set<string>();
for (const b of backgrounds) {
  if (ids.has(b.id)) console.warn(`[backgrounds] duplicate id "${b.id}"`);
  ids.add(b.id);
}

export function findBackground(id: string | null | undefined): BackgroundDefinition {
  return backgrounds.find((b) => b.id === id) ?? backgrounds[0];
}
