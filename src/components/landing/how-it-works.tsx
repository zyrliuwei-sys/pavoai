import { useState } from 'react';

import { RevealSection } from '@/components/landing/reveal';

export interface StepData {
  title: string;
  description: string;
  /** Real generated frame for the step; renders a numeral frame while missing. */
  image?: string;
  alt?: string;
}

export interface LandingHowItWorksProps {
  label: string;
  title: string;
  subtitle?: string;
  steps: StepData[];
}

function StepFrame({
  index,
  image,
  alt,
}: {
  index: number;
  image?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-[12px] bg-[#080b11] ring-1 ring-black/10">
      {/* Fallback layer: oversized numeral, revealed until the frame loads */}
      <span
        aria-hidden
        className="sv-display absolute inset-0 flex items-center justify-center text-[clamp(2.5rem,1.4rem+2vw,4rem)] text-white/12"
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      {image && !failed ? (
        <img
          src={image}
          alt={alt ?? ''}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}

export function LandingHowItWorks({
  label,
  title,
  subtitle,
  steps,
}: LandingHowItWorksProps) {
  return (
    <RevealSection className="bg-white py-20 sm:py-28 lg:py-32">
      <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-8">
        <div className="sv-rv text-center">
          <p className="text-[13px] text-zinc-500">{label}</p>
          <h2 className="mt-2 text-[clamp(2rem,1.1rem+2.6vw,4.2rem)] leading-none font-semibold tracking-[-0.04em] text-zinc-950">
            {title}
          </h2>
          {subtitle ? (
            <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-relaxed text-zinc-500">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="sv-rv sv-rv-cards sv-rv-zoom mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {steps.map((step, index) => (
            <div key={step.title}>
              <StepFrame index={index} image={step.image} alt={step.alt} />
              <div className="mt-4 flex items-baseline gap-2.5">
                <span className="sv-meta text-[11px] font-medium text-[var(--sv-iris-strong)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-[15px] font-semibold text-zinc-950">
                  {step.title}
                </h3>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
