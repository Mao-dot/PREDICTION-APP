# BLACK FUTURE PHONE

> **What if your future self called you right now?**

**Black Future Phone** is a ~2:30 min interactive voice experience where you receive a mysterious call from your future self.

The caller asks you **three questions about the future**, each backed by a real prediction market.

You answer.

Your beliefs are compared against the world's current expectations.

Then comes the reveal:

> **The voice was you.**

---

## How it works

```text
 Receive the call
        ↓
 Answer 3 future predictions
        ↓
 Compare your beliefs with prediction markets
        ↓
 Discover who was calling
```

The final score represents how closely your answers align with current market probabilities.

It is a **narrative index**, not a statistical joint probability.

---

## Tech Stack

* Next.js + TypeScript
* Convex
* Prediction market data
* Vapi
* ElevenLabs
* Gemini 2.5 Flash

---

## Quick Start

```bash
npm install
npm run dev
```

The experience works with local fallback data.

For real data and persistence:

```bash
npx convex dev
```

See `.env.example` for required public variables.

---

## Voice Setup

Create a Vapi Assistant with **Gemini 2.5 Flash** and connect ElevenLabs for the character voice.

**First message:**

```text
Hola, {{alias}}. Soy del futuro. ¿Cómo te encuentras?
```

The Assistant should ask:

```text
{{market_1}}
{{market_2}}
{{market_3}}
```

in that order, without revealing its identity until after the third answer.

Add:

```text
NEXT_PUBLIC_VAPI_PUBLIC_KEY
NEXT_PUBLIC_VAPI_ASSISTANT_ID
```

Without Vapi, the browser's speech recognition and synthesis are used as fallback.

---

## Architecture

```text
features/
├── experience/   # UI & animations
├── game/         # Narrative engine
├── data/         # Prediction markets
└── voice/        # Vapi + ElevenLabs

convex/           # Backend & persistence
```

Shared contracts:

```text
features/game/types.ts
```

---

### The premise

**The future is uncertain.**

**The market has a prediction.**

**You have a belief.**

So we gave the future a phone number.

