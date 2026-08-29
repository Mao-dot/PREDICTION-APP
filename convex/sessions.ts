import { v } from 'convex/values';

import { internalMutation, mutation, query } from './_generated/server';

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

const resultValidator = v.object({
  probability: v.number(),
  headline: v.string(),
  paragraphs: v.array(v.string()),
});

export const create = mutation({
  args: {
    ...profileValidator.fields,
    markets: v.array(marketValidator),
  },
  returns: v.id('sessions'),
  handler: async (ctx, args) => {
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
    await ctx.db.patch(args.sessionId, {
      currentStep: args.currentStep,
      markets: args.markets ?? session.markets,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const recordAnswer = mutation({
  args: {
    sessionId: v.id('sessions'),
    order: v.number(),
    marketId: v.string(),
    question: v.string(),
    choice: v.union(v.literal('yes'), v.literal('no')),
    marketProbability: v.number(),
    confidence: v.number(),
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

    const answerId = await ctx.db.insert('answers', {
      ...args,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.sessionId, {
      currentStep: args.order + 1,
      updatedAt: Date.now(),
    });
    return answerId;
  },
});

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
    const now = Date.now();
    await ctx.db.patch(args.sessionId, {
      status: 'completed',
      currentStep: session.markets?.length ?? session.currentStep,
      probability: args.probability,
      finalHeadline: args.headline,
      finalStory: args.paragraphs,
      completedAt: now,
      updatedAt: now,
    });
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
    const answers = rows
      .map((answer) => ({
        marketId: answer.marketId,
        question: answer.question,
        choice: answer.choice,
        marketProbability: answer.marketProbability,
        confidence: answer.confidence,
        order: answer.order ?? 0,
      }))
      .sort((left, right) => left.order - right.order);
    const result =
      session.probability !== undefined &&
      session.finalHeadline !== undefined &&
      session.finalStory !== undefined
        ? {
            probability: session.probability,
            headline: session.finalHeadline,
            paragraphs: session.finalStory,
          }
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
