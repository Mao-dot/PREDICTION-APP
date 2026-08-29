import { v } from 'convex/values';

import { internalMutation, mutation, query } from './_generated/server';

export const create = mutation({
  args: {
    alias: v.string(),
    ageRange: v.string(),
    gender: v.string(),
    country: v.string(),
    interests: v.array(v.string()),
    mode: v.union(v.literal('voice'), v.literal('chat')),
  },
  handler: async (ctx, args) =>
    ctx.db.insert('sessions', {
      ...args,
      status: 'started',
      createdAt: Date.now(),
    }),
});

export const recordAnswer = mutation({
  args: {
    sessionId: v.id('sessions'),
    marketId: v.string(),
    question: v.string(),
    choice: v.union(v.literal('yes'), v.literal('no')),
    marketProbability: v.number(),
    confidence: v.number(),
  },
  handler: async (ctx, args) =>
    ctx.db.insert('answers', {
      ...args,
      createdAt: Date.now(),
    }),
});

export const complete = mutation({
  args: { sessionId: v.id('sessions'), probability: v.number() },
  handler: async (ctx, args) =>
    ctx.db.patch(args.sessionId, { status: 'completed', probability: args.probability }),
});

export const get = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    const answers = await ctx.db
      .query('answers')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect();
    return { session, answers };
  },
});

export const storeVoiceEvent = internalMutation({
  args: {
    eventType: v.string(),
    callId: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    ctx.db.insert('voiceEvents', { ...args, receivedAt: Date.now() }),
});
