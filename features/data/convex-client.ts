import { ConvexHttpClient } from 'convex/browser';

import { api } from '@/convex/_generated/api';
import type { GameAnswer, PlayerProfile, PredictionMarket } from '@/features/game/types';

let client: ConvexHttpClient | null = null;

function getClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
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

export async function createRemoteSession(profile: PlayerProfile): Promise<string | null> {
  const convex = getClient();
  if (!convex) return null;
  try {
    return (await convex.mutation(api.sessions.create, profile)) as string;
  } catch {
    return null;
  }
}

export async function persistAnswer(sessionId: string | null, answer: GameAnswer) {
  const convex = getClient();
  if (!convex || !sessionId) return;
  try {
    await convex.mutation(api.sessions.recordAnswer, { sessionId, ...answer });
  } catch {
    // The local demo continues even when the remote backend is unavailable.
  }
}

export async function completeRemoteSession(sessionId: string | null, probability: number) {
  const convex = getClient();
  if (!convex || !sessionId) return;
  try {
    await convex.mutation(api.sessions.complete, { sessionId, probability });
  } catch {
    // The final screen is intentionally resilient for live demos.
  }
}

export async function generateCallerReply(args: {
  profile: PlayerProfile;
  userMessage: string;
  nextQuestion?: string;
  fallback: string;
  stage?: 'opening' | 'first-question' | 'transition' | 'final-question' | 'reveal';
  answerNumber?: number;
  previousAnswers?: string[];
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
      stage: args.stage,
      answerNumber: args.answerNumber,
      previousAnswers: args.previousAnswers,
    });
    return typeof response === 'string' && response.trim() ? response : args.fallback;
  } catch {
    return args.fallback;
  }
}
