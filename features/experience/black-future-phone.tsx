'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  LockKeyhole,
  MessageCircle,
  Mic2,
  Phone,
  PhoneOff,
  Radio,
  RotateCcw,
  Send,
  Signal,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Id } from '@/convex/_generated/dataModel';
import {
  abandonRemoteSession,
  completeRemoteSession,
  createRemoteSession,
  forgetRemoteSession,
  generateCallerReply,
  loadMarketSelection,
  persistAnswer,
  resumeRemoteSession,
  updateRemoteProgress,
} from '@/features/data/convex-client';
import { INTERESTS } from '@/features/game/demo-data';
import {
  buildReveal,
  classifyChoice,
  createAnswer,
  formatClock,
  getAnswerBranch,
  getBridgeLine,
  getBranchAnomaly,
  getOpeningLine,
  getNarrativeStage,
  getRevealTransitionLine,
  getUnclearAnswerLine,
  reorderByConversation,
  selectDemoMarkets,
} from '@/features/game/engine';
import type {
  AnswerChoice,
  GameAnswer,
  GameMode,
  GameScreen,
  MarketSelection,
  PlayerProfile,
  PredictionMarket,
  RevealResult,
  TranscriptMessage,
} from '@/features/game/types';
import { useVoiceBridge } from '@/features/voice/use-voice-bridge';
import { useSuspenseAudio } from '@/features/voice/use-suspense-audio';

const INITIAL_PROFILE: PlayerProfile = {
  alias: '',
  ageRange: '18–24',
  gender: 'Prefiero no decir',
  country: '',
  interests: ['Tecnología'],
  mode: 'voice',
};

function demoSelection(interests: string[]): MarketSelection {
  return {
    markets: selectDemoMarkets(interests),
    source: 'demo',
    freshness: 'offline',
    fetchedAt: null,
  };
}

export function BlackFuturePhone() {
  const [screen, setScreen] = useState<GameScreen>('setup');
  const [profile, setProfile] = useState<PlayerProfile>(INITIAL_PROFILE);
  const [markets, setMarkets] = useState<PredictionMarket[]>(() =>
    selectDemoMarkets(INITIAL_PROFILE.interests),
  );
  const [marketSelection, setMarketSelection] = useState<MarketSelection>(() =>
    demoSelection(INITIAL_PROFILE.interests),
  );
  const [answers, setAnswers] = useState<GameAnswer[]>([]);
  const [marketIndex, setMarketIndex] = useState(-1);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [reply, setReply] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(150);
  const [result, setResult] = useState<RevealResult | null>(null);
  const [sessionId, setSessionId] = useState<Id<'sessions'> | null>(null);
  const [declines, setDeclines] = useState(0);
  const [formError, setFormError] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);
  const [copied, setCopied] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const handlingRef = useRef(false);
  const voice = useVoiceBridge((text) => void handleUserMessage(text));
  const audio = useSuspenseAudio();

  const currentMarket = marketIndex >= 0 ? markets[marketIndex] : undefined;
  const sourceLabel = formatMarketSource(marketSelection);

  useEffect(() => {
    let cancelled = false;
    void resumeRemoteSession().then((saved) => {
      if (!saved || cancelled) return;
      setSessionId(saved.sessionId);
      setProfile(saved.profile);
      setMarkets(saved.markets);
      setMarketSelection({ ...saved.marketSelection, markets: saved.markets });
      setAnswers(saved.answers);

      if (saved.status === 'completed' && saved.result) {
        setResult(saved.result);
        setScreen('result');
        return;
      }

      if (saved.answers.length >= saved.markets.length) {
        const recoveredResult = buildReveal(saved.profile, saved.answers);
        setResult(recoveredResult);
        setScreen('result');
        void completeRemoteSession(saved.sessionId, recoveredResult).then((authoritativeResult) => {
          if (!cancelled) setResult(authoritativeResult);
        });
        return;
      }

      setMarketIndex(saved.currentStep);
      setScreen('ringing');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (screen !== 'call') return;
    const timer = window.setInterval(
      () => setRemainingSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const completedProgress = useMemo(() => `${answers.length} / ${markets.length}`, [answers, markets]);

  function updateProfile<Key extends keyof PlayerProfile>(key: Key, value: PlayerProfile[Key]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function toggleInterest(interest: string) {
    setProfile((current) => {
      const exists = current.interests.includes(interest);
      const interests = exists
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest].slice(-3);
      return { ...current, interests };
    });
  }

  async function prepareCall(event: FormEvent) {
    event.preventDefault();
    if (!profile.alias.trim() || !profile.country.trim() || !profile.interests.length) {
      setFormError('Completa tu alias, país y al menos un interés.');
      return;
    }
    // Start within the submit gesture so browsers allow the audio context.
    audio.startRinging();
    setIsPreparing(true);
    setFormError('');
    const selection = await loadMarketSelection(profile.interests);
    setMarkets(selection.markets);
    setMarketSelection(selection);
    setSessionId(
      await createRemoteSession({ ...profile, alias: profile.alias.trim() }, selection),
    );
    setIsPreparing(false);
    setScreen('ringing');
  }

  async function acceptCall() {
    audio.stopRinging();
    audio.playConnected();
    setRemainingSeconds(150);
    const openingLine =
      marketIndex >= 0 && currentMarket
        ? `La señal se interrumpió, pero todavía recuerdo tu siguiente decisión: ${currentMarket.question}`
        : getOpeningLine(profile.alias);
    setMessages([
      createMessage(
        'system',
        `CONEXIÓN SEGURA · MODO ${profile.mode === 'voice' ? 'VOZ' : 'CHAT'} BLOQUEADO · ${sourceLabel}`,
      ),
      createMessage('system', 'ORÁCULO // ENLACE TEMPORAL INICIADO · NO RESPONDAS A OTRAS LLAMADAS'),
      createMessage('caller', openingLine),
    ]);
    setScreen('call');
    if (profile.mode === 'voice') {
      const provider = await voice.connect(profile, markets);
      if (provider === 'browser') {
        speakLocally(openingLine);
      }
    }
  }

  function declineCall() {
    audio.playSend();
    setDeclines((count) => count + 1);
    window.setTimeout(() => setDeclines((count) => count + 1), 280);
  }

  function submitReply(event: FormEvent) {
    event.preventDefault();
    const text = reply.trim();
    if (!text) return;
    setReply('');
    void handleUserMessage(text);
  }

  async function handleUserMessage(text: string, forcedChoice?: AnswerChoice) {
    if (handlingRef.current || screen !== 'call') return;
    handlingRef.current = true;
    audio.playSend();
    setMessages((current) => [...current, createMessage('player', text)]);

    if (marketIndex < 0) {
      const reordered = reorderByConversation(markets, text);
      setMarkets(reordered);
      setMarketIndex(0);
      void updateRemoteProgress(sessionId, 0, reordered);
      const fallback = `Todavía hablas igual que yo. Necesito comprobar una cosa: ${reordered[0].question}`;
      const response = await generateCallerReply({
        profile,
        userMessage: text,
        nextQuestion: reordered[0].question,
        fallback,
        stage: 'first-question',
        answerNumber: 0,
      });
      window.setTimeout(() => pushCaller(response), 420);
      handlingRef.current = false;
      return;
    }

    const choice = forcedChoice || classifyChoice(text);
    if (!choice || !currentMarket) {
      window.setTimeout(
        () => pushCaller(getUnclearAnswerLine(answers.length + 1)),
        300,
      );
      handlingRef.current = false;
      return;
    }

    const answer = createAnswer(currentMarket, choice);
    const nextAnswers = [...answers, answer];
    const nextMarket = markets[marketIndex + 1];
    setAnswers(nextAnswers);
    const persistPromise = persistAnswer(sessionId, answer, marketIndex);
    audio.playSignal(getAnswerBranch(answer));
    pushSystem(getBranchAnomaly(answer, nextAnswers.length));

    if (nextMarket) {
      const answerNumber = nextAnswers.length;
      const fallback = getBridgeLine(answer, nextMarket, answerNumber);
      const [bridge] = await Promise.all([
        generateCallerReply({
          profile,
          userMessage: text,
          nextQuestion: nextMarket.question,
          fallback,
          stage: getNarrativeStage(answerNumber),
          answerNumber,
          previousAnswers: nextAnswers.map((item) => `${item.choice}: ${item.question}`),
        }),
        persistPromise,
      ]);
      window.setTimeout(() => pushCaller(bridge), 420);
      setMarketIndex((index) => index + 1);
      handlingRef.current = false;
      return;
    }

    const finalResult = buildReveal(profile, nextAnswers);
    setResult(finalResult);
    await persistPromise;
    const authoritativeResult = await completeRemoteSession(sessionId, finalResult);
    setResult(authoritativeResult);
    audio.playReveal();
    pushCaller(getRevealTransitionLine(authoritativeResult.probability));
    window.setTimeout(() => {
      voice.disconnect();
      setScreen('reveal');
      handlingRef.current = false;
    }, 1500);
  }

  function answerQuickly(choice: AnswerChoice) {
    void handleUserMessage(choice === 'yes' ? 'Sí, creo que pasará.' : 'No, no creo que pase.', choice);
  }

  function pushCaller(text: string) {
    setMessages((current) => [...current, createMessage('caller', text)]);
    audio.playCaller();
    if (profile.mode === 'voice') voice.speak(text);
  }

  function pushSystem(text: string) {
    setMessages((current) => [...current, createMessage('system', text)]);
  }

  function resetGame() {
    voice.disconnect();
    audio.stopRinging();
    void abandonRemoteSession(sessionId);
    forgetRemoteSession();
    setScreen('setup');
    setProfile(INITIAL_PROFILE);
    setMarkets(selectDemoMarkets(INITIAL_PROFILE.interests));
    setMarketSelection(demoSelection(INITIAL_PROFILE.interests));
    setAnswers([]);
    setMarketIndex(-1);
    setMessages([]);
    setReply('');
    setRemainingSeconds(150);
    setResult(null);
    setSessionId(null);
    setDeclines(0);
    setCopied(false);
  }

  async function copyResult() {
    if (!result) return;
    const text = `BLACK FUTURE PHONE — Mi línea temporal tiene ${result.probability}% de probabilidad de que pase.`;
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="future-shell relative min-h-dvh overflow-hidden bg-[#09090b] text-zinc-100">
      <div className="signal-grid pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="future-ambient pointer-events-none fixed inset-0" aria-hidden="true">
        <span className="future-orb future-orb-red" />
        <span className="future-orb future-orb-blue" />
        <span className="future-horizon" />
      </div>

      {screen === 'setup' && (
        <SetupScreen
          profile={profile}
          error={formError}
          isPreparing={isPreparing}
          onUpdate={updateProfile}
          onToggleInterest={toggleInterest}
          onSubmit={prepareCall}
        />
      )}
      {screen === 'ringing' && (
        <RingingScreen
          alias={profile.alias}
          declines={declines}
          onAccept={() => void acceptCall()}
          onDecline={declineCall}
        />
      )}
      {screen === 'call' && (
        <CallScreen
          profile={profile}
          messages={messages}
          currentMarket={currentMarket}
          sourceLabel={sourceLabel}
          progress={completedProgress}
          clock={formatClock(remainingSeconds)}
          reply={reply}
          voiceStatus={voice.status}
          voiceProvider={voice.provider}
          voiceError={voice.error}
          transcriptEndRef={transcriptEndRef}
          onReplyChange={setReply}
          onSubmit={submitReply}
          onListen={voice.listen}
          onQuickAnswer={answerQuickly}
          onHangUp={resetGame}
        />
      )}
      {screen === 'reveal' && result && (
        <RevealScreen profile={profile} result={result} onContinue={() => setScreen('result')} />
      )}
      {screen === 'result' && result && (
        <ResultScreen
          result={result}
          sourceLabel={sourceLabel}
          copied={copied}
          onCopy={() => void copyResult()}
          onReset={resetGame}
        />
      )}
    </main>
  );
}

type SetupProps = {
  profile: PlayerProfile;
  error: string;
  isPreparing: boolean;
  onUpdate: <Key extends keyof PlayerProfile>(key: Key, value: PlayerProfile[Key]) => void;
  onToggleInterest: (interest: string) => void;
  onSubmit: (event: FormEvent) => void;
};

function SetupScreen({ profile, error, isPreparing, onUpdate, onToggleInterest, onSubmit }: SetupProps) {
  return (
    <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl items-center px-5 py-8 sm:px-7 lg:px-10">
      <div className="grid w-full items-center gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)] lg:gap-14">
        <header className="setup-hero relative text-center lg:text-left">
          <div className="setup-sculpture" aria-hidden="true">
            <span className="sculpture-core"><Phone className="size-7" /></span>
            <span className="sculpture-ring sculpture-ring-one" />
            <span className="sculpture-ring sculpture-ring-two" />
            <span className="sculpture-signal" />
          </div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-400 shadow-[inset_0_1px_rgb(255_255_255/.06)] backdrop-blur-xl">
            <Radio className="size-3 text-red-500" /> señal temporal detectada
          </div>
          <p className="mb-2 font-mono text-[10px] tracking-[0.32em] text-red-500">INCOMING // 2098</p>
          <h1 className="font-display text-[clamp(3.15rem,11vw,7.5rem)] leading-[0.78] tracking-[-0.075em] text-white lg:max-w-[8ch]">
            BLACK FUTURE <span className="future-title-accent">PHONE</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-zinc-400 lg:mx-0 lg:text-[15px]">
            Alguien conoce tu futuro. Tienes 2:30 minutos para descubrir quién llama.
          </p>
          <div className="mt-6 hidden items-center gap-5 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600 lg:flex">
            <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgb(239_68_68)]" /> canal cifrado</span>
            <span>origen desconocido</span>
          </div>
        </header>

        <form onSubmit={onSubmit} className="terminal-panel setup-console p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Configura la transmisión</p>
              <h2 className="mt-1 text-xl font-medium tracking-tight text-white">Elige un modo</h2>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-black/30 px-3 py-1.5 font-mono text-[10px] text-zinc-500">00:02:30</span>
          </div>

          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Modo de partida">
            <ModeCard
              active={profile.mode === 'voice'}
              icon={<Mic2 />}
              title="Voz"
              detail="Conversación manos libres"
              onClick={() => onUpdate('mode', 'voice')}
            />
            <ModeCard
              active={profile.mode === 'chat'}
              icon={<MessageCircle />}
              title="Chat"
              detail="Conversación escrita"
              onClick={() => onUpdate('mode', 'chat')}
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Alias">
              <Input
                value={profile.alias}
                onChange={(event) => onUpdate('alias', event.target.value)}
                className="game-input"
                placeholder="NOVA"
                maxLength={24}
              />
            </Field>
            <Field label="País">
              <Input
                value={profile.country}
                onChange={(event) => onUpdate('country', event.target.value)}
                className="game-input"
                placeholder="Perú"
                maxLength={40}
              />
            </Field>
            <Field label="Edad">
              <select
                value={profile.ageRange}
                onChange={(event) => onUpdate('ageRange', event.target.value)}
                className="game-select"
              >
                {['Menor de 18', '18–24', '25–34', '35–49', '50+'].map((age) => (
                  <option key={age}>{age}</option>
                ))}
              </select>
            </Field>
            <Field label="Sexo / género">
              <select
                value={profile.gender}
                onChange={(event) => onUpdate('gender', event.target.value)}
                className="game-select"
              >
                {['Mujer', 'Hombre', 'No binario', 'Prefiero no decir'].map((gender) => (
                  <option key={gender}>{gender}</option>
                ))}
              </select>
            </Field>
          </div>

          <fieldset className="mt-5">
            <legend className="eyebrow">Intereses · elige hasta 3</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const selected = profile.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => onToggleInterest(interest)}
                    className={`interest-chip ${selected ? 'interest-chip-active' : ''}`}
                  >
                    {selected && <Check className="size-3" />} {interest}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && <p className="mt-4 font-mono text-[10px] text-red-400">{error}</p>}
          <Button
            type="submit"
            disabled={isPreparing}
            className="future-primary mt-5 h-13 w-full rounded-lg font-mono text-xs uppercase tracking-[0.16em] text-white"
          >
            {isPreparing ? 'Buscando la señal…' : 'Preparar llamada'}
            {!isPreparing && <ChevronRight className="ml-1 size-4" />}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-700">
            <LockKeyhole className="size-3" /> El modo no podrá cambiarse al comenzar
          </p>
        </form>
      </div>
    </section>
  );
}

function RingingScreen({
  alias,
  declines,
  onAccept,
  onDecline,
}: {
  alias: string;
  declines: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <section className="relative z-10 flex min-h-dvh flex-col items-center justify-between px-6 py-12 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">Black Future OS · señal cifrada</div>
      <div>
        <div className="call-pulse mx-auto mb-8 flex size-28 items-center justify-center rounded-full border border-red-700/40 bg-red-950/20">
          <UserRound className="size-10 text-red-500" />
        </div>
        <p className="font-mono text-xs tracking-[0.3em] text-red-500">LLAMADA ENTRANTE</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">NÚMERO DESCONOCIDO</h2>
        <p className="mt-2 text-sm text-zinc-600">
          {declines > 0 ? `No puedes rechazar tu propio futuro, ${alias}.` : 'Origen imposible de verificar'}
        </p>
      </div>
      <div className="flex w-full max-w-xs items-center justify-between">
        <CallButton label="Rechazar" icon={<PhoneOff />} tone="muted" onClick={onDecline} />
        <CallButton label="Contestar" icon={<Phone />} tone="accept" onClick={onAccept} />
      </div>
    </section>
  );
}

type CallProps = {
  profile: PlayerProfile;
  messages: TranscriptMessage[];
  currentMarket?: PredictionMarket;
  sourceLabel: string;
  progress: string;
  clock: string;
  reply: string;
  voiceStatus: string;
  voiceProvider: string;
  voiceError: string | null;
  transcriptEndRef: React.RefObject<HTMLDivElement | null>;
  onReplyChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onListen: () => void;
  onQuickAnswer: (choice: AnswerChoice) => void;
  onHangUp: () => void;
};

function CallScreen(props: CallProps) {
  const {
    profile,
    messages,
    currentMarket,
    sourceLabel,
    progress,
    clock,
    reply,
    voiceStatus,
    voiceProvider,
    voiceError,
    transcriptEndRef,
    onReplyChange,
    onSubmit,
    onListen,
    onQuickAnswer,
    onHangUp,
  } = props;

  return (
    <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-3 py-3 sm:px-5 sm:py-5 lg:py-7">
      <header className="call-header terminal-panel flex items-center justify-between px-3.5 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="caller-avatar relative flex size-10 shrink-0 items-center justify-center rounded-xl text-red-400">
            <Signal className="size-4" />
            <span className="absolute right-0 top-0 size-2 rounded-full bg-red-500 shadow-[0_0_10px_rgb(239_68_68)]" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-zinc-100">NÚMERO DESCONOCIDO</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500">
              {profile.mode} locked · {clock}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onHangUp}
          aria-label="Terminar llamada"
          className="hangup-button flex size-10 items-center justify-center rounded-xl text-red-400 transition"
        >
          <PhoneOff className="size-4" />
        </button>
      </header>

      <div className="my-2.5 flex items-center justify-between px-1 font-mono text-[8px] uppercase tracking-[0.14em] text-zinc-500 sm:my-3 sm:text-[9px]">
        <span className="flex min-w-0 items-center gap-2 truncate"><span className="signal-live-dot" />{sourceLabel}</span>
        <span className="shrink-0">Predicciones {progress}</span>
      </div>

      <div className="call-console terminal-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="call-transcript min-h-0 flex-1 overflow-y-auto px-3.5 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={transcriptEndRef} />
          </div>

          {currentMarket && (
            <article className="prediction-card mx-auto mt-6 max-w-2xl">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-red-500">
                  Predicción {Number(progress.split(' / ')[0]) + 1}
                </p>
                <span className="rounded border border-white/10 px-2 py-1 font-mono text-[8px] uppercase text-zinc-600">
                  {currentMarket.category}
                </span>
              </div>
              <h3 className="mt-3 text-[17px] font-medium leading-7 text-zinc-50 sm:text-lg">{currentMarket.question}</h3>
              <div className="mt-4 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-700">
                <LockKeyhole className="size-3" /> Consenso oculto hasta responder
              </div>
            </article>
          )}
        </div>

        <div className="composer-shell border-t border-white/[0.07] p-3 sm:p-4">
          <div className="mx-auto max-w-2xl">
          {voiceError && <p className="mb-2 font-mono text-[9px] text-amber-500">{voiceError}</p>}
          {profile.mode === 'chat' ? (
            <form onSubmit={onSubmit} className="chat-composer flex gap-2 rounded-xl p-1.5">
              <Input
                autoFocus
                value={reply}
                onChange={(event) => onReplyChange(event.target.value)}
                className="h-11 flex-1 border-0 bg-transparent px-3 text-sm text-zinc-100 shadow-none placeholder:text-zinc-600 focus-visible:ring-0"
                placeholder={currentMarket ? 'Responde sí, no, y explica…' : 'Cuéntale cómo te encuentras…'}
              />
              <Button type="submit" aria-label="Enviar" className="future-send size-11 rounded-lg">
                <Send className="size-4" />
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={onListen}
              disabled={voiceProvider === 'vapi'}
              className={`voice-control ${voiceStatus === 'listening' || voiceProvider === 'vapi' ? 'voice-control-live' : ''}`}
            >
              <Mic2 className="size-5" />
              <span>
                {voiceProvider === 'vapi'
                  ? 'Llamada en curso'
                  : voiceStatus === 'listening'
                    ? 'Escuchando…'
                    : 'Mantén la conversación por voz'}
              </span>
            </button>
          )}

          {currentMarket && (
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <button type="button" className="answer-button answer-yes" onClick={() => onQuickAnswer('yes')}>
                Sí, pasará
              </button>
              <button type="button" className="answer-button answer-no" onClick={() => onQuickAnswer('no')}>
                No pasará
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}

function RevealScreen({
  profile,
  result,
  onContinue,
}: {
  profile: PlayerProfile;
  result: RevealResult;
  onContinue: () => void;
}) {
  return (
    <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl items-center px-5 py-10">
      <div className="w-full">
        <div className="mb-7 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.2em] text-red-500">
          <span className="h-px flex-1 bg-red-900/50" /> Identidad recuperada <span className="h-px flex-1 bg-red-900/50" />
        </div>
        <div className="terminal-panel overflow-hidden">
          <div className="border-b border-white/[0.07] bg-red-950/10 px-5 py-4">
            <p className="eyebrow">Origen de la llamada</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full border border-red-800/50 bg-red-950/40 text-red-500">
                <UserRound className="size-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{profile.alias.toUpperCase()} // FUTURO</h1>
                <p className="font-mono text-[9px] text-zinc-600">COINCIDENCIA BIOMÉTRICA: 100%</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 px-5 py-6 text-[15px] leading-7 text-zinc-400 sm:px-7">
            {result.paragraphs.map((paragraph, index) => (
              <p key={paragraph} className={index === 0 ? 'text-zinc-100' : ''}>
                {paragraph}
              </p>
            ))}
          </div>
          <div className="border-t border-white/[0.07] bg-black/20 px-5 py-5 sm:px-7">
            <p className="eyebrow">Fragmentos recuperados</p>
            <div className="mt-3 space-y-3">
              {result.loreClues.map((clue) => (
                <article key={clue.code} className="border-l border-red-900/70 pl-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-red-500">{clue.code}</p>
                  <h2 className="mt-1 text-sm text-zinc-200">{clue.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{clue.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
        <Button
          onClick={onContinue}
          className="mt-5 h-12 w-full rounded-md bg-red-700 font-mono text-xs uppercase tracking-[0.16em] text-white hover:bg-red-600"
        >
          Calcular probabilidad <ArrowRight className="ml-1 size-4" />
        </Button>
      </div>
    </section>
  );
}

function ResultScreen({
  result,
  sourceLabel,
  copied,
  onCopy,
  onReset,
}: {
  result: RevealResult;
  sourceLabel: string;
  copied: boolean;
  onCopy: () => void;
  onReset: () => void;
}) {
  return (
    <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl items-center px-5 py-8">
      <div className="w-full">
        <header className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-red-500">Análisis temporal completo</p>
          <h1 className="mt-2 text-2xl font-semibold">{result.headline}</h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            Estado de señal: {result.signalState === 'stable' ? 'estable' : result.signalState === 'split' ? 'dividida' : 'colapsada'}
          </p>
        </header>

        <div className="probability-ring mx-auto my-7" style={{ '--score': `${result.probability}%` } as React.CSSProperties}>
          <div>
            <strong>{result.probability}%</strong>
            <span>probabilidad</span>
          </div>
        </div>
        <p className="mx-auto max-w-sm text-center font-mono text-xs uppercase leading-5 tracking-[0.12em] text-zinc-400">
          Probabilidad de que pase en esta línea temporal
        </p>
        <p className="mx-auto mt-2 max-w-sm text-center text-[11px] leading-5 text-zinc-700">
          Esta señal combina las posibilidades abiertas por cada una de tus decisiones en una única línea temporal.
        </p>

        <div className="mx-auto mt-4 flex w-fit items-center gap-3 rounded-full border border-red-900/40 bg-red-950/20 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500">
          <span className="text-red-500">{result.rating}</span>
          <span>{result.agreementCount}/{result.answerCount} coincidencias</span>
        </div>
        <p className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.14em] text-zinc-700">
          Lectura · {sourceLabel}
        </p>

        <div className="terminal-panel mt-6 divide-y divide-white/[0.06] overflow-hidden">
          {result.breakdown.map((item) => (
            <div key={item.marketId} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3.5">
              <div>
                <p className="line-clamp-2 text-xs leading-5 text-zinc-400">{item.question}</p>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-700">
                  Tú: {item.choice === 'yes' ? 'Sí' : 'No'} · {item.agreesWithMarket ? 'sigue' : 'rompe'} la señal colectiva
                </p>
              </div>
              <span className="self-center font-mono text-sm text-red-500">{Math.round(item.branchProbability * 100)}%</span>
            </div>
          ))}
        </div>

        <p className="mt-5 border border-red-950/70 bg-red-950/10 px-4 py-3 text-center font-mono text-[10px] uppercase leading-5 tracking-[0.12em] text-red-400">
          {result.epilogue}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onCopy} className="h-11 border-white/10 bg-white/[0.02] text-zinc-300">
            {copied ? <Check /> : <Copy />} {copied ? 'Copiado' : 'Compartir'}
          </Button>
          <Button onClick={onReset} className="h-11 bg-red-700 text-white hover:bg-red-600">
            <RotateCcw /> Otra línea
          </Button>
        </div>
      </div>
    </section>
  );
}

function ModeCard({
  active,
  icon,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`mode-card ${active ? 'mode-card-active' : ''}`}
    >
      {icon}
      <span>{title}</span>
      <small>{detail}</small>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function CallButton({
  label,
  icon,
  tone,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  tone: 'accept' | 'muted';
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-3 text-xs text-zinc-500">
      <span
        className={`flex size-16 items-center justify-center rounded-full ${
          tone === 'accept'
            ? 'bg-emerald-600 text-white shadow-[0_0_35px_rgb(5_150_105/25%)]'
            : 'bg-zinc-800 text-zinc-400'
        }`}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

function MessageBubble({ message }: { message: TranscriptMessage }) {
  if (message.role === 'system') {
    return (
      <div className="flex items-center gap-3 py-1" role="status">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.08]" />
        <p className="max-w-[78%] text-center font-mono text-[8px] uppercase leading-4 tracking-[0.16em] text-zinc-600">{message.text}</p>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.08]" />
      </div>
    );
  }
  const player = message.role === 'player';
  return (
    <div className={`message-row flex ${player ? 'justify-end' : 'justify-start'}`}>
      <div className={`message-bubble max-w-[88%] px-4 py-3 text-sm leading-6 sm:max-w-[78%] ${player ? 'message-player text-zinc-100' : 'message-caller text-zinc-300'}`}>
        {!player && <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.17em] text-red-400"><span className="size-1 rounded-full bg-red-500 shadow-[0_0_8px_rgb(239_68_68)]" /> Futuro</p>}
        {message.text}
      </div>
    </div>
  );
}

function formatMarketSource(selection: MarketSelection): string {
  if (selection.source === 'demo') return 'SEÑAL TEMPORAL ESTABLE';

  const age = formatDataAge(selection.fetchedAt);
  if (selection.source === 'live') return `SEÑAL TEMPORAL ACTIVA · ${age}`;
  return `SEÑAL TEMPORAL ${selection.freshness === 'stale' ? 'RECUPERADA' : 'ESTABLE'} · ${age}`;
}

function formatDataAge(fetchedAt: number | null): string {
  if (fetchedAt === null) return 'ORIGEN CIFRADO';
  const minutes = Math.max(0, Math.floor((Date.now() - fetchedAt) / 60_000));
  if (minutes < 1) return 'AHORA';
  if (minutes < 60) return `HACE ${minutes} MIN`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `HACE ${hours} H` : `HACE ${Math.floor(hours / 24)} D`;
}

function createMessage(role: TranscriptMessage['role'], text: string): TranscriptMessage {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, role, text };
}

function speakLocally(text: string) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 0.92;
  utterance.pitch = 0.72;
  window.speechSynthesis.speak(utterance);
}
