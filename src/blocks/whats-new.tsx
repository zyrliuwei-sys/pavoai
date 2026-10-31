import { m } from '@/paraglide/messages.js';
import { LandingWhatsNew } from '@/components/landing/whats-new';

/**
 * What's new — model drops and feature announcements on white.
 */
export function WhatsNew() {
  return (
    <LandingWhatsNew
      label={m['lp.new.label']()}
      title={m['lp.new.title']()}
      link={{ label: m['lp.new.link'](), href: '/#tools' }}
      cards={[
        {
          badge: m['lp.new.c1_badge'](),
          tone: 'live',
          title: m['lp.new.c1_title'](),
          description: m['lp.new.c1_desc'](),
        },
        {
          badge: m['lp.new.c2_badge'](),
          tone: 'new',
          title: m['lp.new.c2_title'](),
          description: m['lp.new.c2_desc'](),
        },
        {
          badge: m['lp.new.c3_badge'](),
          tone: 'new',
          title: m['lp.new.c3_title'](),
          description: m['lp.new.c3_desc'](),
        },
        {
          badge: m['lp.new.c4_badge'](),
          tone: 'studio',
          title: m['lp.new.c4_title'](),
          description: m['lp.new.c4_desc'](),
        },
      ]}
    />
  );
}
