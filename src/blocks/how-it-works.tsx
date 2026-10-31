import { m } from '@/paraglide/messages.js';
import { LandingHowItWorks } from '@/components/landing/how-it-works';

/**
 * How it works — four steps, each illustrated by a real generated frame.
 */
export function HowItWorks() {
  return (
    <LandingHowItWorks
      label={m['lp.how.label']()}
      title={m['lp.how.title']()}
      steps={[
        {
          title: m['lp.how.s1'](),
          description: m['lp.how.s1d'](),
          image: '/imgs/generated/how-mode.jpg',
        },
        {
          title: m['lp.how.s2'](),
          description: m['lp.how.s2d'](),
          image: '/imgs/generated/how-prompt.jpg',
        },
        {
          title: m['lp.how.s3'](),
          description: m['lp.how.s3d'](),
          image: '/imgs/generated/how-compare.jpg',
        },
        {
          title: m['lp.how.s4'](),
          description: m['lp.how.s4d'](),
          image: '/imgs/generated/how-export.jpg',
        },
      ]}
    />
  );
}
