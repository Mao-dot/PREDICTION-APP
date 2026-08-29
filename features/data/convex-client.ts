import { ConvexHttpClient } from 'convex/browser';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type {
  GameAnswer,
  MarketSelection,
  PlayerProfile,
  PredictionMarket,
  RevealResult,
} from '@/features/game/types';
import { selectDemoMarkets } from '@/features/game/engine';

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

export async function loadMarketSelection(interests: string[]): Promise<MarketSelection> {
  const fallback: MarketSelection = {
    markets: selectDemoMarkets(interests),
    source: 'demo',
    freshness: 'offline',
    fetchedAt: null,
  };
  const convex = getClient();
  if (!convex) return fallback;
  try {
    const selection = await convex.action(api.markets.getSelection, { interests });
    if (!Array.isArray(selection.markets) || selection.markets.length !== 3) return fallback;
    return {
      markets: selection.markets as PredictionMarket[],
      source: selection.source === 'live' ? 'live' : 'cache',
      freshness: selection.freshness === 'stale' ? 'stale' : 'fresh',
      fetchedAt: selection.fetchedAt,
    };
  } catch {
    return fallback;
  }
}

export async function createRemoteSession(
  profile: PlayerProfile,
  selection: MarketSelection,
): Promise<Id<'sessions'> | null> {
  const convex = getClient();
  if (!convex) return null;
  try {
    const sessionId = await convex.mutation(api.sessions.create, {
      ...profile,
      markets: selection.markets,
      marketSource: selection.source,
      marketFreshness: selection.freshness,
      ...(selection.fetchedAt === null ? {} : { marketFetchedAt: selection.fetchedAt }),
    });
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
  marketSelection: Omit<MarketSelection, 'markets'>;
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
      marketSelection: saved.marketSelection,
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
