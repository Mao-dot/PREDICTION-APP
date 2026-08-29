import { defineApp } from 'convex/server';
import { v } from 'convex/values';

export default defineApp({
  env: {
    LLM_API_KEY: v.optional(v.string()),
    LLM_API_URL: v.optional(v.string()),
    LLM_MODEL: v.optional(v.string()),
    VAPI_WEBHOOK_SECRET: v.optional(v.string()),
  },
});
