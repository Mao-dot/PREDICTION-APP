import { DEMO_MARKETS } from './demo-data';
import type {
  AnswerChoice,
  GameAnswer,
  PlayerProfile,
  PredictionMarket,
  RevealResult,
} from './types';

const TOPIC_WORDS: Record<string, string[]> = {
  Tecnología: ['ia', 'tecnología', 'internet', 'robot', 'computadora', 'programar'],
  Política: ['política', 'presidente', 'gobierno', 'elección', 'país'],
  Economía: ['dinero', 'economía', 'trabajo', 'empleo', 'precio'],
  Deportes: ['deporte', 'fútbol', 'equipo', 'partido', 'campeonato'],
  Espacio: ['espacio', 'luna', 'marte', 'universo'],
  Cripto: ['cripto', 'bitcoin', 'ethereum', 'blockchain'],
};

export function selectDemoMarkets(interests: string[]): PredictionMarket[] {
  return [...DEMO_MARKETS]
    .sort((a, b) => {
      const aPreferred = interests.includes(a.category) ? 1 : 0;
      const bPreferred = interests.includes(b.category) ? 1 : 0;
      return bPreferred - aPreferred;
    })
    .slice(0, 3);
}

export function reorderByConversation(
  markets: PredictionMarket[],
  message: string,
): PredictionMarket[] {
  const normalized = message.toLocaleLowerCase('es');
  const detected = Object.entries(TOPIC_WORDS).find(([, words]) =>
    words.some((word) => normalized.includes(word)),
  )?.[0];

  if (!detected) return markets;
  return [...markets].sort((a, b) => Number(b.category === detected) - Number(a.category === detected));
}

export function classifyChoice(message: string): AnswerChoice | null {
  const normalized = message
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/\b(no|nunca|imposible|negativo)\b/.test(normalized)) return 'no';
  if (/\b(si|claro|seguro|probablemente|afirmativo)\b/.test(normalized)) return 'yes';
  return null;
}

export function createAnswer(market: PredictionMarket, choice: AnswerChoice): GameAnswer {
  const confidence = choice === 'yes' ? market.yesProbability : 1 - market.yesProbability;
  return {
    marketId: market.id,
    question: market.question,
    choice,
    marketProbability: market.yesProbability,
    confidence,
  };
}

export function calculateTimelineProbability(answers: GameAnswer[]): number {
  if (!answers.length) return 0;
  const mean = answers.reduce((sum, answer) => sum + answer.confidence, 0) / answers.length;
  return Math.round(mean * 100);
}

export function getBridgeLine(
  answer: GameAnswer,
  nextMarket: PredictionMarket | undefined,
): string {
  const alignment = answer.confidence >= 0.5 ? 'coincide con la señal' : 'rompe con la señal';
  if (!nextMarket) {
    return `Tu respuesta ${alignment}. Ya recuerdo lo que ocurrió después.`;
  }
  return `Tu respuesta ${alignment}. Esa decisión abrió otra grieta: ${nextMarket.question}`;
}

export function buildReveal(profile: PlayerProfile, answers: GameAnswer[]): RevealResult {
  const probability = calculateTimelineProbability(answers);
  const yesCount = answers.filter((answer) => answer.choice === 'yes').length;
  const direction = yesCount >= 2 ? 'aceptaste el cambio' : 'intentaste detenerlo';
  const tension = probability >= 65 ? 'estable' : probability >= 45 ? 'inestable' : 'casi imposible';
  const decisions = answers
    .map((answer) => `${answer.choice === 'yes' ? 'creíste' : 'no creíste'} que ${lowerFirst(answer.question)}`)
    .join('; ');

  return {
    probability,
    headline: probability >= 65 ? 'La señal permanece' : probability >= 45 ? 'La señal se divide' : 'La señal colapsa',
    paragraphs: [
      `${profile.alias}, no te llamé desde el futuro. Te llamé desde el final de tus propias decisiones. Soy tú.`,
      `En esta línea temporal ${direction}: ${decisions}. Cada respuesta parecía pequeña, pero juntas construyeron el mundo desde el que estoy hablando.`,
      `Según el consenso de los mercados, esta línea es ${tension}. Ahora que la conoces, quizá ya la cambiaste.`,
    ],
  };
}

export function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function lowerFirst(value: string): string {
  const clean = value.replace(/^¿/, '').replace(/\?$/, '');
  return clean.charAt(0).toLocaleLowerCase('es') + clean.slice(1);
}
