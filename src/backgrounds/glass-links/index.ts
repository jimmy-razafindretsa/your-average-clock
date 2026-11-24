import type { BackgroundDefinition } from '../types';
import fragment from './links.frag?raw';

export default {
  id: 'glass-links',
  name: 'Glass Links',
  description: 'A chain of dark glass. Each rod of light is a quarter of your session.',
  order: 60,
  kind: 'shader',
  fragment,
  layout: { timeY: 0.5, scrim: 0.7 },
} satisfies BackgroundDefinition;
