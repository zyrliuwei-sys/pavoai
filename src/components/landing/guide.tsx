import { RevealSection } from '@/components/landing/reveal';

export interface GuideBlock {
  title: string;
  body: string;
}

export interface LandingGuideProps {
  label: string;
  title: string;
  intro: string;
  blocks: GuideBlock[];
}

/**
 * Editorial long-form section: hairline-ruled 2-column grid, mono indexes,
 * generous measure. Deliberately not cards — the rules carry the grid.
 */
export function LandingGuide({
  label,
  title,
  intro,
  blocks,
}: LandingGuideProps) {
  return (
    <RevealSection className="bg-zinc-100 py-20 sm:py-28 lg:py-32">
      <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-8">
        <p className="sv-meta text-[11px] font-medium tracking-[0.14em] text-[var(--sv-iris-strong)] uppercase">
          {label}
        </p>
        <div className="sv-rv mt-5 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          <h2 className="max-w-[22ch] text-[clamp(1.8rem,1rem+2.2vw,3.4rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-zinc-950">
            {title}
          </h2>
          <p className="max-w-[52ch] self-end text-[15px] leading-relaxed text-zinc-600">
            {intro}
          </p>
        </div>

        <div className="sv-rv sv-rv-cards mt-12 grid gap-x-14 gap-y-10 border-t border-zinc-300/70 pt-10 md:grid-cols-2">
          {blocks.map((block, index) => (
            <article
              key={block.title}
              className="border-t border-zinc-300/70 pt-6 md:border-0 md:pt-0"
            >
              <span className="sv-meta text-[11px] font-medium text-zinc-400">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.01em] text-zinc-950">
                {block.title}
              </h3>
              <p className="mt-2.5 max-w-[58ch] text-[14px] leading-[1.75] text-zinc-600">
                {block.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
