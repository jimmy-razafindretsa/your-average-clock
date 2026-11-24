import type { BackgroundDefinition } from '../types';
import fragment from './folds.frag?raw';

export default {
  id: 'midnight-folds',
  name: 'Midnight Folds',
  description: 'Navy glass bands. Their iridescent edge runs out as time passes.',
  order: 50,
  kind: 'shader',
  fragment,
  layout: { timeY: 0.2, scrim: 0.5 },
} satisfies BackgroundDefinition;
