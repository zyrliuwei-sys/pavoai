import { m } from '@/paraglide/messages.js';
import { LandingGuide } from '@/components/landing/guide';

/**
 * SEO long-form guide — keyword-bearing copy (text to video, image to video,
 * AI video editor, AI video maker) in an editorial layout.
 */
export function Guide() {
  return (
    <LandingGuide
      label={m['lp.guide.label']()}
      title={m['lp.guide.title']()}
      intro={m['lp.guide.intro']()}
      blocks={[
        { title: m['lp.guide.b1t'](), body: m['lp.guide.b1']() },
        { title: m['lp.guide.b2t'](), body: m['lp.guide.b2']() },
        { title: m['lp.guide.b3t'](), body: m['lp.guide.b3']() },
        { title: m['lp.guide.b4t'](), body: m['lp.guide.b4']() },
      ]}
    />
  );
}
