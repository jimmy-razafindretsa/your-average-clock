import type { BackgroundDefinition } from '../types';
import fragment from './dune.frag?raw';

export default {
  id: 'sand-dune',
  name: 'Sand Dune',
  description: 'Fine sand under low light. Dusk creeps down as time passes.',
  order: 20,
  kind: 'shader',
  fragment,
  layout: { timeY: 0.17, scrim: 0.55 },
} satisfies BackgroundDefinition;
