import type { CSSProperties } from 'react';

import { RevealSection } from '@/components/landing/reveal';

export interface CompareItem {
  name: string;
  category: string;
}

export interface LandingComparisonProps {
  label: string;
  title: string;
  subtitle: string;
  oldWay: {
    kicker: string;
    heading: string;
    note: string;
    items: CompareItem[];
  };
  newWay: {
    kicker: string;
    heading: string;
    note: string;
    features: string[];
    pricePrefix: string;
    price: string;
    cta: { label: string; href: string };
    secondary: { label: string; href: string };
  };
}

export function LandingComparison({
  label,
  title,
  subtitle,
  oldWay,
  newWay,
}: LandingComparisonProps) {
  return (
    <RevealSection className="bg-white py-20 sm:py-28 lg:py-32">
      <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-8">
        <div className="sv-rv text-center">
          <p className="text-[13px] text-zinc-500">{label}</p>
          <h2 className="mt-2 text-[clamp(2rem,1.1rem+2.6vw,4.2rem)] leading-none font-semibold tracking-[-0.04em] text-zinc-950">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-relaxed text-zinc-500">
            {subtitle}
          </p>
        </div>

        <div className="sv-rv sv-rv-cards mt-12 grid items-stretch gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Old way */}
          <div
            className="sv-enter rounded-[24px] border border-zinc-200 bg-zinc-50 p-6 sm:p-8"
            style={{ '--i': 0 } as CSSProperties}
          >
            <p className="text-[13px] font-semibold tracking-wider text-zinc-500 uppercase">
              {oldWay.kicker}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-zinc-950">
              {oldWay.heading}
            </h3>
            <p className="mt-1 text-[13px] text-zinc-500">{oldWay.note}</p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {oldWay.items.map((item) => (
                <div
                  key={item.name}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
                >
                  <p className="truncate text-[13px] font-medium text-zinc-900">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-zinc-400">{item.category}</p>
                </div>
              ))}
            </div>
          </div>

          {/* New way */}
          <div
            className="sv-enter relative overflow-hidden rounded-[24px] bg-[#080b11] p-6 sm:p-8"
            style={{ '--i': 1 } as CSSProperties}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(59,130,246,0.22),transparent)]" />
            <div className="relative">
              <p className="text-[13px] font-semibold tracking-wider text-[var(--sv-iris-bright)] uppercase">
                {newWay.kicker}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {newWay.heading}
              </h3>
              <p className="mt-1 text-[13px] text-white/60">{newWay.note}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {newWay.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full bg-white/[0.08] px-3.5 py-1.5 text-[13px] font-medium text-white/85 ring-1 ring-white/10"
                  >
                    {feature}
                  </span>
                ))}
              </div>
              <p className="mt-6 text-sm text-white/70">
                {newWay.pricePrefix}{' '}
                <span className="font-semibold text-white">{newWay.price}</span>
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={newWay.cta.href}
                  className="sv-press inline-flex h-11 items-center rounded-full bg-[var(--sv-iris-strong)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--sv-iris-deep)]"
                >
                  {newWay.cta.label}
                </a>
                <a
                  href={newWay.secondary.href}
                  className="inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold text-white/85 ring-1 ring-white/20 transition hover:bg-white/[0.06]"
                >
                  {newWay.secondary.label}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}
