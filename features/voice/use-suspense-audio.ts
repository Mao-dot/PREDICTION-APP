'use client';

import { useCallback, useEffect, useRef } from 'react';

type ToneType = OscillatorType;
type SignalTone = 'aligned' | 'divergent' | 'unstable';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/**
 * Small, synthesised cues keep the demo self-contained and avoid loading
 * cartoonish sound assets. The context is only resumed after a user gesture.
 */
export function useSuspenseAudio() {
  const contextRef = useRef<AudioContext | null>(null);
  const ringingTimerRef = useRef<number | null>(null);

  const getContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    contextRef.current ??= new AudioContextConstructor();
    void contextRef.current.resume();
    return contextRef.current;
  }, []);

  const tone = useCallback(
    (
      frequency: number,
      duration: number,
      volume: number,
      type: ToneType = 'sine',
      delay = 0,
      endFrequency = frequency,
    ) => {
      const context = getContext();
      if (!context) return;
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.035, duration / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    },
    [getContext],
  );

  const playRingtone = useCallback(() => {
    tone(174, 0.16, 0.028, 'sine', 0, 130);
    tone(130, 0.22, 0.022, 'sine', 0.19, 104);
  }, [tone]);

  const startRinging = useCallback(() => {
    if (ringingTimerRef.current !== null) return;
    playRingtone();
    ringingTimerRef.current = window.setInterval(playRingtone, 1900);
  }, [playRingtone]);

  const stopRinging = useCallback(() => {
    if (ringingTimerRef.current === null) return;
    window.clearInterval(ringingTimerRef.current);
    ringingTimerRef.current = null;
  }, []);

  const playConnected = useCallback(() => {
    tone(90, 0.32, 0.024, 'sine', 0, 62);
    tone(184, 0.12, 0.014, 'triangle', 0.22, 150);
  }, [tone]);

  const playSend = useCallback(() => {
    tone(420, 0.055, 0.014, 'triangle', 0, 300);
  }, [tone]);

  const playCaller = useCallback(() => {
    tone(116, 0.16, 0.012, 'sine', 0, 92);
  }, [tone]);

  const playSignal = useCallback(
    (state: SignalTone) => {
      if (state === 'aligned') {
        tone(146, 0.18, 0.012, 'sine', 0, 158);
        return;
      }
      if (state === 'divergent') {
        tone(165, 0.2, 0.018, 'sawtooth', 0, 78);
        return;
      }
      tone(220, 0.08, 0.014, 'triangle', 0, 164);
      tone(109, 0.22, 0.018, 'sine', 0.12, 72);
    },
    [tone],
  );

  const playReveal = useCallback(() => {
    tone(110, 0.72, 0.026, 'sine', 0, 54);
    tone(164, 0.42, 0.016, 'triangle', 0.28, 118);
    tone(247, 0.62, 0.012, 'sine', 0.7, 196);
  }, [tone]);

  useEffect(() => {
    return () => {
      stopRinging();
      void contextRef.current?.close();
    };
  }, [stopRinging]);

  return {
    startRinging,
    stopRinging,
    playConnected,
    playSend,
    playCaller,
    playSignal,
    playReveal,
  };
}
