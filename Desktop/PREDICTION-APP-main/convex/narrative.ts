import { v } from 'convex/values';

import { action } from './_generated/server';

export const reply = action({
  args: {
    alias: v.string(),
    country: v.string(),
    interests: v.array(v.string()),
    userMessage: v.string(),
    nextQuestion: v.optional(v.string()),
    fallback: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) return null;
    const endpoint =
      process.env.LLM_API_URL ||
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const model = process.env.LLM_MODEL || 'gemini-2.5-flash';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.72,
        max_tokens: 90,
        messages: [
          {
            role: 'system',
            content: `Eres una voz misteriosa que llama desde el futuro a ${args.alias}, de ${args.country}. En realidad eres su versión futura, pero no lo reveles todavía. Sus intereses son ${args.interests.join(', ')}. Responde en español con una o dos frases breves, inquietantes y naturales. Si recibes una siguiente pregunta, enlázala orgánicamente y repítela sin cambiar su significado. No inventes probabilidades ni hechos.`,
          },
          {
            role: 'user',
            content: `El jugador dijo: ${args.userMessage}\nSiguiente pregunta: ${args.nextQuestion || 'ninguna'}`,
          },
        ],
      }),
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return payload.choices?.[0]?.message?.content?.trim() || args.fallback;
  },
});
