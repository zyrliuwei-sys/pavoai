import { Fragment, useRef, useState, type CSSProperties } from 'react';
import { Play, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTypewriter } from '@/components/landing/reveal';

export interface HeroTab {
  id: string;
  label: string;
  placeholder: string;
}

export interface HeroTile {
  src: string;
  alt: string;
  kind?: 'video';
  duration?: string;
}

export interface LandingHeroProps {
  eyebrow: string;
  words: { text: string; emphasized?: boolean }[];
  subtitle: string;
  tabs: HeroTab[];
  /** Example prompts cycled by the typewriter in the prompt bar. */
  promptExamples: string[];
  /** Label in front of the clickable example chips. */
  examplesLabel: string;
  ctaLabel: string;
  /** Called with the submitted prompt + active tab id; wired by the block. */
  onSubmitPrompt?: (prompt: string, tabId: string) => void;
  trust: string[];
  tiles: HeroTile[];
  marquee: { title: string; models: string[]; pauseLabel: string };
}

/** Entrance stagger for the gallery tiles: continue after the headline words. */
const TILE_STAGGER_OFFSET = 5;

/** Fixed width reserved for the marquee title so the flex row stays aligned. */
const MARQUEE_TITLE_WIDTH = 104;

export function LandingHero({
  eyebrow,
  words,
  subtitle,
  tabs,
  promptExamples,
  examplesLabel,
  ctaLabel,
  onSubmitPrompt,
  trust,
  tiles,
  marquee,
}: LandingHeroProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  const [paused, setPaused] = useState(false);
  // null = visitor hasn't typed; the typewriter owns the placeholder.
  const [draft, setDraft] = useState<string | null>(null);
  const typed = useTypewriter(promptExamples);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const doubledModels = [...marquee.models, ...marquee.models];
  const tileBase = words.length + TILE_STAGGER_OFFSET;

  return (
    <section
      id="generator"
      className="sv-day sv-grain relative isolate flex min-h-svh flex-col items-center overflow-hidden px-6 pt-28 pb-8 lg:pt-32"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[1040px] flex-1 flex-col items-center text-center">
        {/* Eyebrow */}
        <div className="inline-flex h-8 items-center gap-2 rounded-full border border-zinc-950/10 bg-white px-3 text-[12.5px] font-medium text-zinc-700 shadow-sm">
          {eyebrow}
        </div>

        {/* Headline — masked rise, one gate per word */}
        <h1 className="sv-display mt-6 max-w-[15ch] text-[clamp(3rem,1.2rem+6.6vw,8.5rem)] leading-[0.94] tracking-[-0.01em] text-zinc-950">
          {words.map((word, index) => (
            <Fragment key={`${word.text}-${index}`}>
              <span className="sv-mask">
                <span
                  className={cn(
                    word.emphasized && 'text-[var(--sv-iris-strong)] italic'
                  )}
                  style={{ '--i': index } as CSSProperties}
                >
                  {word.text}
                </span>
              </span>
              {index < words.length - 1 ? ' ' : null}
            </Fragment>
          ))}
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-[640px] text-[15px] leading-relaxed text-zinc-600 sm:text-base">
          {subtitle}
        </p>

        {/* Mode tabs */}
        <div className="mt-8 inline-flex rounded-full bg-zinc-950/[0.05] p-1 ring-1 ring-zinc-950/10">
          {tabs.map((tab) => {
            const active = tab.id === activeTab?.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveId(tab.id)}
                className={cn(
                  'h-9 rounded-full px-4 text-sm font-medium text-zinc-600 hover:text-zinc-950',
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
            onSubmitPrompt?.(
              draft ?? typed ?? '',
              activeTab?.id ?? tabs[0]?.id ?? 'video'
            );
          }}
          className="mt-4 flex h-[60px] w-full max-w-[640px] items-center rounded-[18px] bg-white py-1.5 pr-1.5 pl-4 shadow-sm ring-1 ring-zinc-950/10 transition-shadow duration-300 focus-within:ring-2 focus-within:ring-[var(--sv-iris)]"
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
            className="sv-meta min-w-0 flex-1 bg-transparent text-[16px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
          <button
            type="submit"
            className="sv-press inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[var(--sv-iris-strong)] px-6 text-[15px] font-semibold text-white hover:bg-[var(--sv-iris-deep)]"
          >
            <Sparkles size={16} aria-hidden />
            {ctaLabel}
          </button>
        </form>

        {/* Trust line */}
        <ul className="mt-4 flex flex-wrap items-center gap-2">
          {trust.map((t) => (
            <li
              key={t}
              className="rounded-full border border-zinc-950/10 bg-white px-3 py-1 text-[11.5px] text-zinc-600"
            >
              {t}
            </li>
          ))}
        </ul>

        {/* Example chips — one tap fills the prompt bar so the tool works on this page */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="sv-meta text-[11.5px] text-zinc-500">
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
              className="max-w-[240px] truncate rounded-full border border-zinc-950/10 bg-white px-3 py-1 text-[11.5px] text-zinc-600 transition-colors hover:border-[var(--sv-iris)]/60 hover:text-zinc-950"
            >
              {example}
            </button>
          ))}
        </div>

        {/* Gallery */}
        <div className="mt-12 grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:mt-16 lg:gap-4">
          {tiles.map((tile, index) => (
            <div
              key={`${tile.src}-${index}`}
              className="sv-enter sv-hover-lift relative aspect-video overflow-hidden rounded-[14px] bg-zinc-100 ring-1 ring-zinc-950/[0.08] transition-[box-shadow] duration-500 hover:ring-[var(--sv-iris)]/50"
              style={{ '--i': index + tileBase } as CSSProperties}
            >
              <img
                src={tile.src}
                alt={tile.alt}
                width={640}
                height={360}
                loading="lazy"
                className="sv-kenburns h-full w-full object-cover"
                style={
                  {
                    '--sv-kb-d': `${24 + (index % 3) * 6}s`,
                    '--sv-kb-delay': `${index * -7}s`,
                  } as CSSProperties
                }
              />
              {tile.kind === 'video' && (
                <span className="sv-meta absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur">
                  <Play size={10} fill="currentColor" aria-hidden />
                  {tile.duration}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Model marquee — title + track + pause button in one row */}
        <div className="relative z-10 mt-14 w-full">
          <div className="flex items-center gap-3">
            <h2
              className="shrink-0 text-left text-[12.5px] leading-snug font-medium text-zinc-500"
              style={{ width: MARQUEE_TITLE_WIDTH }}
            >
              {marquee.title.split('\n').map((line, index) => (
                <Fragment key={index}>
                  {index > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </h2>
            <div className="sv-marquee sv-fade-mask-x relative min-w-0 flex-1 overflow-hidden">
              <div
                className="sv-marquee-track"
                style={
                  {
                    '--sv-marquee-gap': '32px',
                    animationPlayState: paused ? 'paused' : undefined,
                  } as CSSProperties
                }
              >
                {doubledModels.map((model, index) => (
                  <span
                    key={`${model}-${index}`}
                    className="flex shrink-0 items-center gap-2 text-sm font-medium text-zinc-600"
                  >
                    <Sparkles
                      size={14}
                      className="text-[var(--sv-iris-strong)]"
                      aria-hidden
                    />
                    {model}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
              className="ml-3 shrink-0 rounded-full border border-zinc-950/15 bg-white px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-900"
            >
              {paused ? 'Resume' : marquee.pauseLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
