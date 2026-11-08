import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useLocation } from '@tanstack/react-router';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  FastForward,
  Loader2,
  Palette,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import {
  EVO_MODELS,
  evoCostCredits,
  evoDuration,
  evoDurationOptions,
} from '@/config/ai-pricing';
import { ApiError, apiGet, apiPost } from '@/lib/api-client';
import type { DeliveryMode } from '@/lib/generation-delivery';
import {
  parsePendingGeneration,
  shouldResumeGeneration,
  type GenerationSelection,
  type PendingGeneration,
} from '@/lib/generator-state';
import { cn } from '@/lib/utils';
import {
  GeneratorGuide,
  type GeneratorPromptExample,
} from '@/components/landing/generator-guide';
import { useTypewriter } from '@/components/landing/reveal';

export type {
  GenerationSelection,
  PendingGeneration,
} from '@/lib/generator-state';

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

/** What a finished run produced, and from which settings. */
interface RunResult {
  prompt: string;
  tabId: string;
  model: string;
  /** Generated media URL ("" while the task is still rendering). */
  url: string;
  meta: string;
  downloadUrl?: string;
  delivery?: DeliveryMode;
  aspectId?: string;
}

/** Task state returned by /api/ai/generate. */
interface GenStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  url: string;
  error: string;
  downloadUrl: string;
  delivery: DeliveryMode;
  emailSent: boolean;
}

export interface LandingGeneratorProps {
  delivery: {
    registered: boolean;
    email: string;
    onEmailChange: (email: string) => void;
    emailAvailable: boolean;
    emailLabel: string;
    emailPlaceholder: string;
    title: string;
    hint: string;
    downloadLabel: string;
    accountResult: string;
    emailResult: string;
    temporaryResult: string;
    retryLabel: string;
    worksLabel: string;
  };
  tabs: GeneratorTab[];
  /** Example prompts cycled by the typewriter placeholder. */
  promptExamples: GeneratorPromptExample[];
  examplesLabel: string;
  examplesDescription: string;
  usePromptLabel: string;
  selectedPromptLabel: string;
  generateLabel: string;
  creditLabel: string;
  durationLabel: string;
  durationHint: string;
  trust: string[];
  /** Toggle chips. */
  styleLabel: string;
  fastLabel: string;
  /** Stage labels cycled while the render runs. */
  stages: string[];
  readyLabel: string;
  againLabel: string;
  /** Result CTA — the block wires it to the sign-up flow. */
  keepLabel: string;
  demoNote: string;
  playLabel: string;
  pauseLabel: string;
  onSignUp?: (prompt: string, tabId: string) => void;
  /**
   * Gate before the first attempt: the block opens an anonymous session for
   * brand-new visitors and sends them straight to the paywall (guests start
   * with 0 credits) — return 'blocked' to stop the run, 'run' to proceed.
   */
  onFirstGenerate?: (
    prompt: string,
    tabId: string,
    selection: GenerationSelection
  ) => Promise<'run' | 'blocked'>;
  /**
   * Called when generation is blocked by auth (401) or credits (402) — the
   * block opens the paywall panel instead of surfacing an error.
   */
  onPaywall?: (
    prompt: string,
    tabId: string,
    selection: GenerationSelection
  ) => void;
}

/** Poll cadence for the generation task. */
const POLL_MS = 2500;

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parks the run while the visitor pays, so it survives the checkout
 * redirect: the prompt is restored into the box and, when `auto` is set
 * (the run was interrupted by the paywall), generation resumes on its own.
 * `email` is the optional delivery address left in the paywall.
 */
const PENDING_GEN_KEY = 'pavoai:pending-gen';

export function parkPendingGen(pending: PendingGeneration) {
  try {
    sessionStorage.setItem(PENDING_GEN_KEY, JSON.stringify(pending));
  } catch {}
}

export function readPendingGen(): PendingGeneration | null {
  try {
    const raw = sessionStorage.getItem(PENDING_GEN_KEY);
    if (!raw) return null;
    return parsePendingGeneration(raw);
  } catch {
    return null;
  }
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
              'sv-meta rounded-full px-2 py-1 text-[11px] text-white/60 transition-colors hover:text-white',
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
 * panel holding mode tabs, a multiline prompt and a toolbar (model dropdown,
 * aspect, quality, Style/Fast toggles) with a large Generate button — then
 * an in-place render preview that finishes with the real generated
 * image/video. Pure component — all copy arrives via props from the hero
 * block; only the generation API call lives here.
 */
export function LandingGenerator({
  delivery,
  tabs,
  promptExamples,
  examplesLabel,
  examplesDescription,
  usePromptLabel,
  selectedPromptLabel,
  generateLabel,
  creditLabel,
  durationLabel,
  durationHint,
  trust,
  styleLabel,
  fastLabel,
  stages,
  readyLabel,
  againLabel,
  keepLabel,
  demoNote,
  playLabel,
  pauseLabel,
  onSignUp,
  onFirstGenerate,
  onPaywall,
}: LandingGeneratorProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  // null = visitor hasn't typed; the typewriter owns the placeholder.
  const [draft, setDraft] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'rendering' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const inFlightRef = useRef(false);
  const searchStr = useLocation({ select: (location) => location.searchStr });

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
  const [fastOn, setFastOn] = useState(false);
  const [durationByModel, setDurationByModel] = useState<
    Record<string, number>
  >({});

  // Model dropdown (open one at a time).
  const [modelsOpen, setModelsOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Freeze the typewriter once there is something real to show (typed draft
  // or an active run) — it re-rendered the whole bar every 55ms otherwise.
  const typed = useTypewriter(
    promptExamples.map((example) => example.prompt),
    {
      active: draft === null && phase === 'idle',
    }
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Bumped per run: stale polls from an earlier (or unmounted) run give up.
  const runIdRef = useRef(0);
  const mountedRef = useRef(true);
  // Optional delivery address from the paywall; consumed when a run completes.
  const deliverEmailRef = useRef('');
  // One 402 retry for auto-resumed runs: credits land via webhook a beat
  // after the payment redirect.
  const autoRetriedRef = useRef(false);

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const activeModelId = modelByTab[activeTab?.id ?? ''] ?? '';
  const activeModel =
    activeTab?.models.find((m) => m.id === activeModelId) ??
    activeTab?.models[0];
  const activeAspectId = aspectByTab[activeTab?.id ?? ''] ?? '';
  const activeQualityId = qualityByTab[activeTab?.id ?? ''] ?? '';
  const activeCatalogModel = EVO_MODELS[activeModelId];
  const durationOptions = activeCatalogModel
    ? evoDurationOptions(activeCatalogModel)
    : [];
  const activeDuration = activeCatalogModel
    ? evoDuration(activeCatalogModel, durationByModel[activeModelId])
    : undefined;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runIdRef.current += 1; // kills any in-flight poll loop
    };
  }, []);

  // Restore a run parked by the paywall: after paying, checkout redirects
  // back here — the prompt returns to the box, and when the run was
  // interrupted by the paywall (auto) generation resumes on its own.
  useEffect(() => {
    const pending = readPendingGen();
    if (!pending) return;
    try {
      sessionStorage.removeItem(PENDING_GEN_KEY);
    } catch {}
    if (!pending.prompt || !tabs.some((t) => t.id === pending.tabId)) return;
    setActiveId(pending.tabId);
    setDraft(pending.prompt);
    if (pending.selection) {
      setModelByTab((value) => ({
        ...value,
        [pending.tabId]: pending.selection!.modelId,
      }));
      setQualityByTab((value) => ({
        ...value,
        [pending.tabId]: pending.selection!.quality,
      }));
      setAspectByTab((value) => ({
        ...value,
        [pending.tabId]: pending.selection!.aspect,
      }));
      setFastOn(pending.selection.fast);
      if (pending.selection.duration !== undefined)
        setDurationByModel((value) => ({
          ...value,
          [pending.selection!.modelId]: pending.selection!.duration!,
        }));
    }
    if (pending.email) {
      deliverEmailRef.current = pending.email;
      delivery.onEmailChange(pending.email);
    }
    if (shouldResumeGeneration(pending, window.location.search)) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('checkout');
      window.history.replaceState(window.history.state, '', cleanUrl);
      autoRetriedRef.current = false;
      // A tick for the restored draft to settle, then roll.
      const timer = window.setTimeout(
        () => startRun(pending.prompt, pending.tabId, true, pending.selection),
        700
      );
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation links can open a mode/model without a full-page reload.
  useEffect(() => {
    if (inFlightRef.current) return;
    const params = new URLSearchParams(searchStr);
    const tab = tabs.find((item) => item.id === params.get('mode'));
    if (!tab) return;
    setActiveId(tab.id);
    const model = params.get('model');
    if (model && tab.models.some((item) => item.id === model)) {
      setModelByTab((previous) => ({ ...previous, [tab.id]: model }));
    }
    const prompt = params.get('prompt');
    if (prompt) setDraft(prompt.slice(0, 2000));
    setModelsOpen(false);
    // The URL changes drive this effect; tabs carry translated labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchStr]);

  // Stop the demo audio when the generator unmounts.
  useEffect(
    () => () => {
      audioRef.current?.pause();
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

  // Idle-time animation while the real task runs: creep toward ~90 so the
  // bar always moves; server-side progress (set by the poll loop) can push
  // past it, and completion snaps to 100.
  useEffect(() => {
    if (phase !== 'rendering') return;
    const timer = window.setInterval(() => {
      setProgress((p) => Math.min(90, p + 0.8));
    }, 400);
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

  const runGeneration = async (
    prompt: string,
    tabId: string,
    auto = false,
    restoredSelection?: GenerationSelection
  ): Promise<void> => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab || phase === 'rendering') return;
    const selectedModelId = modelByTab[tabId] || tab.models[0]?.id || '';
    const selection: GenerationSelection = restoredSelection ?? {
      modelId: selectedModelId,
      quality: qualityByTab[tabId] ?? '',
      aspect: aspectByTab[tabId] || '16:9',
      fast: fastOn,
      duration: EVO_MODELS[selectedModelId]
        ? evoDuration(
            EVO_MODELS[selectedModelId],
            durationByModel[selectedModelId]
          )
        : undefined,
    };

    // First-generate gate: the block signs in an anonymous guest and, for
    // brand-new visitors (0 credits by design), opens the paywall directly —
    // no wasted API round trip, no error surface.
    if (onFirstGenerate) {
      const gate = await onFirstGenerate(prompt, tabId, selection);
      if (gate === 'blocked' || !mountedRef.current) return;
    }

    const modelId = selection.modelId;
    const model = tab.models.find((m) => m.id === modelId)?.label ?? modelId;
    const quality = tab.qualities.find(
      (q) => q.id === selection.quality
    )?.label;
    const aspectId = selection.aspect;
    const meta = [
      quality,
      aspectId,
      selection.duration ? `${selection.duration}s` : '',
      selection.fast ? fastLabel : '',
    ]
      .filter(Boolean)
      .join(' · ');

    runIdRef.current += 1;
    const runId = runIdRef.current;
    audioRef.current?.pause();
    setAudioPlaying(false);
    setResult({ prompt, tabId, model, url: '', meta, aspectId });
    setProgress(0);
    setRetrying(false);
    setPhase('rendering');

    const stale = () => runIdRef.current !== runId || !mountedRef.current;

    // Delivery continues on the server even when this browser goes away.
    const attempt = async (): Promise<void> => {
      const { taskId, access } = await apiPost<{
        taskId: string;
        access: string;
      }>('/api/ai/generate', {
        prompt,
        model: modelId,
        aspect: aspectId ?? '16:9',
        quality: selection.quality,
        fast: selection.fast,
        duration: selection.duration,
        email: delivery.registered
          ? undefined
          : (auto ? deliverEmailRef.current : delivery.email.trim()) ||
            undefined,
      });
      if (stale()) return;

      // Poll the task until it completes, fails, or a newer run takes over.
      let pollFailures = 0;
      for (;;) {
        await sleep(Math.min(30_000, POLL_MS * 2 ** Math.min(pollFailures, 4)));
        if (stale()) return;
        let st: GenStatus;
        try {
          st = await apiGet<GenStatus>(
            `/api/ai/generate?taskId=${encodeURIComponent(taskId)}&access=${encodeURIComponent(access || '')}`
          );
        } catch (error) {
          if (stale()) return;
          if (error instanceof ApiError && [401, 404].includes(error.code))
            throw error;
          // Keep the original task and its in-memory guest access. Retrying a
          // status request must never create another paid generation.
          pollFailures += 1;
          setRetrying(true);
          continue;
        }
        if (stale()) return;
        pollFailures = 0;
        setRetrying(false);

        setProgress((p) => Math.max(p, st.progress));
        if (st.status === 'completed') {
          if (!st.url) throw new Error('Generation returned no result');
          setResult((prev) =>
            prev
              ? {
                  ...prev,
                  url: st.url,
                  downloadUrl: st.downloadUrl,
                  delivery: st.delivery,
                }
              : prev
          );
          setProgress(100);
          setPhase('done');

          // A temporary guest's download is attempted once. The visible button
          // remains available if the browser blocks an automatic download.
          if (st.delivery === 'temporary' && st.downloadUrl) {
            const link = document.createElement('a');
            link.href = st.downloadUrl;
            link.download = '';
            document.body.append(link);
            link.click();
            link.remove();
          }
          return;
        }
        if (st.status === 'failed') {
          throw new Error(st.error || 'Generation failed');
        }
      }
    };

    const blocked = (error: unknown): error is ApiError =>
      error instanceof ApiError && (error.code === 401 || error.code === 402);

    try {
      await attempt();
    } catch (error) {
      if (stale()) return;
      // Auto-resumed runs get one retry: the payment webhook can land a beat
      // after the checkout redirect, which surfaces as a transient 402. Wait
      // past the create-rate window (10s) or the retry just eats a 429.
      if (auto && !autoRetriedRef.current && blocked(error)) {
        autoRetriedRef.current = true;
        await sleep(11000);
        if (stale()) return;
        try {
          await attempt();
          return;
        } catch (retryError) {
          if (stale()) return;
          error = retryError;
        }
      }
      setPhase('idle');
      setResult(null);
      setProgress(0);
      // Paid generation: 401 (no session) and 402 (no credits) both open the
      // paywall panel — never an error toast, never a redirect away.
      if (blocked(error)) {
        onPaywall?.(prompt, tabId, selection);
        return;
      }
      toast.error((error as any)?.message || 'Generation failed');
    }
  };

  // Claim before the asynchronous session gate so rapid clicks create one task.
  const startRun = async (
    prompt: string,
    tabId: string,
    auto = false,
    selection?: GenerationSelection
  ) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStarting(true);
    try {
      await runGeneration(prompt, tabId, auto, selection);
    } catch (error) {
      if (mountedRef.current)
        toast.error((error as Error)?.message || 'Generation failed');
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setStarting(false);
    }
  };

  const submit = () => {
    const prompt = (draft ?? '').trim();
    if (!prompt) {
      textareaRef.current?.focus();
      return;
    }
    startRun(prompt, activeTab?.id ?? tabs[0]?.id ?? '');
  };

  const switchTab = (tabId: string) => {
    setActiveId(tabId);
    // Keep the user's draft when switching between video and image.
    setModelsOpen(false);
    if (phase !== 'idle') {
      runIdRef.current += 1; // cancel any in-flight run
      setPhase('idle');
      setResult(null);
      setProgress(0);
      audioRef.current?.pause();
      setAudioPlaying(false);
    }
  };

  const onTextareaKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
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
        className="mt-8 w-full max-w-[1040px] rounded-[22px] bg-white/[0.055] p-3 ring-1 ring-white/10 backdrop-blur-md sm:p-4"
      >
        <fieldset
          disabled={starting || phase === 'rendering'}
          className="min-w-0"
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
            maxLength={2000}
            value={draft ?? ''}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onTextareaKeyDown}
            placeholder={
              activeTab?.id === 'video' && draft === null && typed
                ? `${typed}▍`
                : (activeTab?.placeholder ?? '')
            }
            aria-label={activeTab?.placeholder}
            disabled={starting || phase === 'rendering'}
            className="sv-meta mt-3 min-h-[92px] w-full resize-none rounded-xl bg-transparent px-2 py-1.5 text-[15.5px] leading-relaxed text-white placeholder:text-white/40 focus:outline-none disabled:opacity-60"
          />

          {/* Toolbar: settings + Generate */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {/* Model dropdown */}
            <div ref={modelMenuRef} className="relative">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={modelsOpen}
                onClick={() => setModelsOpen((v) => !v)}
                className="sv-meta inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/[0.06] px-2.5 text-[12px] text-white/75 ring-1 ring-white/10 transition-colors hover:text-white"
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

            {durationOptions.length > 0 && (
              <label className="sv-meta inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/[0.06] px-2.5 text-[12px] text-white/75 ring-1 ring-white/10">
                <Clock3 size={13} aria-hidden />
                {durationLabel}
                <select
                  aria-label={durationLabel}
                  value={activeDuration}
                  onChange={(event) =>
                    setDurationByModel((previous) => ({
                      ...previous,
                      [activeModelId]: Number(event.target.value),
                    }))
                  }
                  className="h-full cursor-pointer rounded bg-transparent pl-1 text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--sv-iris)]"
                >
                  {durationOptions.map((seconds) => (
                    <option
                      key={seconds}
                      value={seconds}
                      className="bg-[#101720]"
                    >
                      {seconds}s
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Preserve the original copy for the style control. */}
            <button
              type="button"
              disabled
              className="sv-meta inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-xl px-2.5 text-[12px] text-white/40 ring-1 ring-white/10"
            >
              <Palette size={13} aria-hidden />
              {styleLabel}
            </button>

            {/* Fast toggle — picks the provider's fast lane (model variant or
              prompt priority) on the server. */}
            <button
              type="button"
              aria-pressed={fastOn}
              onClick={() => setFastOn((v) => !v)}
              className={cn(
                'sv-meta inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[12px] ring-1 transition-colors',
                fastOn
                  ? 'bg-[var(--sv-iris-strong)]/25 text-white ring-[var(--sv-iris)]/50'
                  : 'text-white/60 ring-white/10 hover:text-white'
              )}
            >
              <FastForward size={13} aria-hidden />
              {fastLabel}
            </button>

            {/* Generate — the panel's primary action, bottom right */}
            {EVO_MODELS[activeModelId] && (
              <span className="sv-meta ml-auto self-center text-xs text-white/75">
                {evoCostCredits(
                  EVO_MODELS[activeModelId],
                  activeQualityId,
                  fastOn,
                  activeDuration
                ).toLocaleString()}{' '}
                {creditLabel}
              </span>
            )}
            <button
              type="submit"
              disabled={starting || phase === 'rendering'}
              className="sv-press inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--sv-iris-strong)] px-6 text-[14.5px] font-semibold text-white shadow-[var(--sv-iris-deep)]/30 shadow-lg hover:bg-[var(--sv-iris-deep)] disabled:cursor-wait lg:w-auto"
            >
              {starting || phase === 'rendering' ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  <span className="tabular-nums">{Math.round(progress)}%</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} aria-hidden />
                  {generateLabel}
                </>
              )}
            </button>
          </div>
          {durationOptions.length > 0 && (
            <p className="sv-meta mt-3 px-1 text-left text-xs leading-relaxed text-white/60">
              {durationHint}
            </p>
          )}
        </fieldset>
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
                    {retrying ? delivery.retryLabel : stageLabel}
                  </p>
                  <div className="text-[32px] leading-none font-semibold text-white tabular-nums">
                    {Math.round(progress)}%
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
                key={result.url}
                src={result.url}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : result.tabId === 'image' ? (
              <img
                src={result.url}
                alt={result.prompt}
                className="sv-kenburns h-full w-full object-cover"
                style={{ '--sv-kb-d': '30s' } as CSSProperties}
              />
            ) : (
              /* Audio result — custom player over an equalizer */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8">
                <audio
                  ref={audioRef}
                  src={result.url}
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

          {/* Caption row — actions + disclosure */}
          {phase === 'done' && (
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="sv-meta max-w-md text-[12px] leading-relaxed text-white/65">
                {result.delivery === 'account'
                  ? delivery.accountResult
                  : result.delivery === 'email'
                    ? delivery.emailResult
                    : delivery.temporaryResult}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startRun(result.prompt, result.tabId)}
                  className="sv-press inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-[12.5px] font-medium text-white/75 transition-colors hover:border-[var(--sv-iris)]/60 hover:text-white"
                >
                  <RefreshCw size={13} aria-hidden />
                  {againLabel}
                </button>
                {result.downloadUrl && (
                  <a
                    href={result.downloadUrl}
                    download
                    className="sv-press inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--sv-iris-strong)] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[var(--sv-iris-deep)]"
                  >
                    {delivery.downloadLabel}
                    <ArrowRight size={13} aria-hidden />
                  </a>
                )}
                {result.delivery === 'account' && (
                  <Link
                    href="/settings/works"
                    className="inline-flex min-h-10 items-center rounded-full border border-white/15 px-4 text-[12.5px] text-white"
                  >
                    {delivery.worksLabel}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <GeneratorGuide
        delivery={delivery}
        showDelivery={phase === 'idle'}
        examples={promptExamples}
        title={examplesLabel}
        description={examplesDescription}
        usePromptLabel={usePromptLabel}
        selectedLabel={selectedPromptLabel}
        capabilities={trust}
        currentPrompt={draft}
        disabled={starting || phase === 'rendering'}
        onSelect={(prompt) => {
          setDraft(prompt);
          textareaRef.current?.focus();
        }}
      />
    </div>
  );
}
