export type GameMode = 'voice' | 'chat';
export type GameScreen = 'setup' | 'ringing' | 'call' | 'reveal' | 'result';
export type AnswerChoice = 'yes' | 'no';
export type SignalState = 'stable' | 'split' | 'collapse';

export interface PlayerProfile {
  alias: string;
  ageRange: string;
  gender: string;
  country: string;
  interests: string[];
  mode: GameMode;
}

export interface PredictionMarket {
  id: string;
  question: string;
  yesProbability: number;
  category: string;
  source: 'polymarket' | 'cache' | 'demo';
  slug?: string;
}

export interface MarketSelection {
  markets: PredictionMarket[];
  source: 'live' | 'cache' | 'demo';
  freshness: 'fresh' | 'stale' | 'offline';
  fetchedAt: number | null;
}

export interface GameAnswer {
  marketId: string;
  question: string;
  choice: AnswerChoice;
  marketProbability: number;
  confidence: number;
}

export interface TranscriptMessage {
  id: string;
  role: 'caller' | 'player' | 'system';
  text: string;
}

export type TimelineRating = 'probable' | 'inestable' | 'improbable';

export interface TimelineBreakdown {
  marketId: string;
  question: string;
  choice: AnswerChoice;
  branchProbability: number;
  agreesWithMarket: boolean;
}

export interface LoreClue {
  code: string;
  title: string;
  text: string;
}

export interface RevealResult {
  probability: number;
  headline: string;
  paragraphs: string[];
  rating: TimelineRating;
  agreementCount: number;
  answerCount: number;
  breakdown: TimelineBreakdown[];
  signalState: SignalState;
  loreClues: LoreClue[];
  epilogue: string;
}
