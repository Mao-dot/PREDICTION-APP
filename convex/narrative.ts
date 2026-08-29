import { v } from 'convex/values';

import { action, env } from './_generated/server';

export const reply = action({
  args: {
    alias: v.string(),
    country: v.string(),
    interests: v.array(v.string()),
    userMessage: v.string(),
    nextQuestion: v.optional(v.string()),
    fallback: v.string(),
    stage: v.optional(
      v.union(
        v.literal('opening'),
        v.literal('first-question'),
        v.literal('transition'),
        v.literal('final-question'),
        v.literal('reveal'),
      ),
    ),
    answerNumber: v.optional(v.number()),
    previousAnswers: v.optional(v.array(v.string())),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (_ctx, args) => {
    const apiKey = env.LLM_API_KEY;
    if (!apiKey) return null;
    const endpoint =
      env.LLM_API_URL ||
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const model = env.LLM_MODEL || 'gemini-2.5-flash';
    const stage = args.stage || 'transition';
    const stageDirection = {
      opening:
        'Abre la llamada con calma extraña. Haz sentir que ya conoces un detalle del jugador, pero no expliques cómo.',
      'first-question':
        'Introduce la primera pregunta como una comprobación urgente, sin sonar como una encuesta.',
      transition:
        'Reacciona brevemente a la respuesta anterior sin juzgarla como correcta o incorrecta. Luego deja escapar una sola pista de que algo cambió.',
      'final-question':
        'Aumenta la presión. Sugiere que esta es la última decisión que todavía puede alterar la línea temporal.',
      reveal:
        'Prepara la revelación con una frase breve y perturbadora. Solo revela que eres una versión futura del jugador si la conversación ya terminó.',
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
        temperature: 0.42,
        max_tokens: 90,
        messages: [
          {
            role: 'system',
            content: [
              `Eres una voz misteriosa que llama desde el futuro a ${args.alias}, de ${args.country}.`,
              `En realidad eres una versión futura del jugador, pero no lo reveles antes de la tercera respuesta. Sus intereses son ${args.interests.join(', ')}.`,
              'Canon: ORÁCULO es una red que interpreta señales colectivas para elegir qué líneas temporales sobreviven. Las tres preguntas son anclas de estabilidad y la señal puede dividirse o colapsar.',
              `ETAPA ACTUAL: ${stage}. ${stageDirection}`,
              'Escribe exclusivamente en español latino neutro, con una o dos frases y máximo 36 palabras. No uses frases en inglés ni cambies de idioma.',
              'Usa un tono íntimo, inquietante y natural: silencios sugeridos y una amenaza sutil, sin melodrama ni frases inconexas.',
              'Habla únicamente de la respuesta del jugador y de la siguiente pregunta recibida. No introduzcas personas, sucesos, explicaciones, temas ni preguntas nuevas.',
              'Nunca inventes probabilidades, cifras, datos externos ni hechos sobre el mundo. Nunca contradigas la respuesta del jugador.',
              'Nunca menciones Polymarket, mercados, apuestas, probabilidades colectivas, proveedores, fuentes de datos, APIs ni infraestructura técnica.',
              'Puedes insinuar ORÁCULO, ECHO, desfases o recuerdos de otra llamada, pero revela solo una pista por respuesta y nunca expliques todo el misterio.',
              'Si recibes una siguiente pregunta, cópiala literalmente, carácter por carácter y una sola vez. No la traduzcas, resumas, reformules ni completes. No hagas ninguna otra pregunta.',
              'Si no recibes una siguiente pregunta, no formules preguntas.',
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
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content || !isSafeNarrativeReply(content, args.nextQuestion))
      return args.fallback;
    return content;
  },
});

function isSafeNarrativeReply(content: string, nextQuestion?: string): boolean {
  if (content.length > 360) return false;
  const normalized = normalizeText(content);
  const leakedTerms = [
    'api',
    'apuesta',
    'fuente de datos',
    'infraestructura',
    'mercado de prediccion',
    'polymarket',
    'proveedor',
  ];
  if (leakedTerms.some((term) => containsPhrase(normalized, term)))
    return false;

  const englishSignals =
    normalized.match(
      /\b(?:i|agree|answer|from|future|question|that|the|think|this|will|with|you|your)\b/g,
    )?.length ?? 0;
  if (englishSignals >= 2) return false;

  const questionMarks = (content.match(/\?/g) ?? []).length;
  if (!nextQuestion) return questionMarks === 0;
  if (!content.includes(nextQuestion)) return false;
  return questionMarks === (nextQuestion.match(/\?/g) ?? []).length;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function containsPhrase(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${normalizeText(phrase)} `);
}
