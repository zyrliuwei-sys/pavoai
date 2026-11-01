import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import { LandingComparison } from '@/components/landing/comparison';

/**
 * Comparison — 15 subscriptions vs one Pavo AI balance.
 */
export function Comparison() {
  return (
    <LandingComparison
      label={m['lp.cmp.label']()}
      title={m['lp.cmp.title']()}
      subtitle={m['lp.cmp.sub']()}
      oldWay={{
        kicker: m['lp.cmp.old_kicker'](),
        heading: m['lp.cmp.old_heading'](),
        note: m['lp.cmp.old_note'](),
        items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => ({
          name: tDynamic(`lp.cmp.i${i}`),
          category: tDynamic(`lp.cmp.i${i}c`),
        })),
      }}
      newWay={{
        kicker: m['lp.cmp.new_kicker'](),
        heading: m['lp.cmp.new_heading'](),
        note: m['lp.cmp.new_note'](),
        features: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => tDynamic(`lp.cmp.f${i}`)),
        pricePrefix: m['lp.cmp.price_prefix'](),
        price: m['lp.cmp.price'](),
        // P0-2: send the visitor to the in-page generator instead of /sign-up.
        cta: { label: m['lp.cmp.cta'](), href: '/#generator' },
        secondary: { label: m['lp.cmp.secondary'](), href: '/#tools' },
      }}
    />
  );
}
