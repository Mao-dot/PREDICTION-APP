import { v } from 'convex/values';

import { internal } from './_generated/api';
import { action, env, internalMutation, internalQuery } from './_generated/server';
import type { ActionCtx } from './_generated/server';

const marketValidator = v.object({
  id: v.string(),
  question: v.string(),
  yesProbability: v.number(),
  category: v.string(),
  source: v.union(v.literal('polymarket'), v.literal('cache')),
  slug: v.optional(v.string()),
});

const selectionValidator = v.object({
  markets: v.array(marketValidator),
  source: v.union(
    v.literal('live'),
    v.literal('cache'),
    v.literal('unavailable'),
  ),
  freshness: v.union(
    v.literal('fresh'),
    v.literal('stale'),
    v.literal('unavailable'),
  ),
  fetchedAt: v.union(v.number(), v.null()),
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
  clarity: number;
  score: number;
  tokens: Set<string>;
};

type CachedMarketSet = {
  markets: SelectedMarket[];
  fetchedAt: number | null;
  expiresAt: number | null;
};

type MarketSelection = {
  markets: SelectedMarket[];
  source: 'live' | 'cache' | 'unavailable';
  freshness: 'fresh' | 'stale' | 'unavailable';
  fetchedAt: number | null;
};

const FRESH_CACHE_MS = 5 * 60 * 1000;
const STALE_CACHE_MS = 24 * 60 * 60 * 1000;
const CACHE_VERSION = 'publico-es-v1';

const BLOCKED_TOPIC_TERMS = [
  'altcoin',
  'bitcoin',
  'blockchain',
  'blockchains',
  'btc',
  'coinbase',
  'crypto',
  'cryptocurrencies',
  'cryptocurrency',
  'defi',
  'dogecoin',
  'eth',
  'ethereum',
  'memecoin',
  'nft',
  'solana',
  'stablecoin',
  'token',
  'tokens',
  'xrp',
];

const BLOCKED_QUESTION_TERMS = [
  'all time high',
  'basis point',
  'basis points',
  'bps',
  'fdv',
  'fully diluted',
  'interest rate basis',
  'market cap',
  'market caps',
  'market capitalization',
  'over under',
  'price target',
  'spread',
  'strike price',
  'trading volume',
  'yield curve',
];

const BLOCKED_TECHNICAL_ACRONYMS = /\b(?:AGI|API|ETF|FDV|IPO|LLM|NFT|TVL)\b/;

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
  handler: async (ctx, args): Promise<SelectedMarket[]> =>
    (await selectMarketSet(ctx, args.interests)).markets,
});

export const getSelection = action({
  args: { interests: v.array(v.string()) },
  returns: selectionValidator,
  handler: async (ctx, args): Promise<MarketSelection> =>
    selectMarketSet(ctx, args.interests),
});

export const getCached = internalQuery({
  args: { cacheKey: v.string() },
  returns: v.object({
    markets: v.array(marketValidator),
    fetchedAt: v.union(v.number(), v.null()),
    expiresAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args): Promise<CachedMarketSet> => {
    const rows = await ctx.db
      .query('marketCache')
      .withIndex('by_cache_key_and_rank', (q) =>
        q.eq('cacheKey', args.cacheKey),
      )
      .take(3);
    return {
      markets: rows
        .map((market) => ({
          id: market.marketId,
          question: market.question,
          yesProbability: market.yesProbability,
          category: market.category,
          source: 'cache' as const,
          slug: market.slug,
        }))
        .filter((market) => isSafeLocalizedQuestion(market.question)),
      fetchedAt: rows[0]?.fetchedAt ?? null,
      expiresAt: rows[0]?.expiresAt ?? null,
    };
  },
});

export const replaceCache = internalMutation({
  args: {
    cacheKey: v.string(),
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
    const oldMarkets = await ctx.db
      .query('marketCache')
      .withIndex('by_cache_key_and_rank', (q) =>
        q.eq('cacheKey', args.cacheKey),
      )
      .take(12);
    for (const market of oldMarkets) await ctx.db.delete(market._id);

    const fetchedAt = Date.now();
    for (const [rank, market] of args.markets.entries()) {
      await ctx.db.insert('marketCache', {
        cacheKey: args.cacheKey,
        rank,
        marketId: market.id,
        question: market.question,
        yesProbability: market.yesProbability,
        category: market.category,
        slug: market.slug,
        fetchedAt,
        expiresAt: fetchedAt + FRESH_CACHE_MS,
      });
    }
    return null;
  },
});

async function selectMarketSet(
  ctx: ActionCtx,
  interests: string[],
): Promise<MarketSelection> {
  const cacheKey = buildCacheKey(interests);
  const now = Date.now();
  const cached: CachedMarketSet = await ctx.runQuery(
    internal.markets.getCached,
    {
      cacheKey,
    },
  );

  if (
    cached.markets.length === 3 &&
    cached.expiresAt !== null &&
    cached.expiresAt > now
  ) {
    return {
      markets: cached.markets,
      source: 'cache',
      freshness: 'fresh',
      fetchedAt: cached.fetchedAt,
    };
  }

  try {
    const url = new URL('https://gamma-api.polymarket.com/markets');
    url.searchParams.set('closed', 'false');
    // Including tags makes 200 markets exceed Convex's fetch response budget,
    // which truncates the JSON and forces the client into demo mode.
    url.searchParams.set('limit', '50');
    url.searchParams.set('order', 'volume24hr');
    url.searchParams.set('ascending', 'false');
    url.searchParams.set('include_tag', 'true');

    const response = await fetch(url, { signal: AbortSignal.timeout(6_000) });
    if (!response.ok)
      throw new Error(`Polymarket respondió ${response.status}`);

    const payload: unknown = await response.json();
    if (!Array.isArray(payload))
      throw new Error('Polymarket devolvió un formato inesperado');

    const candidates = payload
      .map((market) => normalizeMarket(market as GammaMarket, interests, now))
      .filter((market): market is Candidate => market !== null)
      .sort((a, b) => b.score - a.score);
    const relevant = candidates.filter((market) => market.relevance > 0);
    const selectionPool =
      relevant.length >= 3
        ? relevant
        : [
            ...relevant,
            ...candidates.filter((market) => market.relevance === 0),
          ];
    const selectedCandidates = selectDiverseMarkets(selectionPool, 3).map(
      stripRankingFields,
    );
    const selected =
      selectedCandidates.length === 3
        ? await localizeSelectedMarkets(selectedCandidates)
        : selectedCandidates;

    if (selected.length === 3) {
      await ctx.runMutation(internal.markets.replaceCache, {
        cacheKey,
        markets: selected.map((market) => ({
          ...market,
          source: 'polymarket' as const,
        })),
      });
      return {
        markets: selected,
        source: 'live',
        freshness: 'fresh',
        fetchedAt: now,
      };
    }
  } catch (error) {
    console.warn('No se pudieron actualizar los mercados de Polymarket', error);
  }

  const canUseStaleCache =
    cached.markets.length === 3 &&
    cached.fetchedAt !== null &&
    now - cached.fetchedAt <= STALE_CACHE_MS;
  if (canUseStaleCache) {
    return {
      markets: cached.markets,
      source: 'cache',
      freshness: 'stale',
      fetchedAt: cached.fetchedAt,
    };
  }
  return {
    markets: [],
    source: 'unavailable',
    freshness: 'unavailable',
    fetchedAt: null,
  };
}

function normalizeMarket(
  market: GammaMarket,
  interests: string[],
  now: number,
): Candidate | null {
  const outcomes = parseArray(market.outcomes);
  const prices = parseArray(market.outcomePrices).map(Number);
  if (
    outcomes.length !== 2 ||
    prices.length !== 2 ||
    prices.some((price) => !Number.isFinite(price))
  ) {
    return null;
  }

  const yesIndex = outcomes.findIndex(
    (outcome) => normalizeText(outcome) === 'yes',
  );
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

  const tags = (market.tags ?? [])
    .flatMap((tag) => [tag.label, tag.slug])
    .filter(isString);
  const event = market.events?.[0];
  const searchableText = normalizeText(
    [
      market.question,
      market.description,
      market.category,
      event?.title,
      event?.category,
      ...tags,
    ]
      .filter(isString)
      .join(' '),
  );
  const question = market.question.trim();
  if (!isAccessibleMarket(question, searchableText)) return null;

  const category =
    inferCategory(searchableText, tags) ?? market.category ?? 'Actualidad';
  const volume =
    numericValue(market.volume24hr) || numericValue(market.volumeNum);
  const liquidity =
    numericValue(market.liquidityNum) || numericValue(market.liquidity);
  const relevance = interestRelevance(searchableText, interests);
  const clarity = clarityScore(question);
  const uncertainty = 1 - Math.abs(yesProbability - 0.5) * 2;
  const activity =
    Math.min(6, Math.log10(volume + 1)) +
    Math.min(4, Math.log10(liquidity + 1));
  const extremePenalty = yesProbability < 0.02 || yesProbability > 0.98 ? 4 : 0;

  return {
    id: market.id,
    question,
    yesProbability,
    category,
    source: 'polymarket',
    slug: market.slug || undefined,
    eventId: event?.id || undefined,
    relevance,
    clarity,
    score:
      relevance * 5 + clarity * 2 + uncertainty * 5 + activity - extremePenalty,
    tokens: meaningfulTokens(searchableText),
  };
}

function selectDiverseMarkets(
  candidates: Candidate[],
  limit: number,
): Candidate[] {
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
      const sameCategory = selected.some(
        (chosen) => chosen.category === candidate.category,
      );
      const similarity = selected.reduce(
        (highest, chosen) =>
          Math.max(highest, jaccard(candidate.tokens, chosen.tokens)),
        0,
      );
      const diversityScore =
        candidate.score -
        similarity * 10 -
        (sameEvent ? 8 : 0) +
        (!sameCategory ? 1.5 : 0);

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
      const tagMatch = normalizedTags.some((tag) =>
        containsKeyword(tag, normalizedKeyword),
      );
      return (
        total +
        (tagMatch
          ? 3
          : containsKeyword(searchableText, normalizedKeyword)
            ? 1
            : 0)
      );
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

function interestRelevance(
  searchableText: string,
  interests: string[],
): number {
  return interests.reduce((total, interest) => {
    const keywords = TOPIC_KEYWORDS[interest] ?? [interest];
    const matches = keywords.filter((keyword) =>
      containsKeyword(searchableText, normalizeText(keyword)),
    ).length;
    return total + Math.min(matches, 4);
  }, 0);
}

function meaningfulTokens(text: string): Set<string> {
  const ignored = new Set([
    'will',
    'the',
    'a',
    'an',
    'in',
    'on',
    'of',
    'to',
    'be',
    'by',
    'and',
  ]);
  return new Set(
    text.split(' ').filter((token) => token.length > 2 && !ignored.has(token)),
  );
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

function buildCacheKey(interests: string[]): string {
  const normalized = [
    ...new Set(interests.map(normalizeText).filter(Boolean)),
  ].sort();
  return `${CACHE_VERSION}:${normalized.length ? normalized.join('|') : 'actualidad'}`;
}

function isAccessibleMarket(question: string, searchableText: string): boolean {
  const normalizedQuestion = normalizeText(question);
  if (question.length < 18 || question.length > 180) return false;
  if (!question.includes('?')) return false;
  if (BLOCKED_TECHNICAL_ACRONYMS.test(question)) return false;
  if (BLOCKED_TOPIC_TERMS.some((term) => containsKeyword(searchableText, term)))
    return false;
  if (
    BLOCKED_QUESTION_TERMS.some((term) =>
      containsKeyword(normalizedQuestion, term),
    )
  )
    return false;
  if (/[$€£¥]|\b\d+(?:\.\d+)?\s*%/.test(question)) return false;
  if (
    /\b(?:above|below|higher|lower|price|valuation|odds)\b/.test(
      normalizedQuestion,
    )
  ) {
    return false;
  }
  return clarityScore(question) >= 3;
}

function clarityScore(question: string): number {
  const normalized = normalizeText(question);
  const wordCount = normalized.split(' ').filter(Boolean).length;
  let score = 0;

  if (wordCount >= 5 && wordCount <= 22) score += 2;
  if (/^(will|is|are|can|could|does|do|did|has|have)\b/.test(normalized))
    score += 2;
  if (
    /\b(?:before|after|by|during|in)\b/.test(normalized) ||
    /\b(?:20\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(
      normalized,
    )
  ) {
    score += 2;
  }
  if (!/[()[\]{}:;]/.test(question)) score += 1;
  return score;
}

async function localizeSelectedMarkets(
  markets: SelectedMarket[],
): Promise<SelectedMarket[]> {
  if (markets.every((market) => isSafeLocalizedQuestion(market.question)))
    return markets;

  const apiKey = env.LLM_API_KEY;
  if (!apiKey)
    throw new Error('No hay una traducción segura al español disponible');
  const endpoint =
    env.LLM_API_URL ||
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  const model = env.LLM_MODEL || 'gemini-2.5-flash';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(7_000),
    body: JSON.stringify({
      model,
      temperature: 0.05,
      max_tokens: 320,
      messages: [
        {
          role: 'system',
          content: [
            'Traduce preguntas binarias de actualidad a español latino neutro y natural para público general.',
            'Conserva exactamente las personas, organizaciones, lugares, fechas, cantidades y condición de resolución de cada pregunta.',
            'No resumas, no agregues contexto, no sustituyas nombres, no inventes hechos y no cambies el sentido.',
            'Desarrolla cualquier acrónimo técnico que una persona sin conocimientos especializados no entendería.',
            'Evita lenguaje de apuestas. Devuelve exclusivamente JSON válido con la forma {"questions":[{"id":"...","question":"¿...?"}]}.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify(
            markets.map((market) => ({
              id: market.id,
              question: market.question,
            })),
          ),
        },
      ],
    }),
  });
  if (!response.ok)
    throw new Error(
      `No se pudieron traducir las preguntas (${response.status})`,
    );

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('La traducción no devolvió contenido');
  const translated = parseTranslatedQuestions(content);
  const byId = new Map(translated.map((item) => [item.id, item.question]));

  return markets.map((market) => {
    const question = byId.get(market.id);
    if (!question || !isSafeLocalizedQuestion(question)) {
      throw new Error(`La traducción de ${market.id} no es válida`);
    }
    return { ...market, question };
  });
}

function parseTranslatedQuestions(
  content: string,
): Array<{ id: string; question: string }> {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const parsed: unknown = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || !('questions' in parsed))
    return [];
  const questions = (parsed as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) return [];
  return questions.filter((item): item is { id: string; question: string } =>
    Boolean(
      item &&
      typeof item === 'object' &&
      'id' in item &&
      typeof item.id === 'string' &&
      'question' in item &&
      typeof item.question === 'string',
    ),
  );
}

function isSafeLocalizedQuestion(question: string): boolean {
  const normalized = normalizeText(question);
  const englishSignals =
    normalized.match(/\b(?:will|the|before|after|with|from|win|be)\b/g)
      ?.length ?? 0;
  if (
    !question.startsWith('¿') ||
    !question.endsWith('?') ||
    englishSignals >= 2
  )
    return false;
  if (BLOCKED_TECHNICAL_ACRONYMS.test(question)) return false;
  if (BLOCKED_TOPIC_TERMS.some((term) => containsKeyword(normalized, term)))
    return false;
  if (BLOCKED_QUESTION_TERMS.some((term) => containsKeyword(normalized, term)))
    return false;
  return question.length >= 18 && question.length <= 200;
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
