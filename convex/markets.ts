import { v } from 'convex/values';

import { internal } from './_generated/api';
import { action, internalMutation } from './_generated/server';

type GammaMarket = {
  id?: string;
  question?: string | null;
  outcomePrices?: string | string[] | null;
  outcomes?: string | string[] | null;
  category?: string | null;
  slug?: string | null;
  active?: boolean | null;
  closed?: boolean | null;
  volume24hr?: number | null;
};

export const getLive = action({
  args: { interests: v.array(v.string()) },
  handler: async (ctx, args) => {
    const url = new URL('https://gamma-api.polymarket.com/markets');
    url.searchParams.set('closed', 'false');
    url.searchParams.set('limit', '100');
    url.searchParams.set('order', 'volume24hr');
    url.searchParams.set('ascending', 'false');

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Polymarket respondió ${response.status}`);

    const data = (await response.json()) as GammaMarket[];
    const markets = data
      .filter((market) => market.active !== false && !market.closed && market.question)
      .map(normalizeMarket)
      .filter((market): market is NonNullable<ReturnType<typeof normalizeMarket>> => Boolean(market))
      .sort((a, b) => {
        const aInterest = args.interests.includes(a.category) ? 1 : 0;
        const bInterest = args.interests.includes(b.category) ? 1 : 0;
        return bInterest - aInterest || b.volume - a.volume;
      })
      .slice(0, 3)
      .map(({ volume: _volume, ...market }) => market);

    if (markets.length === 3) {
      await ctx.runMutation(internal.markets.replaceCache, { markets });
    }
    return markets;
  },
});

export const replaceCache = internalMutation({
  args: {
    markets: v.array(
      v.object({
        id: v.string(),
        question: v.string(),
        yesProbability: v.number(),
        category: v.string(),
        source: v.literal('polymarket'),
        slug: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const oldMarkets = await ctx.db.query('marketCache').collect();
    await Promise.all(oldMarkets.map((market) => ctx.db.delete(market._id)));
    await Promise.all(
      args.markets.map((market) =>
        ctx.db.insert('marketCache', {
          marketId: market.id,
          question: market.question,
          yesProbability: market.yesProbability,
          category: market.category,
          slug: market.slug,
          fetchedAt: Date.now(),
        }),
      ),
    );
  },
});

function normalizeMarket(market: GammaMarket) {
  const outcomes = parseArray(market.outcomes);
  const prices = parseArray(market.outcomePrices).map(Number);
  if (outcomes.length !== 2 || prices.length !== 2 || prices.some(Number.isNaN)) return null;
  const yesIndex = outcomes.findIndex((outcome) => outcome.toLocaleLowerCase() === 'yes');
  if (yesIndex < 0 || !market.id || !market.question) return null;
  return {
    id: market.id,
    question: market.question,
    yesProbability: prices[yesIndex],
    category: market.category || 'Actualidad',
    source: 'polymarket' as const,
    slug: market.slug || undefined,
    volume: market.volume24hr || 0,
  };
}

function parseArray(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
