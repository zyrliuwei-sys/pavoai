import { Fragment, useState, type CSSProperties } from 'react';
import { Play, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  LandingGenerator,
  type GeneratorTab,
} from '@/components/landing/generator';

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
  tabs: GeneratorTab[];
  /** Example prompts cycled by the typewriter in the prompt bar. */
  promptExamples: string[];
  /** Label in front of the clickable example chips. */
  examplesLabel: string;
  ctaLabel: string;
  /** Called with the finished prompt + mode from the result card CTA. */
  onSignUp?: (prompt: string, tabId: string) => void;
  /** See LandingGeneratorProps — guest session + paywall hooks. */
  ensureSession?: () => Promise<boolean>;
  onPaywall?: (prompt: string, tabId: string) => void;
  trust: string[];
  /** Generator composer labels (toggles). */
  styleLabel: string;
  fastLabel: string;
  /** Generator render-preview copy. */
  stages: string[];
  readyLabel: string;
  againLabel: string;
  keepLabel: string;
  demoNote: string;
  playLabel: string;
  pauseLabel: string;
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
  onSignUp,
  ensureSession,
  onPaywall,
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
  tiles,
  marquee,
}: LandingHeroProps) {
  const [paused, setPaused] = useState(false);

  const doubledModels = [...marquee.models, ...marquee.models];
  const tileBase = words.length + TILE_STAGGER_OFFSET;

  return (
    <section
      id="generator"
      className="sv-night sv-grain relative isolate flex min-h-svh flex-col items-center overflow-hidden px-6 pt-28 pb-8 lg:pt-32"
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[1040px] flex-1 flex-col items-center text-center">
        {/* Eyebrow */}
        <div className="inline-flex h-8 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 text-[12.5px] font-medium text-white/85 backdrop-blur-md">
          {eyebrow}
        </div>

        {/* Headline — masked rise, one gate per word. Scale tuned for the
            long category H1 so the generator stays in the first screen. */}
        <h1 className="sv-display mt-6 max-w-[17ch] text-[clamp(2.25rem,1rem+4.6vw,6.5rem)] leading-[0.94] tracking-[-0.01em] text-[#f4f6fb]">
          {words.map((word, index) => (
            <Fragment key={`${word.text}-${index}`}>
              <span className="sv-mask">
                <span
                  className={cn(
                    word.emphasized && 'text-[var(--sv-iris-bright)] italic'
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
        <p className="mt-6 max-w-[640px] text-[15px] leading-relaxed text-white/70 sm:text-base">
          {subtitle}
        </p>

        {/* Generator — mode tabs, prompt bar and the in-place render preview */}
        <LandingGenerator
          tabs={tabs}
          promptExamples={promptExamples}
          examplesLabel={examplesLabel}
          generateLabel={ctaLabel}
          trust={trust}
          styleLabel={styleLabel}
          fastLabel={fastLabel}
          stages={stages}
          readyLabel={readyLabel}
          againLabel={againLabel}
          keepLabel={keepLabel}
          demoNote={demoNote}
          playLabel={playLabel}
          pauseLabel={pauseLabel}
          onSignUp={onSignUp}
          ensureSession={ensureSession}
          onPaywall={onPaywall}
        />

        {/* Gallery */}
        <div className="mt-12 grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:mt-16 lg:gap-4">
          {tiles.map((tile, index) => (
            <div
              key={`${tile.src}-${index}`}
              className="sv-enter sv-hover-lift relative aspect-video overflow-hidden rounded-[14px] ring-1 ring-white/[0.07] transition-[box-shadow] duration-500 hover:ring-[var(--sv-iris)]/50"
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
              className="shrink-0 text-left text-[12.5px] leading-snug font-medium text-white/60"
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
                    className="flex shrink-0 items-center gap-2 text-sm font-medium text-white/70"
                  >
                    <Sparkles
                      size={14}
                      className="text-[var(--sv-iris-bright)]"
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
              className="ml-3 shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/60 hover:text-white"
            >
              {paused ? 'Resume' : marquee.pauseLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
