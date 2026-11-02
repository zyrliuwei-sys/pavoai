import { tDynamic } from '@/core/i18n/dynamic';
import { landingVideos } from '@/config/landing-media';
import { m } from '@/paraglide/messages.js';
import { LandingGallery } from '@/components/landing/gallery';

const ITEMS = [
  {
    slug: 'user-skate-reel',
    i: 1,
    aspect: 'aspect-[4/5]',
  },
  {
    slug: 'user-neon-bike',
    i: 2,
    aspect: 'aspect-[3/4]',
  },
  {
    slug: 'user-dune-wreck',
    i: 3,
    aspect: '4/3',
  },
  {
    slug: 'user-yarn-cat',
    i: 4,
    aspect: '3/4',
  },
  {
    slug: 'user-golden-retriever',
    i: 5,
    aspect: 'aspect-[3/4]',
  },
  {
    slug: 'user-lab-tornado',
    i: 6,
    aspect: '1/1',
  },
] as const;

/**
 * Gallery — user-provided clips for creative inspiration.
 */
export function Gallery() {
  return (
    <LandingGallery
      label={m['lp.gal.label']()}
      title={m['lp.gal.title']()}
      subtitle={m['lp.gal.sub']()}
      playLabel={m['lp.hero.play']()}
      pauseLabel={m['lp.hero.pause']()}
      items={ITEMS.map(({ slug, i, aspect }) => ({
        video: landingVideos[slug],
        alt: tDynamic(`lp.gal.g${i}`),
        caption: tDynamic(`lp.gal.g${i}`),
        tag: tDynamic(`lp.gal.g${i}m`),
        aspect,
      }))}
      cta={{ label: m['lp.gal.cta'](), href: '/#generator' }}
    />
  );
}
