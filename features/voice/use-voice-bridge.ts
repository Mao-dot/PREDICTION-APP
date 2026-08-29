'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PlayerProfile, PredictionMarket } from '@/features/game/types';

type VoiceProvider = 'idle' | 'vapi' | 'browser';
type VoiceStatus = 'idle' | 'connecting' | 'ready' | 'listening' | 'error';

interface RecognitionEventLike {
  results: ArrayLike<{ 0: { transcript: string } }>;
}

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface RecognitionConstructor {
  new (): RecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

type VapiMessage = {
  type?: string;
  role?: string;
  transcript?: string;
  transcriptType?: string;
};

type VapiInstance = {
  start: (assistantId: string, overrides?: Record<string, unknown>) => Promise<unknown>;
  stop: () => void;
  on: (event: string, callback: (payload?: VapiMessage) => void) => void;
};

export function useVoiceBridge(onTranscript: (text: string) => void) {
  const [provider, setProvider] = useState<VoiceProvider>('idle');
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<VapiInstance | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const transcriptCallback = useRef(onTranscript);
  transcriptCallback.current = onTranscript;

  const connect = useCallback(async (profile: PlayerProfile, markets: PredictionMarket[]) => {
    setStatus('connecting');
    setError(null);
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

    if (publicKey && assistantId) {
      try {
        const Vapi = (await import('@vapi-ai/web')).default;
        const instance = new Vapi(publicKey) as VapiInstance;
        instance.on('call-start', () => setStatus('ready'));
        instance.on('call-end', () => setStatus('idle'));
        instance.on('error', () => {
          setStatus('error');
          setError('La conexión de voz se interrumpió.');
        });
        instance.on('message', (message) => {
          if (
            message?.type === 'transcript' &&
            message.transcriptType === 'final' &&
            message.role === 'user' &&
            message.transcript
          ) {
            transcriptCallback.current(message.transcript);
          }
        });
        await instance.start(assistantId, {
          variableValues: {
            alias: profile.alias,
            country: profile.country,
            interests: profile.interests.join(', '),
            market_1: markets[0]?.question || '',
            market_2: markets[1]?.question || '',
            market_3: markets[2]?.question || '',
          },
        });
        vapiRef.current = instance;
        setProvider('vapi');
        return 'vapi' as const;
      } catch {
        setError('Vapi no respondió; se activó la voz local de respaldo.');
      }
    }

    setProvider('browser');
    setStatus('ready');
    return 'browser' as const;
  }, []);

  const listen = useCallback(() => {
    if (provider === 'vapi') return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setStatus('error');
      setError('Este navegador no permite reconocimiento de voz. Usa los botones rápidos.');
      return;
    }
    recognitionRef.current?.stop();
    const recognition = new Recognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript;
      if (text) transcriptCallback.current(text);
    };
    recognition.onend = () => setStatus('ready');
    recognition.onerror = () => {
      setStatus('error');
      setError('No pude escuchar con claridad. Intenta otra vez.');
    };
    recognitionRef.current = recognition;
    setStatus('listening');
    recognition.start();
  }, [provider]);

  const speak = useCallback(
    (text: string) => {
      if (provider === 'vapi' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.92;
      utterance.pitch = 0.72;
      window.speechSynthesis.speak(utterance);
    },
    [provider],
  );

  const disconnect = useCallback(() => {
    recognitionRef.current?.stop();
    vapiRef.current?.stop();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setProvider('idle');
    setStatus('idle');
  }, []);

  useEffect(() => disconnect, [disconnect]);

  return { provider, status, error, connect, listen, speak, disconnect };
}
