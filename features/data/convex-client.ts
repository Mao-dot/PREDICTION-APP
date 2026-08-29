import { ConvexHttpClient } from 'convex/browser';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type {
  GameAnswer,
  PlayerProfile,
  PredictionMarket,
  RevealResult,
} from '@/features/game/types';

let client: ConvexHttpClient | null = null;
const SESSION_STORAGE_KEY = 'black-future-phone.session-id';

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ??
  'https://loyal-owl-727.convex.cloud';

function getClient(): ConvexHttpClient | null {
  const url = CONVEX_URL;
  if (!url) return null;
  client ??= new ConvexHttpClient(url);
  return client;
}

export async function loadLiveMarkets(interests: string[]): Promise<PredictionMarket[] | null> {
  const convex = getClient();
  if (!convex) return null;
  try {
    const markets = await convex.action(api.markets.getLive, { interests });
    return Array.isArray(markets) && markets.length === 3
      ? (markets as PredictionMarket[])
      : null;
  } catch {
    return null;
  }
}

export async function createRemoteSession(
  profile: PlayerProfile,
  markets: PredictionMarket[],
): Promise<Id<'sessions'> | null> {
  const convex = getClient();
  if (!convex) return null;
  try {
    const sessionId = await convex.mutation(api.sessions.create, { ...profile, markets });
    rememberSessionId(sessionId);
    return sessionId;
  } catch {
    return null;
  }
}

export async function persistAnswer(
  sessionId: Id<'sessions'> | null,
  answer: GameAnswer,
  order: number,
) {
  const convex = getClient();
  if (!convex || !sessionId) return;
  try {
    await convex.mutation(api.sessions.recordAnswer, { sessionId, order, choice: answer.choice });
  } catch {
    // The local demo continues even when the remote backend is unavailable.
  }
}

export async function completeRemoteSession(
  sessionId: Id<'sessions'> | null,
  fallback: RevealResult,
): Promise<RevealResult> {
  const convex = getClient();
  if (!convex || !sessionId) return fallback;
  try {
    return await convex.mutation(api.sessions.finalize, { sessionId });
  } catch {
    // The final screen is intentionally resilient for live demos.
    return fallback;
  }
}

export async function updateRemoteProgress(
  sessionId: Id<'sessions'> | null,
  currentStep: number,
  markets?: PredictionMarket[],
) {
  const convex = getClient();
  if (!convex || !sessionId) return;
  try {
    await convex.mutation(api.sessions.updateProgress, { sessionId, currentStep, markets });
  } catch {
    // Progress persistence is best-effort during the live demo.
  }
}

export async function abandonRemoteSession(sessionId: Id<'sessions'> | null) {
  const convex = getClient();
  if (!convex || !sessionId) return;
  try {
    await convex.mutation(api.sessions.abandon, { sessionId });
  } catch {
    // A disconnected player can still restart locally.
  }
}

export async function resumeRemoteSession(): Promise<{
  sessionId: Id<'sessions'>;
  profile: PlayerProfile;
  markets: PredictionMarket[];
  answers: GameAnswer[];
  status: 'started' | 'completed' | 'abandoned';
  currentStep: number;
  result: RevealResult | null;
} | null> {
  const convex = getClient();
  const storedId = readRememberedSessionId();
  if (!convex || !storedId) return null;
  try {
    const saved = await convex.query(api.sessions.get, { sessionId: storedId });
    if (!saved || saved.status === 'abandoned') {
      forgetRemoteSession();
      return null;
    }
    return {
      sessionId: storedId,
      profile: saved.profile,
      markets: saved.markets as PredictionMarket[],
      answers: saved.answers.map(({ order: _order, ...answer }) => answer),
      status: saved.status,
      currentStep: saved.currentStep,
      result: saved.result,
    };
  } catch {
    forgetRemoteSession();
    return null;
  }
}

export function forgetRemoteSession() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function rememberSessionId(sessionId: Id<'sessions'>) {
  if (typeof window !== 'undefined') window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}

function readRememberedSessionId(): Id<'sessions'> | null {
  if (typeof window === 'undefined') return null;
  return (window.localStorage.getItem(SESSION_STORAGE_KEY) as Id<'sessions'> | null) ?? null;
}

export async function generateCallerReply(args: {
  profile: PlayerProfile;
  userMessage: string;
  nextQuestion?: string;
  fallback: string;
}): Promise<string> {
  const convex = getClient();
  if (!convex) return args.fallback;
  try {
    const response = await convex.action(api.narrative.reply, {
      alias: args.profile.alias,
      country: args.profile.country,
      interests: args.profile.interests,
      userMessage: args.userMessage,
      nextQuestion: args.nextQuestion,
      fallback: args.fallback,
    });
    return typeof response === 'string' && response.trim() ? response : args.fallback;
  } catch {
    return args.fallback;
  }
}
