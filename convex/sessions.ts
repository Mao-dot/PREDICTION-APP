import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { internalMutation, mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';

const marketValidator = v.object({
  id: v.string(),
  question: v.string(),
  yesProbability: v.number(),
  category: v.string(),
  source: v.union(v.literal('polymarket'), v.literal('cache'), v.literal('demo')),
  slug: v.optional(v.string()),
});

const profileValidator = v.object({
  alias: v.string(),
  ageRange: v.string(),
  gender: v.string(),
  country: v.string(),
  interests: v.array(v.string()),
  mode: v.union(v.literal('voice'), v.literal('chat')),
});

const answerValidator = v.object({
  marketId: v.string(),
  question: v.string(),
  choice: v.union(v.literal('yes'), v.literal('no')),
  marketProbability: v.number(),
  confidence: v.number(),
  order: v.number(),
});

const breakdownValidator = v.object({
  marketId: v.string(),
  question: v.string(),
  choice: v.union(v.literal('yes'), v.literal('no')),
  branchProbability: v.number(),
  agreesWithMarket: v.boolean(),
});

const resultValidator = v.object({
  probability: v.number(),
  headline: v.string(),
  paragraphs: v.array(v.string()),
  rating: v.union(v.literal('probable'), v.literal('inestable'), v.literal('improbable')),
  agreementCount: v.number(),
  answerCount: v.number(),
  breakdown: v.array(breakdownValidator),
});

type StoredMarket = NonNullable<Doc<'sessions'>['markets']>[number];

type CanonicalAnswer = {
  marketId: string;
  question: string;
  choice: 'yes' | 'no';
  marketProbability: number;
  confidence: number;
  order: number;
};

type TimelineRating = 'probable' | 'inestable' | 'improbable';

type TimelineResult = {
  probability: number;
  headline: string;
  paragraphs: string[];
  rating: TimelineRating;
  agreementCount: number;
  answerCount: number;
  breakdown: Array<{
    marketId: string;
    question: string;
    choice: 'yes' | 'no';
    branchProbability: number;
    agreesWithMarket: boolean;
  }>;
};

export const create = mutation({
  args: {
    ...profileValidator.fields,
    markets: v.array(marketValidator),
  },
  returns: v.id('sessions'),
  handler: async (ctx, args) => {
    if (args.markets.length !== 3) {
      throw new Error('La partida debe contener exactamente tres mercados');
    }
    const now = Date.now();
    return await ctx.db.insert('sessions', {
      ...args,
      status: 'started',
      currentStep: -1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateProgress = mutation({
  args: {
    sessionId: v.id('sessions'),
    currentStep: v.number(),
    markets: v.optional(v.array(marketValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== 'started') return null;

    let markets = session.markets;
    if (args.markets && session.markets) {
      const savedById = new Map(session.markets.map((market) => [market.id, market]));
      const isSafeReorder =
        args.markets.length === session.markets.length &&
        args.markets.every((market) => savedById.has(market.id));
      if (isSafeReorder) {
        markets = args.markets.map((market) => savedById.get(market.id)!);
      }
    }

    await ctx.db.patch(args.sessionId, {
      currentStep: args.currentStep,
      markets,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const recordAnswer = mutation({
  args: {
    sessionId: v.id('sessions'),
    order: v.number(),
    choice: v.union(v.literal('yes'), v.literal('no')),
    // Accepted temporarily so the previously published client keeps working while this deploy rolls out.
    marketId: v.optional(v.string()),
    question: v.optional(v.string()),
    marketProbability: v.optional(v.number()),
    confidence: v.optional(v.number()),
  },
  returns: v.id('answers'),
  handler: async (ctx, args) => {
    const duplicate = await ctx.db
      .query('answers')
      .withIndex('by_session_and_order', (q) =>
        q.eq('sessionId', args.sessionId).eq('order', args.order),
      )
      .unique();
    if (duplicate) return duplicate._id;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== 'started') {
      throw new Error('La partida ya no acepta respuestas');
    }
    if (!Number.isInteger(args.order) || args.order < 0) {
      throw new Error('Orden de respuesta inválido');
    }

    const market = session.markets?.[args.order];
    if (!market) throw new Error('El mercado no pertenece a esta partida');
    const confidence = args.choice === 'yes' ? market.yesProbability : 1 - market.yesProbability;

    const answerId = await ctx.db.insert('answers', {
      sessionId: args.sessionId,
      order: args.order,
      marketId: market.id,
      question: market.question,
      choice: args.choice,
      marketProbability: market.yesProbability,
      confidence,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.sessionId, {
      currentStep: args.order + 1,
      updatedAt: Date.now(),
    });
    return answerId;
  },
});

export const finalize = mutation({
  args: { sessionId: v.id('sessions') },
  returns: resultValidator,
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error('Partida no encontrada');
    return await finalizeStoredSession(ctx, session);
  },
});

// Compatibility endpoint for the previously published client. Supplied result fields are ignored.
export const complete = mutation({
  args: {
    sessionId: v.id('sessions'),
    probability: v.number(),
    headline: v.string(),
    paragraphs: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    await finalizeStoredSession(ctx, session);
    return null;
  },
});

export const abandon = mutation({
  args: { sessionId: v.id('sessions') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (session?.status === 'started') {
      await ctx.db.patch(args.sessionId, {
        status: 'abandoned',
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const get = query({
  args: { sessionId: v.id('sessions') },
  returns: v.union(
    v.null(),
    v.object({
      profile: profileValidator,
      markets: v.array(marketValidator),
      answers: v.array(answerValidator),
      status: v.union(v.literal('started'), v.literal('completed'), v.literal('abandoned')),
      currentStep: v.number(),
      result: v.union(v.null(), resultValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.markets) return null;

    const rows = await ctx.db
      .query('answers')
      .withIndex('by_session_and_order', (q) => q.eq('sessionId', args.sessionId))
      .take(3);
    const answers = canonicalizeAnswers(session.markets, rows);
    const result =
      session.status === 'completed' && answers.length === session.markets.length
        ? buildTimelineResult(session.alias, answers)
        : null;

    return {
      profile: {
        alias: session.alias,
        ageRange: session.ageRange,
        gender: session.gender,
        country: session.country,
        interests: session.interests,
        mode: session.mode,
      },
      markets: session.markets,
      answers,
      status: session.status,
      currentStep: session.currentStep ?? answers.length,
      result,
    };
  },
});

export const storeVoiceEvent = internalMutation({
  args: {
    eventType: v.string(),
    callId: v.optional(v.string()),
  },
  returns: v.id('voiceEvents'),
  handler: async (ctx, args) =>
    ctx.db.insert('voiceEvents', { ...args, receivedAt: Date.now() }),
});

async function finalizeStoredSession(
  ctx: MutationCtx,
  session: Doc<'sessions'>,
): Promise<TimelineResult> {
  if (!session.markets || session.markets.length !== 3) {
    throw new Error('La partida no tiene tres mercados válidos');
  }

  const rows = await ctx.db
    .query('answers')
    .withIndex('by_session_and_order', (q) => q.eq('sessionId', session._id))
    .take(3);
  const answers = canonicalizeAnswers(session.markets, rows);
  if (answers.length !== session.markets.length) {
    throw new Error('Faltan respuestas para calcular esta línea temporal');
  }

  const result = buildTimelineResult(session.alias, answers);
  const now = Date.now();
  await ctx.db.patch(session._id, {
    status: 'completed',
    currentStep: session.markets.length,
    probability: result.probability,
    agreementCount: result.agreementCount,
    answerCount: result.answerCount,
    timelineRating: result.rating,
    finalBreakdown: result.breakdown,
    finalHeadline: result.headline,
    finalStory: result.paragraphs,
    completedAt: now,
    updatedAt: now,
  });
  return result;
}

function canonicalizeAnswers(
  markets: StoredMarket[],
  rows: Doc<'answers'>[],
): CanonicalAnswer[] {
  return rows
    .flatMap((row) => {
      const order = row.order;
      if (order === undefined || !Number.isInteger(order)) return [];
      const market = markets[order];
      if (!market) return [];
      return [
        {
          marketId: market.id,
          question: market.question,
          choice: row.choice,
          marketProbability: market.yesProbability,
          confidence: row.choice === 'yes' ? market.yesProbability : 1 - market.yesProbability,
          order,
        },
      ];
    })
    .sort((left, right) => left.order - right.order);
}

function buildTimelineResult(alias: string, answers: CanonicalAnswer[]): TimelineResult {
  const breakdown = answers.map((answer) => ({
    marketId: answer.marketId,
    question: answer.question,
    choice: answer.choice,
    branchProbability: answer.confidence,
    agreesWithMarket: answer.confidence >= 0.5,
  }));
  const product = breakdown.reduce(
    (total, item) => total * Math.min(1, Math.max(0, item.branchProbability)),
    1,
  );
  const probability = answers.length
    ? Math.round(Math.pow(product, 1 / answers.length) * 100)
    : 0;
  const agreementCount = breakdown.filter((item) => item.agreesWithMarket).length;
  const rating = ratingForProbability(probability);
  const yesCount = answers.filter((answer) => answer.choice === 'yes').length;
  const direction = yesCount >= 2 ? 'aceptaste el cambio' : 'intentaste detenerlo';
  const decisions = answers
    .map(
      (answer) =>
        `${answer.choice === 'yes' ? 'creíste' : 'no creíste'} que ${lowerFirst(answer.question)}`,
    )
    .join('; ');

  return {
    probability,
    headline:
      rating === 'probable'
        ? 'La señal permanece'
        : rating === 'inestable'
          ? 'La señal se divide'
          : 'La señal colapsa',
    paragraphs: [
      `${alias}, no te llamé desde el futuro. Te llamé desde el final de tus propias decisiones. Soy tú.`,
      `En esta línea temporal ${direction}: ${decisions}. Cada respuesta parecía pequeña, pero juntas construyeron el mundo desde el que estoy hablando.`,
      `Según el consenso de los mercados, esta línea es ${rating}. Ahora que la conoces, quizá ya la cambiaste.`,
    ],
    rating,
    agreementCount,
    answerCount: answers.length,
    breakdown,
  };
}

function ratingForProbability(probability: number): TimelineRating {
  if (probability >= 65) return 'probable';
  if (probability >= 40) return 'inestable';
  return 'improbable';
}

function lowerFirst(value: string): string {
  const clean = value.replace(/^¿/, '').replace(/\?$/, '');
  return clean.charAt(0).toLocaleLowerCase('es') + clean.slice(1);
}
