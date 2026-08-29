# BLACK FUTURE PHONE

Demo web mobile-first de una llamada desde el futuro. La partida dura aproximadamente 2:30 minutos, usa tres mercados de predicción y termina revelando que la voz es una versión futura del jugador.

## Arranque rápido

```bash
npm install
npm run dev
```

La experiencia completa funciona con datos locales de respaldo. Para activar datos reales y guardar partidas:

```bash
npx convex dev
```

Copia las variables públicas indicadas en `.env.example`. Las variables privadas del modelo y del webhook se configuran en Convex con `npx convex env set`.

## Voz real con Vapi + ElevenLabs

1. Crea un Assistant en Vapi y selecciona `gemini-2.5-flash` como modelo.
2. Conecta la cuenta de ElevenLabs en Vapi y selecciona la voz del personaje.
3. Usa este primer mensaje: `Hola, {{alias}}. Soy del futuro. ¿Cómo te encuentras?`
4. En el prompt del Assistant indica que debe conversar brevemente, preguntar en orden `{{market_1}}`, `{{market_2}}` y `{{market_3}}`, nunca inventar probabilidades y no revelar su identidad hasta después de la tercera respuesta.
5. Añade la Public Key y el Assistant ID a las variables `NEXT_PUBLIC_VAPI_PUBLIC_KEY` y `NEXT_PUBLIC_VAPI_ASSISTANT_ID`.
6. Opcional: apunta el webhook de Vapi a `https://TU_DEPLOYMENT.convex.site/vapi/events` y envía `x-black-future-secret` con el valor configurado en Convex.

Sin estas variables, el modo voz usa reconocimiento y síntesis del navegador como respaldo. El modo elegido queda bloqueado al contestar.

## Reparto sugerido para 4 personas

1. **Experiencia y UI** — `features/experience/` y `app/globals.css`: pantallas, animaciones, accesibilidad y responsive.
2. **Motor narrativo** — `features/game/` y `convex/narrative.ts`: ritmo, prompts, ramificaciones, revelación y fórmula final.
3. **Convex + Polymarket** — `convex/` y `features/data/`: esquema, sesiones, caché, selección y normalización de mercados.
4. **Voz** — `features/voice/` y configuración de Vapi/ElevenLabs: llamadas, transcripción, voces, interrupciones y webhooks.

Los contratos compartidos están en `features/game/types.ts`. Conviene acordar cambios allí antes de tocar varias áreas.

## Fórmula de la demo

Para cada respuesta se toma la probabilidad de `Sí`, o su complemento si el jugador responde `No`. El resultado final es el promedio de las tres coincidencias y se presenta como “Probabilidad de que pase en esta línea temporal”. Es un índice narrativo, no una probabilidad estadística conjunta.
