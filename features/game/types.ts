export type GameMode = 'voice' | 'chat';
export type GameScreen = 'setup' | 'ringing' | 'call' | 'reveal' | 'result';
export type AnswerChoice = 'yes' | 'no';

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
  source: 'polymarket' | 'demo';
  slug?: string;
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

export interface RevealResult {
  probability: number;
  headline: string;
  paragraphs: string[];
}
