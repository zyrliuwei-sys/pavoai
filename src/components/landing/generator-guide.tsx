import {
  ArrowUpLeft,
  Check,
  Download,
  FolderCheck,
  Frame,
  Layers3,
  Mail,
  Video,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { LandingGeneratorProps } from '@/components/landing/generator';

export interface GeneratorPromptExample {
  prompt: string;
  title: string;
  image: string;
}

interface GeneratorGuideProps {
  delivery: LandingGeneratorProps['delivery'];
  showDelivery: boolean;
  examples: GeneratorPromptExample[];
  title: string;
  description: string;
  usePromptLabel: string;
  selectedLabel: string;
  capabilities: string[];
  currentPrompt: string | null;
  disabled: boolean;
  onSelect: (prompt: string) => void;
}

const CAPABILITY_ICONS = [Layers3, Video, Frame, Download];

/** Delivery guidance and a compact, keyboard-accessible scene picker. */
export function GeneratorGuide({
  delivery,
  showDelivery,
  examples,
  title,
  description,
  usePromptLabel,
  selectedLabel,
  capabilities,
  currentPrompt,
  disabled,
  onSelect,
}: GeneratorGuideProps) {
  const DeliveryIcon = delivery.registered
    ? FolderCheck
    : delivery.emailAvailable
      ? Mail
      : Download;

  return (
    <div className="sv-generator-guide mt-5 w-full max-w-[1040px] text-left">
      <div
        className={cn(
          'grid overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.025]',
          showDelivery && 'lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)]'
        )}
      >
        {showDelivery && (
          <aside className="border-b border-white/10 bg-white/[0.025] p-5 sm:p-6 lg:border-r lg:border-b-0">
            <div className="flex items-center gap-3 lg:mb-5 lg:flex-col lg:items-start lg:gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sv-iris)]/10 text-[var(--sv-iris-bright)]">
                <DeliveryIcon size={20} strokeWidth={1.6} aria-hidden />
              </span>
              <h2 className="text-[17px] leading-snug font-medium tracking-[-0.01em] text-white/95">
                {delivery.title}
              </h2>
            </div>
            <p className="mt-3 max-w-[42ch] text-[13px] leading-[1.75] text-pretty text-white/65 lg:mt-0">
              {delivery.hint}
            </p>
            {!delivery.registered && delivery.emailAvailable && (
              <label className="mt-4 block text-xs leading-relaxed text-white/80">
                {delivery.emailLabel}
                <input
                  type="email"
                  autoComplete="email"
                  maxLength={200}
                  value={delivery.email}
                  onChange={(event) =>
                    delivery.onEmailChange(event.target.value)
                  }
                  placeholder={delivery.emailPlaceholder}
                  className="mt-2 h-11 w-full rounded-lg border border-white/20 bg-[var(--sv-night)] px-3 text-sm text-white outline-none placeholder:text-white/50 focus-visible:border-[var(--sv-iris-bright)] focus-visible:ring-2 focus-visible:ring-[var(--sv-iris-bright)]/40"
                />
              </label>
            )}
          </aside>
        )}

        <section className="min-w-0 p-4 sm:p-5" aria-label={title}>
          <div className="px-1 pb-3">
            <h2 className="text-[17px] leading-snug font-medium tracking-[-0.01em] text-white/95">
              {title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              {description}
            </p>
          </div>
          <ul className="space-y-1">
            {examples.map((example) => {
              const selected = currentPrompt === example.prompt;
              return (
                <li key={example.prompt}>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    aria-label={`${usePromptLabel}: ${example.prompt}`}
                    onClick={() => onSelect(example.prompt)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors duration-200 outline-none hover:bg-white/[0.055] focus-visible:ring-2 focus-visible:ring-[var(--sv-iris-bright)] disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none sm:gap-4',
                      selected && 'bg-[var(--sv-iris)]/10'
                    )}
                  >
                    <img
                      src={example.image}
                      alt=""
                      width={88}
                      height={60}
                      loading="lazy"
                      decoding="async"
                      className="h-[60px] w-16 shrink-0 rounded-lg object-cover sm:w-[88px]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] leading-snug font-medium text-white/95">
                        {example.title}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-pretty text-white/60 group-hover:text-white/80">
                        {example.prompt}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60 group-hover:border-[var(--sv-iris-bright)]/50 group-hover:text-[var(--sv-iris-bright)]',
                        selected &&
                          'border-[var(--sv-iris-bright)]/40 text-[var(--sv-iris-bright)]'
                      )}
                      title={selected ? selectedLabel : usePromptLabel}
                    >
                      {selected ? (
                        <Check size={14} aria-hidden />
                      ) : (
                        <ArrowUpLeft size={14} aria-hidden />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 px-1 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-7">
        {capabilities.map((capability, index) => {
          const Icon = CAPABILITY_ICONS[index] ?? Check;
          return (
            <li
              key={capability}
              className="flex items-center gap-2 text-[11.5px] leading-relaxed text-white/65"
            >
              <Icon
                size={14}
                strokeWidth={1.6}
                className="shrink-0 text-[var(--sv-iris-bright)]/80"
                aria-hidden
              />
              {capability}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
