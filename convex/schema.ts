import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  sessions: defineTable({
    alias: v.string(),
    ageRange: v.string(),
    gender: v.string(),
    country: v.string(),
    interests: v.array(v.string()),
    mode: v.union(v.literal('voice'), v.literal('chat')),
    status: v.union(v.literal('started'), v.literal('completed'), v.literal('abandoned')),
    markets: v.optional(
      v.array(
        v.object({
          id: v.string(),
          question: v.string(),
          yesProbability: v.number(),
          category: v.string(),
          source: v.union(v.literal('polymarket'), v.literal('cache'), v.literal('demo')),
          slug: v.optional(v.string()),
        }),
      ),
    ),
    currentStep: v.optional(v.number()),
    probability: v.optional(v.number()),
    agreementCount: v.optional(v.number()),
    answerCount: v.optional(v.number()),
    timelineRating: v.optional(
      v.union(v.literal('probable'), v.literal('inestable'), v.literal('improbable')),
    ),
    finalBreakdown: v.optional(
      v.array(
        v.object({
          marketId: v.string(),
          question: v.string(),
          choice: v.union(v.literal('yes'), v.literal('no')),
          branchProbability: v.number(),
          agreesWithMarket: v.boolean(),
        }),
      ),
    ),
    finalHeadline: v.optional(v.string()),
    finalStory: v.optional(v.array(v.string())),
    completedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index('by_created_at', ['createdAt']),
  answers: defineTable({
    sessionId: v.id('sessions'),
    order: v.optional(v.number()),
    marketId: v.string(),
    question: v.string(),
    choice: v.union(v.literal('yes'), v.literal('no')),
    marketProbability: v.number(),
    confidence: v.number(),
    createdAt: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_session_and_order', ['sessionId', 'order']),
  marketCache: defineTable({
    cacheKey: v.optional(v.string()),
    rank: v.optional(v.number()),
    marketId: v.string(),
    question: v.string(),
    yesProbability: v.number(),
    category: v.string(),
    slug: v.optional(v.string()),
    fetchedAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index('by_market_id', ['marketId'])
    .index('by_cache_key_and_rank', ['cacheKey', 'rank']),
  voiceEvents: defineTable({
    eventType: v.string(),
    callId: v.optional(v.string()),
    receivedAt: v.number(),
  }),
});
