import type { CSSProperties } from 'react';

import {
  useCountUp,
  useInView,
  useRevealGroup,
} from '@/components/landing/reveal';

export interface StatItem {
  value: string;
  lead: string;
  rest?: string;
}

export interface LandingStatsBandProps {
  items: StatItem[];
}

/** Splits "20+" into { n: 20, suffix: "+" }; non-numeric leads render as-is. */
function parseValue(value: string) {
  const match = value.match(/^(\d+)(.*)$/);
  if (!match) return null;
  return { n: Number(match[1]), suffix: match[2] };
}

function StatValue({ value, start }: { value: string; start: boolean }) {
  const parsed = parseValue(value);
  const n = useCountUp(parsed?.n ?? 0, start && !!parsed);
  return (
    <div className="sv-display text-[clamp(2.5rem,1.5rem+2vw,4.16rem)] leading-none text-zinc-950">
      {parsed ? (
        <>
          {n}
          <span className="text-[var(--sv-iris-strong)]">{parsed.suffix}</span>
        </>
      ) : (
        value
      )}
    </div>
  );
}

export function LandingStatsBand({ items }: LandingStatsBandProps) {
  const groupRef = useRevealGroup<HTMLElement>();
  const [viewRef, inView] = useInView<HTMLDivElement>();

  return (
    <section
      ref={groupRef}
      className="sv-day sv-rv-group border-y border-zinc-950/[0.08]"
    >
      <div
        ref={viewRef}
        className="mx-auto w-full max-w-[1240px] px-6 py-14 sm:px-8 lg:py-16"
      >
        <div className="grid grid-cols-2 gap-10 text-center lg:grid-cols-4 lg:text-left">
          {items.map((item, index) => (
            <div
              key={`${item.value}-${index}`}
              className="sv-rv"
              style={{ '--i': index } as CSSProperties}
            >
              <StatValue value={item.value} start={inView} />
              <p className="mt-3 text-[13px]">
                <span className="font-medium text-zinc-800">{item.lead}</span>
                {item.rest ? (
                  <span className="text-zinc-500">{` ${item.rest}`}</span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
