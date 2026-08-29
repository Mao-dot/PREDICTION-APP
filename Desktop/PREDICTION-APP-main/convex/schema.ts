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
    status: v.union(v.literal('started'), v.literal('completed')),
    probability: v.optional(v.number()),
    createdAt: v.number(),
  }).index('by_created_at', ['createdAt']),
  answers: defineTable({
    sessionId: v.id('sessions'),
    marketId: v.string(),
    question: v.string(),
    choice: v.union(v.literal('yes'), v.literal('no')),
    marketProbability: v.number(),
    confidence: v.number(),
    createdAt: v.number(),
  }).index('by_session', ['sessionId']),
  marketCache: defineTable({
    marketId: v.string(),
    question: v.string(),
    yesProbability: v.number(),
    category: v.string(),
    slug: v.optional(v.string()),
    fetchedAt: v.number(),
  }).index('by_market_id', ['marketId']),
  voiceEvents: defineTable({
    eventType: v.string(),
    callId: v.optional(v.string()),
    receivedAt: v.number(),
  }),
});
