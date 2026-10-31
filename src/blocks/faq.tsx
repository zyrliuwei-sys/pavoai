import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import { LandingFaq } from '@/components/landing/faq';

/**
 * FAQ — two-column accordion on white.
 */
export function FAQ() {
  return (
    <LandingFaq
      label={m['lp.faq.label']()}
      title={m['lp.faq.title']()}
      items={[1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
        q: tDynamic(`lp.faq.q${i}`),
        a: tDynamic(`lp.faq.a${i}`),
      }))}
    />
  );
}
