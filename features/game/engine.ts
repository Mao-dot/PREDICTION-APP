import { DEMO_MARKETS } from './demo-data';
import type {
  AnswerChoice,
  GameAnswer,
  PlayerProfile,
  PredictionMarket,
  RevealBreakdown,
  RevealResult,
} from './types';

export type NarrativeStage = 'opening' | 'first-question' | 'transition' | 'final-question' | 'reveal';

const TOPIC_WORDS: Record<string, string[]> = {
  Tecnología: ['ia', 'tecnología', 'internet', 'robot', 'computadora', 'programar'],
  Política: ['política', 'presidente', 'gobierno', 'elección', 'país'],
  Economía: ['dinero', 'economía', 'trabajo', 'empleo', 'precio'],
  Deportes: ['deporte', 'fútbol', 'equipo', 'partido', 'campeonato'],
  Espacio: ['espacio', 'luna', 'marte', 'universo'],
  Cripto: ['cripto', 'bitcoin', 'ethereum', 'blockchain'],
};

const DECISION_WEIGHTS = [0.25, 0.35, 0.4];

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
  const normalized = normalizeText(message);
  const detected = Object.entries(TOPIC_WORDS).find(([, words]) =>
    words.some((word) => normalized.includes(normalizeText(word))),
  )?.[0];

  if (!detected) return markets;
  return [...markets].sort((a, b) => Number(b.category === detected) - Number(a.category === detected));
}

export function classifyChoice(message: string): AnswerChoice | null {
  const normalized = normalizeText(message);
  const noMatch = /\b(no|nunca|imposible|negativo|dudo|jamás)\b/.test(normalized);
  const yesMatch = /\b(si|claro|seguro|probablemente|afirmativo|sucedera|pasara)\b/.test(normalized);

  // A mixed answer must be confirmed instead of silently choosing one side.
  if (noMatch === yesMatch) return null;
  if (noMatch) return 'no';
  if (yesMatch) return 'yes';
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

export function getAnswerBranch(answer: GameAnswer): 'aligned' | 'divergent' | 'unstable' {
  if (answer.confidence >= 0.65) return 'aligned';
  if (answer.confidence <= 0.35) return 'divergent';
  return 'unstable';
}

export function getOpeningLine(alias: string): string {
  return `Hola, ${alias}. No cuelgues. Esta llamada solo puede ocurrir una vez.`;
}

export function getNarrativeStage(answerNumber: number): NarrativeStage {
  if (answerNumber <= 0) return 'first-question';
  if (answerNumber >= 3) return 'reveal';
  if (answerNumber === 2) return 'final-question';
  return 'transition';
}

export function calculateTimelineProbability(answers: GameAnswer[]): number {
  if (!answers.length) return 0;
  const totalWeight = answers.reduce((sum, _answer, index) => sum + (DECISION_WEIGHTS[index] || 1), 0);
  const weightedConfidence = answers.reduce(
    (sum, answer, index) => sum + answer.confidence * (DECISION_WEIGHTS[index] || 1),
    0,
  );
  return Math.round((weightedConfidence / totalWeight) * 100);
}

export function getRevealBreakdown(answers: GameAnswer[]): RevealBreakdown[] {
  const totalWeight = answers.reduce((sum, _answer, index) => sum + (DECISION_WEIGHTS[index] || 1), 0);
  return answers.map((answer, index) => {
    const weight = (DECISION_WEIGHTS[index] || 1) / totalWeight;
    return {
      marketId: answer.marketId,
      weight,
      confidence: answer.confidence,
      contribution: answer.confidence * weight,
    };
  });
}

export function getBridgeLine(
  answer: GameAnswer,
  nextMarket: PredictionMarket | undefined,
  answerNumber = 1,
): string {
  const branch = getAnswerBranch(answer);
  const aligned = branch === 'aligned';
  const alignment = aligned
    ? 'coincide con la señal'
    : branch === 'divergent'
      ? 'rompe con la señal'
      : 'deja la señal suspendida';
  if (!nextMarket) {
    return aligned
      ? 'Tu respuesta coincide con la señal. Ya recuerdo lo que ocurrió después.'
      : 'Tu respuesta rompe con la señal. Por un instante, dejé de recordar lo que ocurrió después.';
  }

  const lead = branch === 'aligned'
    ? answerNumber === 1
      ? 'Eso fue exactamente lo que dijiste la primera vez.'
      : 'La señal acaba de estabilizarse.'
    : branch === 'divergent'
      ? answerNumber === 1
        ? 'No era esa la respuesta que esperaba de mí.'
        : 'Algo acaba de cambiar al otro lado.'
      : 'La señal vaciló; puedo oír dos versiones de tu voz.';

  return `${lead} Tu respuesta ${alignment}. ${nextMarket.question}`;
}

export function getUnclearAnswerLine(answerNumber: number): string {
  return answerNumber === 1
    ? 'No te escuché con claridad. En esta línea temporal, las dudas también dejan huella. Respóndeme: ¿sí o no?'
    : 'La señal se está llenando de ruido. No me des una explicación; solo dime: ¿sí o no?';
}

export function getRevealTransitionLine(probability: number): string {
  if (probability >= 65) {
    return 'Ya está. La señal encaja demasiado bien. Ahora puedo decirte quién soy.';
  }
  if (probability >= 45) {
    return 'La señal se partió en dos. Si sigues oyéndome, es porque una de ellas todavía te recuerda.';
  }
  return 'La señal está colapsando. Escucha con atención: quizá esta sea la última vez que nuestras voces coinciden.';
}

export function buildReveal(profile: PlayerProfile, answers: GameAnswer[]): RevealResult {
  const probability = calculateTimelineProbability(answers);
  const breakdown = getRevealBreakdown(answers);
  const yesCount = answers.filter((answer) => answer.choice === 'yes').length;
  const direction = yesCount >= 2 ? 'aceptaste el cambio' : 'intentaste detenerlo';
  const tension = probability >= 65 ? 'estable' : probability >= 45 ? 'inestable' : 'casi imposible';
  const decisions = answers
    .map((answer) => `${answer.choice === 'yes' ? 'creíste' : 'no creíste'} que ${lowerFirst(answer.question)}`)
    .join('; ');

  const ending = probability >= 65
    ? 'Tus respuestas no predijeron el futuro. Lo reconocieron.'
    : probability >= 45
      ? 'Dos futuros siguen abiertos. El que acabas de escuchar ya sabe que lo descubriste.'
      : 'La señal no pudo sostenerse. Tal vez eso sea exactamente lo que intentaba evitar.';

  return {
    probability,
    headline: probability >= 65 ? 'La señal permanece' : probability >= 45 ? 'La señal se divide' : 'La señal colapsa',
    paragraphs: [
      `${profile.alias}, no te llamé desde el futuro. Te llamé desde el final de tus propias decisiones. Soy tú. ${ending}`,
      `En esta línea temporal ${direction}: ${decisions}. Cada respuesta parecía pequeña, pero juntas construyeron el mundo desde el que estoy hablando.`,
      `Según el consenso de los mercados, esta línea es ${tension}. La primera decisión pesa 25%, la segunda 35% y la última 40%. Ahora que la conoces, quizá ya la cambiaste.`,
    ],
    breakdown,
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

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
