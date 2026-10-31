import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import { LandingStatsBand } from '@/components/landing/stats-band';

/**
 * Stats — the dark number band between How-it-works and Pricing.
 */
export function Stats() {
  return (
    <LandingStatsBand
      items={[1, 2, 3, 4].map((i) => ({
        value: tDynamic(`lp.stats.${i}v`),
        lead: tDynamic(`lp.stats.${i}l`),
        rest: tDynamic(`lp.stats.${i}r`),
      }))}
    />
  );
}
