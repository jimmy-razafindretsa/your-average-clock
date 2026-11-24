import type { BackgroundDefinition } from '../types';
import fragment from './scene.frag?raw';

// Copy this folder to src/backgrounds/<your-id>/ and edit.
export default {
  id: 'my-background',
  name: 'My Background',
  description: 'One line for the picker.',
  order: 100,
  kind: 'shader',
  fragment,
  layout: { timeY: 0.2, scrim: 0.5 },
} satisfies BackgroundDefinition;
