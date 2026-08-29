import type { PredictionMarket } from './types';

export const INTERESTS = [
  'Tecnología',
  'Política',
  'Economía',
  'Deportes',
  'Ciencia',
  'Cultura',
  'Espacio',
];

export const DEMO_MARKETS: PredictionMarket[] = [
  {
    id: 'demo-ai-work',
    question:
      '¿La inteligencia artificial transformará la mayoría de los trabajos antes de 2030?',
    yesProbability: 0.67,
    category: 'Tecnología',
    source: 'demo',
  },
  {
    id: 'demo-election',
    question:
      '¿Una elección nacional importante cambiará el equilibrio político de su región?',
    yesProbability: 0.54,
    category: 'Política',
    source: 'demo',
  },
  {
    id: 'demo-recession',
    question: '¿Habrá una recesión global antes de que termine el próximo año?',
    yesProbability: 0.38,
    category: 'Economía',
    source: 'demo',
  },
  {
    id: 'demo-championship',
    question:
      '¿Un equipo considerado favorito ganará el próximo gran campeonato internacional?',
    yesProbability: 0.61,
    category: 'Deportes',
    source: 'demo',
  },
  {
    id: 'demo-moon',
    question: '¿Una persona volverá a caminar sobre la Luna antes de 2030?',
    yesProbability: 0.72,
    category: 'Espacio',
    source: 'demo',
  },
  {
    id: 'demo-clean-energy',
    question:
      '¿La energía solar será la principal fuente de nueva electricidad antes de 2030?',
    yesProbability: 0.58,
    category: 'Ciencia',
    source: 'demo',
  },
];
