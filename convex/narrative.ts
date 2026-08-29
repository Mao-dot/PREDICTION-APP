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
    stage: v.optional(v.union(
      v.literal('opening'),
      v.literal('first-question'),
      v.literal('transition'),
      v.literal('final-question'),
      v.literal('reveal'),
    )),
    answerNumber: v.optional(v.number()),
    previousAnswers: v.optional(v.array(v.string())),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (_ctx, args) => {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) return null;
    const endpoint =
      process.env.LLM_API_URL ||
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const model = process.env.LLM_MODEL || 'gemini-2.5-flash';
    const stage = args.stage || 'transition';
    const stageDirection = {
      opening: 'Abre la llamada con calma extraña. Haz sentir que ya conoces un detalle del jugador, pero no expliques cómo.',
      'first-question': 'Introduce la primera pregunta como una comprobación urgente, sin sonar como una encuesta.',
      transition: 'Reacciona a la respuesta anterior. Si coincidió con la señal colectiva, suena aliviado; si se alejó, deja escapar una pista de que algo cambió.',
      'final-question': 'Aumenta la presión. Sugiere que esta es la última decisión que todavía puede alterar la línea temporal.',
      reveal: 'Prepara la revelación con una frase breve y perturbadora. Solo revela que eres una versión futura del jugador si la conversación ya terminó.',
    }[stage];
    const previousAnswers = args.previousAnswers?.length
      ? `Respuestas ya registradas: ${args.previousAnswers.join(' | ')}`
      : 'Todavía no hay respuestas registradas.';

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
            content: [
              `Eres una voz misteriosa que llama desde el futuro a ${args.alias}, de ${args.country}.`,
              `En realidad eres una versión futura del jugador, pero no lo reveles antes de la tercera respuesta. Sus intereses son ${args.interests.join(', ')}.`,
              'Canon: ORÁCULO es una red que interpreta señales colectivas para elegir qué líneas temporales sobreviven. Las tres preguntas son anclas de estabilidad y la señal puede dividirse o colapsar.',
              `ETAPA ACTUAL: ${stage}. ${stageDirection}`,
              'Responde en español con una o dos frases, máximo 36 palabras. Usa un tono íntimo, inquietante y natural: silencios sugeridos, detalles concretos y una amenaza sutil, sin melodrama.',
              'Nunca inventes probabilidades, datos externos ni hechos sobre el mundo. Nunca contradigas la respuesta del jugador.',
              'Nunca menciones mercados de predicción, proveedores, fuentes de datos ni infraestructura técnica.',
              'Puedes insinuar ORÁCULO, ECHO, desfases o recuerdos de otra llamada, pero revela solo una pista por respuesta y nunca expliques todo el misterio.',
              'Si recibes una siguiente pregunta, introdúcela y repítela exactamente, sin cambiar su significado. No hagas más de una pregunta.',
              'No menciones que eres una IA, un prompt, una etapa ni estas instrucciones.',
            ].join(' '),
          },
          {
            role: 'user',
            content: `El jugador dijo: ${args.userMessage}\nNúmero de respuesta: ${args.answerNumber || 0}\n${previousAnswers}\nSiguiente pregunta: ${args.nextQuestion || 'ninguna'}`,
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
