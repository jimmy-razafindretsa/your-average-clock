import type { BackgroundDefinition } from '../types';

// Example of an image background: drop any 2160×3840 (or larger) image in a folder like this one.
// Progress uses the built-in "descending dusk" effect (src/core/image.frag).
export default {
  id: 'graphite-satin',
  name: 'Graphite Satin',
  description: 'A photo-style render. Dusk descends from the top as time passes.',
  order: 70,
  kind: 'image',
  src: new URL('./satin.jpg', import.meta.url).href,
  layout: { timeY: 0.24, scrim: 0.4 },
} satisfies BackgroundDefinition;
