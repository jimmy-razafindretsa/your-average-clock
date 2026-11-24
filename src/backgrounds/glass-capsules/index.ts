import type { BackgroundDefinition } from '../types';
import fragment from './capsules.frag?raw';

export default {
  id: 'glass-capsules',
  name: 'Glass Capsules',
  description: 'Seven frosted slabs. One goes dark for each seventh of your session.',
  order: 10,
  kind: 'shader',
  fragment,
  layout: { timeY: 0.165, scrim: 0.3 },
} satisfies BackgroundDefinition;
