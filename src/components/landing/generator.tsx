import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  FastForward,
  ImagePlus,
  Loader2,
  Palette,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTypewriter } from '@/components/landing/reveal';

export interface GeneratorOption {
  id: string;
  label: string;
}

export interface GeneratorTab {
  id: string;
  label: string;
  placeholder: string;
  /** Model dropdown entries shown in the toolbar. */
  models: GeneratorOption[];
  /** Aspect chips; omit (audio) to hide the group. */
  aspects?: GeneratorOption[];
  /** Quality chips (480p/1K/…), echoed on the result badge. */
  qualities: GeneratorOption[];
}

export interface GeneratorAsset {
  /** Lowercase keywords (en + zh) matched against the prompt to theme the result. */
  keywords: string[];
  src: string;
  poster?: string;
  /** Fallback model badge when no model is picked; per-tab picks win. */
  model: string;
  /** Short spec hint, e.g. "0:08 · 640×360". */
  meta?: string;
}

/** What a finished run produced, and from which settings. */
interface RunResult {
  asset: GeneratorAsset;
  prompt: string;
  tabId: string;
  model: string;
  meta: string;
  aspectId?: string;
}

export interface LandingGeneratorProps {
  tabs: GeneratorTab[];
  /** Example prompts cycled by the typewriter placeholder. */
  promptExamples: string[];
  examplesLabel: string;
  generateLabel: string;
  trust: string[];
  /** Reference-image area. */
  referenceLabel: string;
  referenceHint: string;
  /** Toggle chips. */
  styleLabel: string;
  fastLabel: string;
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

/** Fake render duration: standard vs Fast mode. */
const RENDER_MS = 4800;
const RENDER_FAST_MS = 2200;

/** Max client-side reference images (matches the reference design's 6). */
const MAX_REFS = 6;

/** Result-card sizing per aspect chip. */
const ASPECT_FRAME: Record<string, string> = {
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '1:1': 'aspect-square',
};
const ASPECT_WRAP: Record<string, string> = {
  '16:9': 'max-w-[640px]',
  '9:16': 'max-w-[350px]',
  '1:1': 'max-w-[460px]',
};

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

/** Toolbar chip group — option list with one active id (aspect/quality). */
function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: GeneratorOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5 ring-1 ring-white/10">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'sv-meta rounded-full px-2.5 py-1 text-[11.5px] text-white/60 transition-colors hover:text-white',
              active && 'bg-[var(--sv-iris-strong)] text-white'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The hero's composer-style generator, mirroring the reference design: one
 * panel holding mode tabs, a multiline prompt, reference images and a
 * toolbar (model dropdown, aspect, quality, Style/Fast toggles) with a
 * large Generate button — then an in-place render preview that finishes
 * with a playable demo result. Pure component — all copy and assets arrive
 * via props from the hero block.
 */
export function LandingGenerator({
  tabs,
  promptExamples,
  examplesLabel,
  generateLabel,
  trust,
  referenceLabel,
  referenceHint,
  styleLabel,
  fastLabel,
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

  // Toolbar selections, kept per tab id.
  const [modelByTab, setModelByTab] = useState<Record<string, string>>(() =>
    Object.fromEntries(tabs.map((tab) => [tab.id, tab.models[0]?.id ?? '']))
  );
  const [aspectByTab, setAspectByTab] = useState<Record<string, string>>(() =>
    Object.fromEntries(tabs.map((tab) => [tab.id, tab.aspects?.[0]?.id ?? '']))
  );
  const [qualityByTab, setQualityByTab] = useState<Record<string, string>>(() =>
    Object.fromEntries(tabs.map((tab) => [tab.id, tab.qualities[0]?.id ?? '']))
  );
  const [styleOn, setStyleOn] = useState(false);
  const [fastOn, setFastOn] = useState(false);

  // Model dropdown (open one at a time).
  const [modelsOpen, setModelsOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Client-side reference images (object URLs, revoked on remove/unmount).
  const [refs, setRefs] = useState<{ id: string; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Freeze the typewriter once there is something real to show (typed draft
  // or an active run) — it re-rendered the whole bar every 55ms otherwise.
  const typed = useTypewriter(promptExamples, {
    active: draft === null && phase === 'idle',
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Bumped per run so regenerating the same prompt rotates the demo clip.
  const attemptRef = useRef(0);

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const activeModelId = modelByTab[activeTab?.id ?? ''] ?? '';
  const activeModel =
    activeTab?.models.find((m) => m.id === activeModelId) ??
    activeTab?.models[0];
  const activeAspectId = aspectByTab[activeTab?.id ?? ''] ?? '';
  const activeQualityId = qualityByTab[activeTab?.id ?? ''] ?? '';

  // Stop the demo audio when the generator unmounts and drop ref previews.
  const refsRef = useRef(refs);
  refsRef.current = refs;
  useEffect(
    () => () => {
      audioRef.current?.pause();
      for (const r of refsRef.current) URL.revokeObjectURL(r.url);
    },
    []
  );

  // Close the model dropdown on outside pointer / Escape.
  useEffect(() => {
    if (!modelsOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!modelMenuRef.current?.contains(e.target as Node))
        setModelsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModelsOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [modelsOpen]);

  // Drive the fake render: eased 0→100, then flip to the result.
  useEffect(() => {
    if (phase !== 'rendering') return;
    const duration = fastOn ? RENDER_FAST_MS : RENDER_MS;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const t = window.setTimeout(() => {
        setProgress(100);
        setPhase('done');
      }, 600);
      return () => window.clearTimeout(t);
    }
    const t0 = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - t0;
      // Ease-out: fast start, trickle near 100 like a real render queue.
      const value = Math.min(
        100,
        Math.round(100 * (1 - Math.pow(1 - elapsed / duration, 2.4)))
      );
      setProgress(value);
      if (value >= 100) {
        window.clearInterval(timer);
        setPhase('done');
      }
    }, 90);
    return () => window.clearInterval(timer);
  }, [phase, fastOn]);

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
    const tab = tabs.find((t) => t.id === tabId);
    const asset = pickAsset(assets[tabId] ?? [], prompt, attemptRef.current);
    if (!asset) return;
    attemptRef.current += 1;
    audioRef.current?.pause();
    setAudioPlaying(false);
    const model =
      tab?.models.find((m) => m.id === (modelByTab[tabId] ?? ''))?.label ??
      asset.model;
    const quality = tab?.qualities.find(
      (q) => q.id === (qualityByTab[tabId] ?? '')
    )?.label;
    const meta = [asset.meta, quality, styleOn ? styleLabel : '']
      .filter(Boolean)
      .join(' · ');
    setResult({
      asset,
      prompt,
      tabId,
      model,
      meta,
      aspectId: aspectByTab[tabId] || undefined,
    });
    setProgress(0);
    setPhase('rendering');
  };

  const submit = () => {
    const prompt = (draft ?? typed ?? '').trim() || promptExamples[0] || '';
    if (!prompt) {
      textareaRef.current?.focus();
      return;
    }
    startRun(prompt, activeTab?.id ?? tabs[0]?.id ?? '');
  };

  const switchTab = (tabId: string) => {
    setActiveId(tabId);
    setDraft(null); // tab placeholders differ; let the typewriter take over
    setModelsOpen(false);
    if (phase !== 'idle') {
      setPhase('idle');
      setResult(null);
      setProgress(0);
      audioRef.current?.pause();
      setAudioPlaying(false);
    }
  };

  const addRefFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...refs];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_REFS) break;
      if (!file.type.startsWith('image/')) continue;
      next.push({
        id: `${file.name}-${file.size}-${Math.random()}`,
        url: URL.createObjectURL(file),
      });
    }
    setRefs(next);
  };

  const removeRef = (id: string) => {
    const target = refs.find((r) => r.id === id);
    if (target) URL.revokeObjectURL(target.url);
    setRefs((list) => list.filter((r) => r.id !== id));
  };

  const onTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (phase !== 'rendering') submit();
    }
  };

  const stageLabel =
    stages[
      Math.min(stages.length - 1, Math.floor((progress / 100) * stages.length))
    ] ?? stages[0];

  const isAudioResult = result?.tabId === 'audio';
  const resultAspect =
    ASPECT_FRAME[result?.aspectId ?? '16:9'] ?? 'aspect-video';
  const resultWrap = ASPECT_WRAP[result?.aspectId ?? '16:9'] ?? 'max-w-[640px]';

  return (
    <div className="flex w-full flex-col items-center">
      {/* Composer panel */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (phase !== 'rendering') submit();
        }}
        className="mt-8 w-full max-w-[860px] rounded-[22px] bg-white/[0.055] p-3 ring-1 ring-white/10 backdrop-blur-md sm:p-4"
      >
        {/* Mode tabs — inside the panel, per the reference layout */}
        <div className="inline-flex rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10">
          {tabs.map((tab) => {
            const active = tab.id === activeTab?.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => switchTab(tab.id)}
                className={cn(
                  'h-8 rounded-full px-4 text-[13px] font-medium text-white/65 transition-colors hover:text-white',
                  active && 'bg-[var(--sv-iris-strong)] text-white'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Prompt textarea — Enter generates, Shift+Enter breaks a line */}
        <textarea
          ref={textareaRef}
          rows={3}
          value={draft ?? ''}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onTextareaKeyDown}
          placeholder={
            draft === null && typed
              ? `${typed}▍`
              : (activeTab?.placeholder ?? '')
          }
          aria-label={activeTab?.placeholder}
          disabled={phase === 'rendering'}
          className="sv-meta mt-3 min-h-[92px] w-full resize-none rounded-xl bg-transparent px-2 py-1.5 text-[15.5px] leading-relaxed text-white placeholder:text-white/40 focus:outline-none disabled:opacity-60"
        />

        {/* Toolbar: reference images + settings + Generate */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* Reference images — client-side previews only */}
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addRefFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title={`${referenceLabel} · ${referenceHint}`}
              className="sv-meta inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-white/20 px-3 text-[12px] text-white/60 transition-colors hover:border-[var(--sv-iris)]/60 hover:text-white"
            >
              <ImagePlus size={14} aria-hidden />
              {referenceLabel}
              <span className="text-white/35">
                {refs.length}/{MAX_REFS}
              </span>
            </button>
            {refs.map((r) => (
              <span
                key={r.id}
                className="relative h-9 w-9 rounded-lg ring-1 ring-white/15"
              >
                <img
                  src={r.url}
                  alt=""
                  className="h-full w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => removeRef(r.id)}
                  className="absolute -top-1.5 -right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/75 text-white ring-1 ring-white/30 transition-colors hover:bg-black"
                >
                  <X size={10} aria-hidden />
                </button>
              </span>
            ))}
          </div>

          {/* Model dropdown */}
          <div ref={modelMenuRef} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={modelsOpen}
              onClick={() => setModelsOpen((v) => !v)}
              className="sv-meta inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 text-[12px] text-white/75 ring-1 ring-white/10 transition-colors hover:text-white"
            >
              <Sparkles
                size={13}
                className="text-[var(--sv-iris-bright)]"
                aria-hidden
              />
              {activeModel?.label}
              <ChevronDown
                size={13}
                className={cn(
                  'transition-transform',
                  modelsOpen && 'rotate-180'
                )}
                aria-hidden
              />
            </button>
            {modelsOpen && (
              <div
                role="listbox"
                className="absolute bottom-11 left-0 z-20 max-h-64 min-w-[190px] overflow-auto rounded-2xl bg-[#101720] p-1.5 shadow-2xl ring-1 shadow-black/50 ring-white/15"
              >
                {activeTab?.models.map((model) => {
                  const active = model.id === activeModel?.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setModelByTab((prev) => ({
                          ...prev,
                          [activeTab.id]: model.id,
                        }));
                        setModelsOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[12.5px] text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white',
                        active && 'text-white'
                      )}
                    >
                      {model.label}
                      {active && (
                        <Check
                          size={13}
                          className="text-[var(--sv-iris-bright)]"
                          aria-hidden
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aspect chips (video/image only) */}
          {activeTab?.aspects && (
            <ChipGroup
              options={activeTab.aspects}
              value={activeAspectId}
              onChange={(id) =>
                setAspectByTab((prev) => ({ ...prev, [activeTab.id]: id }))
              }
            />
          )}

          {/* Quality chips */}
          {activeTab && (
            <ChipGroup
              options={activeTab.qualities}
              value={activeQualityId}
              onChange={(id) =>
                setQualityByTab((prev) => ({ ...prev, [activeTab.id]: id }))
              }
            />
          )}

          {/* Style toggle */}
          <button
            type="button"
            aria-pressed={styleOn}
            onClick={() => setStyleOn((v) => !v)}
            className={cn(
              'sv-meta inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12px] ring-1 transition-colors',
              styleOn
                ? 'bg-[var(--sv-iris-strong)]/25 text-white ring-[var(--sv-iris)]/50'
                : 'text-white/60 ring-white/10 hover:text-white'
            )}
          >
            <Palette size={13} aria-hidden />
            {styleLabel}
          </button>

          {/* Fast toggle — really shortens the render preview */}
          <button
            type="button"
            aria-pressed={fastOn}
            onClick={() => setFastOn((v) => !v)}
            className={cn(
              'sv-meta inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12px] ring-1 transition-colors',
              fastOn
                ? 'bg-[var(--sv-iris-strong)]/25 text-white ring-[var(--sv-iris)]/50'
                : 'text-white/60 ring-white/10 hover:text-white'
            )}
          >
            <FastForward size={13} aria-hidden />
            {fastLabel}
          </button>

          {/* Generate — the panel's primary action, bottom right */}
          <button
            type="submit"
            disabled={phase === 'rendering'}
            className="sv-press ml-auto inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--sv-iris-strong)] px-6 text-[14.5px] font-semibold text-white shadow-[var(--sv-iris-deep)]/30 shadow-lg hover:bg-[var(--sv-iris-deep)] disabled:cursor-wait"
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
        </div>
      </form>

      {/* Render monitor / result card */}
      {result && (
        <div
          ref={stageRef}
          className="sv-enter mt-4 w-full max-w-[640px]"
          style={{ '--i': 0 } as CSSProperties}
        >
          <div
            className={cn(
              'relative mx-auto w-full overflow-hidden rounded-[18px] bg-[#0a0f14] ring-1 ring-white/10',
              resultAspect,
              resultWrap
            )}
          >
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
                    {result.model}
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
                  {result.model}
                  {result.meta ? ` · ${result.meta}` : ''}
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

      {/* Example chips — one tap fills the prompt so the tool works on this page */}
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
              textareaRef.current?.focus();
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
