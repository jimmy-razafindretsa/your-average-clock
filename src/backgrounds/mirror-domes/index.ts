import type { BackgroundDefinition } from '../types';
import fragment from './domes.frag?raw';

export default {
  id: 'mirror-domes',
  name: 'Mirror Domes',
  description: 'Two glass domes close the gap of light between them.',
  order: 40,
  kind: 'shader',
  fragment,
  layout: { timeY: 0.16, scrim: 0.35 },
} satisfies BackgroundDefinition;
