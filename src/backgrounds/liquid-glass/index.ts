import type { BackgroundDefinition } from '../types';
import fragment from './liquid.frag?raw';

export default {
  id: 'liquid-glass',
  name: 'Liquid Glass',
  description: 'A folded glass tube. The light inside drains to the end.',
  order: 30,
  kind: 'shader',
  fragment,
  layout: { timeY: 0.2, scrim: 0.65 },
} satisfies BackgroundDefinition;
