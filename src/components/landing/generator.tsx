import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  Check,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTypewriter } from '@/components/landing/reveal';

export interface GeneratorTab {
  id: string;
  label: string;
  placeholder: string;
}

export interface GeneratorAsset {
  /** Lowercase keywords (en + zh) matched against the prompt to theme the result. */
  keywords: string[];
  src: string;
  poster?: string;
  /** Model badge on the result card, e.g. "Veo 3.1". */
  model: string;
  /** Short spec hint, e.g. "0:08 · 640×360". */
  meta?: string;
}

/** What a finished run produced, and from which prompt + mode. */
interface RunResult {
  asset: GeneratorAsset;
  prompt: string;
  tabId: string;
}

export interface LandingGeneratorProps {
  tabs: GeneratorTab[];
  /** Example prompts cycled by the typewriter placeholder. */
  promptExamples: string[];
  examplesLabel: string;
  generateLabel: string;
  trust: string[];
  /** Stage labels cycled while the render preview runs. */
  stages: string[];
  readyLabel: string;
  againLabel: string;
  /** Result CTA — the block wires it to the sign-up flow. */
  keepLabel: string;
  demoNote: string;
  playLabel: string;
  pauseLabel: string;
  /** Demo results per tab id; keyword hits pick a themed match. */
  assets: Record<string, GeneratorAsset[]>;
  onSignUp?: (prompt: string, tabId: string) => void;
}

/** How long the fake render takes to reach 100%. */
const RENDER_MS = 4800;

/** djb2 — stable per prompt, so the same prompt always "renders" the same clip. */
function hashPrompt(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Keyword-scored pick: themed match when the prompt hits, deterministic otherwise. */
function pickAsset(
  pool: GeneratorAsset[],
  prompt: string,
  attempt: number
): GeneratorAsset | undefined {
  if (!pool || pool.length === 0) return undefined;
  const lower = prompt.toLowerCase();
  const hits = pool.map((asset, index) => ({
    index,
    score: asset.keywords.reduce(
      (n, k) => n + (k && lower.includes(k.toLowerCase()) ? 1 : 0),
      0
    ),
  }));
  const best = Math.max(...hits.map((h) => h.score));
  const candidates =
    best > 0
      ? hits.filter((h) => h.score === best).map((h) => h.index)
      : hits.map((h) => h.index);
  const seed = hashPrompt(prompt) + attempt;
  return pool[candidates[seed % candidates.length]];
}

/**
 * The hero's interactive generator: mode tabs + prompt bar, then an in-place
 * render preview that finishes with a playable demo result. Pure component —
 * all copy and demo assets arrive via props from the hero block.
 */
export function LandingGenerator({
  tabs,
  promptExamples,
  examplesLabel,
  generateLabel,
  trust,
  stages,
  readyLabel,
  againLabel,
  keepLabel,
  demoNote,
  playLabel,
  pauseLabel,
  assets,
  onSignUp,
}: LandingGeneratorProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  // null = visitor hasn't typed; the typewriter owns the placeholder.
  const [draft, setDraft] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'rendering' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Freeze the typewriter once there is something real to show (typed draft
  // or an active run) — it re-rendered the whole bar every 55ms otherwise.
  const typed = useTypewriter(promptExamples, {
    active: draft === null && phase === 'idle',
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Bumped per run so regenerating the same prompt rotates the demo clip.
  const attemptRef = useRef(0);

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  // Stop the demo audio when the generator unmounts.
  useEffect(() => () => audioRef.current?.pause(), []);

  // Drive the fake render: eased 0→100, then flip to the result.
  useEffect(() => {
    if (phase !== 'rendering') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const t = window.setTimeout(() => {
        setProgress(100);
        setPhase('done');
      }, 900);
      return () => window.clearTimeout(t);
    }
    const t0 = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - t0;
      // Ease-out: fast start, trickle near 100 like a real render queue.
      const value = Math.min(
        100,
        Math.round(100 * (1 - Math.pow(1 - elapsed / RENDER_MS, 2.4)))
      );
      setProgress(value);
      if (value >= 100) {
        window.clearInterval(timer);
        setPhase('done');
      }
    }, 90);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Autoplay audio results once the run finishes (the Generate click is the
  // user gesture browsers need); fall back to the manual play button.
  useEffect(() => {
    if (phase !== 'done' || result?.tabId !== 'audio') return;
    audioRef.current?.play().then(
      () => setAudioPlaying(true),
      () => setAudioPlaying(false)
    );
  }, [phase, result]);

  // Reveal the finished card if it landed below the fold.
  useEffect(() => {
    if (phase === 'done') {
      stageRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [phase]);

  const startRun = (prompt: string, tabId: string) => {
    const asset = pickAsset(assets[tabId] ?? [], prompt, attemptRef.current);
    if (!asset) return;
    attemptRef.current += 1;
    audioRef.current?.pause();
    setAudioPlaying(false);
    setResult({ asset, prompt, tabId });
    setProgress(0);
    setPhase('rendering');
  };

  const submit = () => {
    const prompt = (draft ?? typed ?? '').trim() || promptExamples[0] || '';
    if (!prompt) {
      inputRef.current?.focus();
      return;
    }
    startRun(prompt, activeTab?.id ?? tabs[0]?.id ?? '');
  };

  const switchTab = (tabId: string) => {
    setActiveId(tabId);
    setDraft(null); // tab placeholders differ; let the typewriter take over
    if (phase !== 'idle') {
      setPhase('idle');
      setResult(null);
      setProgress(0);
      audioRef.current?.pause();
      setAudioPlaying(false);
    }
  };

  const stageLabel =
    stages[
      Math.min(stages.length - 1, Math.floor((progress / 100) * stages.length))
    ] ?? stages[0];

  const isAudioResult = result?.tabId === 'audio';

  return (
    <div className="flex w-full flex-col items-center">
      {/* Mode tabs */}
      <div className="mt-8 inline-flex rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10">
        {tabs.map((tab) => {
          const active = tab.id === activeTab?.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={active}
              onClick={() => switchTab(tab.id)}
              className={cn(
                'h-9 rounded-full px-4 text-sm font-medium text-white/70 hover:text-white',
                active && 'bg-[var(--sv-iris-strong)] text-white'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Prompt bar — typewriter cycles example prompts until the visitor types */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (phase !== 'rendering') submit();
        }}
        className="mt-4 flex h-[60px] w-full max-w-[640px] items-center rounded-[18px] bg-white/[0.07] py-1.5 pr-1.5 pl-4 ring-1 ring-white/10 transition-shadow duration-300 focus-within:ring-[var(--sv-iris)]"
      >
        <input
          key={activeTab?.id}
          ref={inputRef}
          type="text"
          value={draft ?? ''}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            draft === null && typed
              ? `${typed}▍`
              : (activeTab?.placeholder ?? '')
          }
          aria-label={activeTab?.placeholder}
          disabled={phase === 'rendering'}
          className="sv-meta min-w-0 flex-1 bg-transparent text-[16px] text-white placeholder:text-white/45 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={phase === 'rendering'}
          className="sv-press inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[var(--sv-iris-strong)] px-6 text-[15px] font-semibold text-white hover:bg-[var(--sv-iris-deep)] disabled:cursor-wait"
        >
          {phase === 'rendering' ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden />
              <span className="tabular-nums">{progress}%</span>
            </>
          ) : (
            <>
              <Sparkles size={16} aria-hidden />
              {generateLabel}
            </>
          )}
        </button>
      </form>

      {/* Render monitor / result card */}
      {result && (
        <div
          ref={stageRef}
          className="sv-enter mt-4 w-full max-w-[640px]"
          style={{ '--i': 0 } as CSSProperties}
        >
          <div className="relative aspect-video w-full overflow-hidden rounded-[18px] bg-[#0a0f14] ring-1 ring-white/10">
            {phase === 'rendering' ? (
              <>
                {result.asset.poster && !isAudioResult && (
                  <img
                    src={result.asset.poster}
                    alt=""
                    aria-hidden
                    className="h-full w-full object-cover opacity-25 blur-[2px]"
                  />
                )}
                <div className="sv-scan absolute inset-0" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                  <span className="sv-meta rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] text-white/75 backdrop-blur">
                    {result.asset.model}
                  </span>
                  <p
                    className="text-[15px] font-medium text-white/90"
                    role="status"
                    aria-live="polite"
                  >
                    {stageLabel}
                  </p>
                  <div className="text-[32px] leading-none font-semibold text-white tabular-nums">
                    {progress}%
                  </div>
                </div>
                <p className="sv-meta absolute inset-x-3 top-3 truncate rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white/70 backdrop-blur">
                  “{result.prompt}”
                </p>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                  <div
                    className="h-full bg-[var(--sv-iris-bright)] transition-[width] duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            ) : result.tabId === 'video' ? (
              <video
                key={result.asset.src}
                src={result.asset.src}
                poster={result.asset.poster}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : result.tabId === 'image' ? (
              <img
                src={result.asset.src}
                alt={result.prompt}
                className="sv-kenburns h-full w-full object-cover"
                style={{ '--sv-kb-d': '30s' } as CSSProperties}
              />
            ) : (
              /* Audio result — custom player over an equalizer */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8">
                <audio
                  ref={audioRef}
                  src={result.asset.src}
                  loop
                  onPlay={() => setAudioPlaying(true)}
                  onPause={() => setAudioPlaying(false)}
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = audioRef.current;
                    if (!el) return;
                    if (el.paused)
                      el.play().catch(() => setAudioPlaying(false));
                    else el.pause();
                  }}
                  aria-label={audioPlaying ? pauseLabel : playLabel}
                  className="sv-press inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sv-iris-strong)] text-white hover:bg-[var(--sv-iris-deep)]"
                >
                  {audioPlaying ? (
                    <Pause size={20} fill="currentColor" aria-hidden />
                  ) : (
                    <Play
                      size={20}
                      fill="currentColor"
                      className="ml-0.5"
                      aria-hidden
                    />
                  )}
                </button>
                <div
                  className={cn(
                    'sv-eq w-full max-w-[300px]',
                    !audioPlaying && 'sv-eq-paused'
                  )}
                  aria-hidden
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <span
                      key={i}
                      style={
                        {
                          '--i': i,
                          '--sv-eq-h': 0.45 + ((i * 7) % 10) / 12,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Result chrome — small chips off the bottom edge so native video
                controls stay clickable. */}
            {phase === 'done' && (
              <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                <span className="sv-meta inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  <Check
                    size={11}
                    className="text-[var(--sv-iris-bright)]"
                    aria-hidden
                  />
                  {readyLabel}
                </span>
                <span className="sv-meta ml-auto rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur">
                  {result.asset.model}
                  {result.asset.meta ? ` · ${result.asset.meta}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Caption row — actions + demo disclosure */}
          {phase === 'done' && (
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="sv-meta text-[11px] text-white/40">{demoNote}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startRun(result.prompt, result.tabId)}
                  className="sv-press inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-[12.5px] font-medium text-white/75 transition-colors hover:border-[var(--sv-iris)]/60 hover:text-white"
                >
                  <RefreshCw size={13} aria-hidden />
                  {againLabel}
                </button>
                <button
                  type="button"
                  onClick={() => onSignUp?.(result.prompt, result.tabId)}
                  className="sv-press inline-flex items-center gap-1.5 rounded-full bg-[var(--sv-iris-strong)] px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[var(--sv-iris-deep)]"
                >
                  {keepLabel}
                  <ArrowRight size={13} aria-hidden />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trust line */}
      <ul className="mt-4 flex flex-wrap items-center gap-2">
        {trust.map((t) => (
          <li
            key={t}
            className="rounded-full border border-white/15 px-3 py-1 text-[11.5px] text-white/70"
          >
            {t}
          </li>
        ))}
      </ul>

      {/* Example chips — one tap fills the prompt bar so the tool works on this page */}
      <div className="mt-3 flex max-w-[640px] flex-wrap items-center justify-center gap-2">
        <span className="sv-meta text-[11.5px] text-white/50">
          {examplesLabel}
        </span>
        {promptExamples.map((example) => (
          <button
            key={example}
            type="button"
            title={example}
            onClick={() => {
              setDraft(example);
              inputRef.current?.focus();
            }}
            className="max-w-[240px] truncate rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11.5px] text-white/70 transition-colors hover:border-[var(--sv-iris)]/60 hover:text-white"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
