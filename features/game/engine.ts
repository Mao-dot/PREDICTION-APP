import { DEMO_MARKETS } from './demo-data';
import type {
  AnswerChoice,
  GameAnswer,
  LoreClue,
  PlayerProfile,
  PredictionMarket,
  RevealResult,
  SignalState,
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

export function getSignalState(probability: number): SignalState {
  if (probability >= 65) return 'stable';
  if (probability >= 40) return 'split';
  return 'collapse';
}

export function getBranchAnomaly(answer: GameAnswer, answerNumber: number): string {
  const branch = getAnswerBranch(answer);
  if (branch === 'aligned') return `ORÁCULO // COINCIDENCIA CONFIRMADA ${answerNumber}/3`;
  if (branch === 'divergent') return `ORÁCULO // DESFASE DETECTADO ${answerNumber}/3 · REGISTRO ALTERNATIVO CREADO`;
  return `ECHO // RESPUESTA INDETERMINADA ${answerNumber}/3 · DOS SEÑALES SUPERPUESTAS`;
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
  const product = answers.reduce(
    (total, answer) => total * Math.min(1, Math.max(0, answer.confidence)),
    1,
  );
  return Math.round(Math.pow(product, 1 / answers.length) * 100);
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
  if (probability >= 40) {
    return 'La señal se partió en dos. Si sigues oyéndome, es porque una de ellas todavía te recuerda.';
  }
  return 'La señal está colapsando. Escucha con atención: quizá esta sea la última vez que nuestras voces coinciden.';
}

export function buildReveal(profile: PlayerProfile, answers: GameAnswer[]): RevealResult {
  const probability = calculateTimelineProbability(answers);
  const breakdown = answers.map((answer) => ({
    marketId: answer.marketId,
    question: answer.question,
    choice: answer.choice,
    branchProbability: answer.confidence,
    agreesWithMarket: answer.confidence >= 0.5,
  }));
  const agreementCount = breakdown.filter((item) => item.agreesWithMarket).length;
  const rating = probability >= 65 ? 'probable' : probability >= 40 ? 'inestable' : 'improbable';
  const signalState = getSignalState(probability);
  const yesCount = answers.filter((answer) => answer.choice === 'yes').length;
  const direction = yesCount >= 2 ? 'aceptaste el cambio' : 'intentaste detenerlo';
  const tension = rating === 'probable' ? 'probable' : rating === 'inestable' ? 'inestable' : 'improbable';
  const decisions = answers
    .map((answer) => `${answer.choice === 'yes' ? 'creíste' : 'no creíste'} que ${lowerFirst(answer.question)}`)
    .join('; ');

  const ending = probability >= 65
    ? 'Tus respuestas no predijeron el futuro. Lo reconocieron.'
    : probability >= 40
      ? 'Dos futuros siguen abiertos. El que acabas de escuchar ya sabe que lo descubriste.'
      : 'La señal no pudo sostenerse. Tal vez eso sea exactamente lo que intentaba evitar.';

  return {
    probability,
    headline: probability >= 65 ? 'La señal permanece' : probability >= 40 ? 'La señal se divide' : 'La señal colapsa',
    paragraphs: [
      `${profile.alias}, no te llamé desde el futuro. Te llamé desde el final de tus propias decisiones. Soy tú. ${ending}`,
      `En esta línea temporal ${direction}: ${decisions}. Cada respuesta parecía pequeña, pero juntas construyeron el mundo desde el que estoy hablando.`,
      `Según las señales recogidas de esta línea temporal, su futuro es ${tension}. Ahora que lo conoces, quizá ya lo cambiaste.`,
    ],
    rating,
    agreementCount,
    answerCount: answers.length,
    breakdown,
    signalState,
    loreClues: buildLoreClues(profile, signalState),
    epilogue: signalState === 'stable'
      ? 'TRANSMISIÓN CERRADA · Hay una llamada perdida de ayer. La hora coincide con la de mañana.'
      : signalState === 'split'
        ? 'TRANSMISIÓN ABIERTA · Una de las dos voces sigue conectada.'
        : 'TRANSMISIÓN INTERRUMPIDA · El registro conserva una cuarta respuesta que no diste.',
  };
}

function buildLoreClues(
  profile: PlayerProfile,
  signalState: SignalState,
): LoreClue[] {
  const firstInterest = profile.interests[0] || 'tu perfil';
  const clues: LoreClue[] = [
    {
      code: 'ORÁCULO-01',
      title: 'Las preguntas',
      text: 'ORÁCULO no intentaba adivinar el futuro. Usaba tus decisiones para elegir qué futuro merecía continuar.',
    },
    {
      code: 'ECHO-03',
      title: 'La llamada anterior',
      text: `Esta no fue la primera llamada. La señal ya había aprendido algo de ${firstInterest} antes de encontrarte.`,
    },
  ];

  if (signalState === 'stable') {
    clues.push({
      code: 'ANCHOR-07',
      title: 'El ancla',
      text: 'Una línea estable necesita un testigo. Por eso la voz te pidió que respondieras: no para saber, sino para fijarte.',
    });
  } else if (signalState === 'split') {
    clues.push({
      code: 'DIVERGENCIA-11',
      title: 'Dos versiones',
      text: 'Tus respuestas no cerraron la historia. Dejaron dos versiones del mismo futuro escuchando la misma llamada.',
    });
  } else {
    clues.push({
      code: 'CORTE-09',
      title: 'La interrupción',
      text: 'Cuando la señal colapsa, ORÁCULO no pierde el futuro. Pierde el nombre de la persona que debía vivirlo.',
    });
  }

  return clues;
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
