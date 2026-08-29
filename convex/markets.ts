import { v } from 'convex/values';

import { internal } from './_generated/api';
import { action, internalMutation, internalQuery } from './_generated/server';

const marketValidator = v.object({
  id: v.string(),
  question: v.string(),
  yesProbability: v.number(),
  category: v.string(),
  source: v.union(v.literal('polymarket'), v.literal('cache')),
  slug: v.optional(v.string()),
});

type SelectedMarket = {
  id: string;
  question: string;
  yesProbability: number;
  category: string;
  source: 'polymarket' | 'cache';
  slug?: string;
};

type GammaTag = {
  label?: string | null;
  slug?: string | null;
};

type GammaEvent = {
  id?: string | null;
  title?: string | null;
  category?: string | null;
};

type GammaMarket = {
  id?: string;
  question?: string | null;
  description?: string | null;
  outcomePrices?: string | string[] | null;
  outcomes?: string | string[] | null;
  category?: string | null;
  slug?: string | null;
  active?: boolean | null;
  closed?: boolean | null;
  volume24hr?: number | string | null;
  volumeNum?: number | string | null;
  liquidityNum?: number | string | null;
  liquidity?: number | string | null;
  endDate?: string | null;
  tags?: GammaTag[] | null;
  events?: GammaEvent[] | null;
};

type Candidate = SelectedMarket & {
  eventId?: string;
  relevance: number;
  score: number;
  tokens: Set<string>;
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  Tecnología: [
    'technology',
    'tech',
    'artificial intelligence',
    'ai',
    'openai',
    'robot',
    'software',
    'chip',
    'apple',
    'google',
  ],
  Política: [
    'politics',
    'president',
    'election',
    'government',
    'congress',
    'senate',
    'minister',
    'vote',
  ],
  Economía: [
    'economy',
    'economic',
    'fed',
    'interest rate',
    'inflation',
    'recession',
    'gdp',
    'tariff',
    'stock market',
  ],
  Deportes: [
    'sports',
    'soccer',
    'football',
    'basketball',
    'baseball',
    'tennis',
    'nba',
    'nfl',
    'world cup',
    'championship',
  ],
  Ciencia: [
    'science',
    'medicine',
    'health',
    'climate',
    'research',
    'vaccine',
    'disease',
    'energy',
  ],
  Cultura: [
    'culture',
    'entertainment',
    'movie',
    'film',
    'music',
    'oscars',
    'grammy',
    'television',
    'celebrity',
  ],
  Cripto: ['crypto', 'bitcoin', 'ethereum', 'solana', 'blockchain', 'token'],
  Espacio: ['space', 'spacex', 'nasa', 'moon', 'mars', 'rocket', 'astronaut'],
};

export const getLive = action({
  args: { interests: v.array(v.string()) },
  returns: v.array(marketValidator),
  handler: async (ctx, args): Promise<SelectedMarket[]> => {
    try {
      const url = new URL('https://gamma-api.polymarket.com/markets');
      url.searchParams.set('closed', 'false');
      url.searchParams.set('limit', '200');
      url.searchParams.set('order', 'volume24hr');
      url.searchParams.set('ascending', 'false');
      url.searchParams.set('include_tag', 'true');

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Polymarket respondió ${response.status}`);

      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) throw new Error('Polymarket devolvió un formato inesperado');

      const now = Date.now();
      const candidates = payload
        .map((market) => normalizeMarket(market as GammaMarket, args.interests, now))
        .filter((market): market is Candidate => market !== null)
        .sort((a, b) => b.score - a.score);
      const relevant = candidates.filter((market) => market.relevance > 0);
      const selectionPool =
        relevant.length >= 3
          ? relevant
          : [...relevant, ...candidates.filter((market) => market.relevance === 0)];
      const selected = selectDiverseMarkets(selectionPool, 3).map(stripRankingFields);

      if (selected.length === 3) {
        await ctx.runMutation(internal.markets.replaceCache, {
          markets: selected.map((market) => ({ ...market, source: 'polymarket' as const })),
        });
        return selected;
      }
    } catch (error) {
      console.warn('No se pudieron actualizar los mercados de Polymarket', error);
    }

    const cached: SelectedMarket[] = await ctx.runQuery(internal.markets.getCached, {});
    return cached;
  },
});

export const getCached = internalQuery({
  args: {},
  returns: v.array(marketValidator),
  handler: async (ctx): Promise<SelectedMarket[]> => {
    const rows = await ctx.db.query('marketCache').order('desc').take(3);
    return rows.map((market) => ({
      id: market.marketId,
      question: market.question,
      yesProbability: market.yesProbability,
      category: market.category,
      source: 'cache' as const,
      slug: market.slug,
    }));
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
  returns: v.null(),
  handler: async (ctx, args) => {
    const oldMarkets = await ctx.db.query('marketCache').order('desc').take(12);
    for (const market of oldMarkets) await ctx.db.delete(market._id);

    const fetchedAt = Date.now();
    for (const market of args.markets) {
      await ctx.db.insert('marketCache', {
        marketId: market.id,
        question: market.question,
        yesProbability: market.yesProbability,
        category: market.category,
        slug: market.slug,
        fetchedAt,
      });
    }
    return null;
  },
});

function normalizeMarket(
  market: GammaMarket,
  interests: string[],
  now: number,
): Candidate | null {
  const outcomes = parseArray(market.outcomes);
  const prices = parseArray(market.outcomePrices).map(Number);
  if (outcomes.length !== 2 || prices.length !== 2 || prices.some((price) => !Number.isFinite(price))) {
    return null;
  }

  const yesIndex = outcomes.findIndex((outcome) => normalizeText(outcome) === 'yes');
  const yesProbability = prices[yesIndex];
  if (
    yesIndex < 0 ||
    !market.id ||
    !market.question?.trim() ||
    yesProbability < 0 ||
    yesProbability > 1
  ) {
    return null;
  }

  const endDate = market.endDate ? Date.parse(market.endDate) : Number.NaN;
  if (Number.isFinite(endDate) && endDate <= now) return null;

  const tags = (market.tags ?? []).flatMap((tag) => [tag.label, tag.slug]).filter(isString);
  const event = market.events?.[0];
  const searchableText = normalizeText(
    [market.question, market.description, market.category, event?.title, event?.category, ...tags]
      .filter(isString)
      .join(' '),
  );
  const category = inferCategory(searchableText, tags) ?? market.category ?? 'Actualidad';
  const volume = numericValue(market.volume24hr) || numericValue(market.volumeNum);
  const liquidity = numericValue(market.liquidityNum) || numericValue(market.liquidity);
  const relevance = interestRelevance(searchableText, interests);
  const uncertainty = 1 - Math.abs(yesProbability - 0.5) * 2;
  const activity = Math.min(6, Math.log10(volume + 1)) + Math.min(4, Math.log10(liquidity + 1));
  const extremePenalty = yesProbability < 0.02 || yesProbability > 0.98 ? 4 : 0;

  return {
    id: market.id,
    question: market.question.trim(),
    yesProbability,
    category,
    source: 'polymarket',
    slug: market.slug || undefined,
    eventId: event?.id || undefined,
    relevance,
    score: relevance * 5 + uncertainty * 5 + activity - extremePenalty,
    tokens: meaningfulTokens(searchableText),
  };
}

function selectDiverseMarkets(candidates: Candidate[], limit: number): Candidate[] {
  const selected: Candidate[] = [];
  const remaining = [...candidates];

  while (selected.length < limit && remaining.length) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const sameEvent = selected.some(
        (chosen) => candidate.eventId && chosen.eventId === candidate.eventId,
      );
      const sameCategory = selected.some((chosen) => chosen.category === candidate.category);
      const similarity = selected.reduce(
        (highest, chosen) => Math.max(highest, jaccard(candidate.tokens, chosen.tokens)),
        0,
      );
      const diversityScore =
        candidate.score - similarity * 10 - (sameEvent ? 8 : 0) + (!sameCategory ? 1.5 : 0);

      if (diversityScore > bestScore) {
        bestScore = diversityScore;
        bestIndex = index;
      }
    }

    selected.push(remaining.splice(bestIndex, 1)[0]);
  }

  return selected;
}

function stripRankingFields(candidate: Candidate): SelectedMarket {
  return {
    id: candidate.id,
    question: candidate.question,
    yesProbability: candidate.yesProbability,
    category: candidate.category,
    source: candidate.source,
    slug: candidate.slug,
  };
}

function inferCategory(searchableText: string, tags: string[]): string | null {
  const normalizedTags = tags.map(normalizeText);
  let bestCategory: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const score = keywords.reduce((total, keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      const tagMatch = normalizedTags.some((tag) => containsKeyword(tag, normalizedKeyword));
      return total + (tagMatch ? 3 : containsKeyword(searchableText, normalizedKeyword) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

function interestRelevance(searchableText: string, interests: string[]): number {
  return interests.reduce((total, interest) => {
    const keywords = TOPIC_KEYWORDS[interest] ?? [interest];
    const matches = keywords.filter((keyword) =>
      containsKeyword(searchableText, normalizeText(keyword)),
    ).length;
    return total + Math.min(matches, 4);
  }, 0);
}

function meaningfulTokens(text: string): Set<string> {
  const ignored = new Set(['will', 'the', 'a', 'an', 'in', 'on', 'of', 'to', 'be', 'by', 'and']);
  return new Set(text.split(' ').filter((token) => token.length > 2 && !ignored.has(token)));
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function containsKeyword(text: string, keyword: string): boolean {
  return ` ${text} `.includes(` ${keyword} `);
}

function numericValue(value: number | string | null | undefined): number {
  const number = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function isString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseArray(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
