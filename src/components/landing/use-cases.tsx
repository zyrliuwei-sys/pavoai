import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';

import { RevealSection } from '@/components/landing/reveal';

export interface UseCase {
  title: string;
  description: string;
  /** Long-form caption under the image — always fully visible (SEO copy). */
  detail: string;
  image: string;
  icon: LucideIcon;
}

export interface LandingUseCasesProps {
  label: string;
  title: string;
  subtitle: string;
  cases: UseCase[];
  href: string;
}

export function LandingUseCases({
  label,
  title,
  subtitle,
  cases,
  href,
}: LandingUseCasesProps) {
  // Stagger cascade: title words → subtitle → cards.
  const titleWords = title.split(' ');
  const cardBase = titleWords.length + 1;

  return (
    <RevealSection id="use-cases" className="sv-day py-20 sm:py-28 lg:py-32">
      <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-8">
        <div>
          <p className="text-[13px] text-zinc-500">{label}</p>
          <h2 className="sv-display mt-2 text-[clamp(2rem,1.1rem+2.6vw,4.2rem)] leading-none text-zinc-950">
            {titleWords.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className="sv-enter inline-block"
                style={{ '--i': i } as CSSProperties}
              >
                {word}
                {i < titleWords.length - 1 ? ' ' : ''}
              </span>
            ))}
          </h2>
          <p
            className="sv-enter mt-4 max-w-[560px] text-[15px] leading-relaxed text-zinc-600"
            style={{ '--i': titleWords.length } as CSSProperties}
          >
            {subtitle}
          </p>
        </div>

        <div className="sv-rv sv-rv-cards sv-rv-zoom mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cases.map((card, index) => {
            const Icon = card.icon;
            return (
              <a
                key={card.title}
                href={href}
                className="sv-enter sv-hover-lift sv-press group relative block overflow-hidden rounded-[16px] bg-white ring-1 ring-zinc-950/[0.08]"
                style={{ '--i': cardBase + index } as CSSProperties}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-t-[16px] bg-zinc-100">
                  <img
                    src={card.image}
                    alt={card.title}
                    width={600}
                    height={450}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
                  />
                  <span className="absolute top-4 left-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
                    <Icon size={16} />
                  </span>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 pt-14">
                    <h3 className="text-[15px] font-semibold text-white">
                      {card.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-white/65">
                      {card.description}
                    </p>
                  </div>
                </div>
                <p className="p-4 text-[13px] leading-relaxed text-zinc-600">
                  {card.detail}
                </p>
              </a>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}
