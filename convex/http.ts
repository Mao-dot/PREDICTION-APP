import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { env, httpAction } from './_generated/server';

const http = httpRouter();

http.route({
  path: '/vapi/events',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const expectedSecret = env.VAPI_WEBHOOK_SECRET;
    if (expectedSecret && request.headers.get('x-black-future-secret') !== expectedSecret) {
      return new Response('Unauthorized', { status: 401 });
    }
    const payload = (await request.json()) as {
      message?: { type?: string; call?: { id?: string } };
    };
    await ctx.runMutation(internal.sessions.storeVoiceEvent, {
      eventType: payload.message?.type || 'unknown',
      callId: payload.message?.call?.id,
    });
    return Response.json({ ok: true });
  }),
});

export default http;
