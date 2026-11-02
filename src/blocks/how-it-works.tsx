import { landingVideos } from '@/config/landing-media';
import { m } from '@/paraglide/messages.js';
import { LandingHowItWorks } from '@/components/landing/how-it-works';

/**
 * How it works — four steps, illustrated with licensed workflow clips.
 */
export function HowItWorks() {
  return (
    <LandingHowItWorks
      label={m['lp.how.label']()}
      title={m['lp.how.title']()}
      playLabel={m['lp.hero.play']()}
      pauseLabel={m['lp.hero.pause']()}
      steps={[
        {
          title: m['lp.how.s1'](),
          description: m['lp.how.s1d'](),
          video: landingVideos['digital-world'],
        },
        {
          title: m['lp.how.s2'](),
          description: m['lp.how.s2d'](),
          video: landingVideos.typing,
        },
        {
          title: m['lp.how.s3'](),
          description: m['lp.how.s3d'](),
          video: landingVideos.editing,
        },
        {
          title: m['lp.how.s4'](),
          description: m['lp.how.s4d'](),
          video: landingVideos.forest,
        },
      ]}
    />
  );
}
