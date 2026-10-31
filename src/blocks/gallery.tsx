import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import { LandingGallery } from '@/components/landing/gallery';

const ITEMS = [
  {
    slug: 'gal-couple',
    i: 1,
    aspect: 'aspect-[4/5]',
    kind: 'video',
    duration: '0:08',
  },
  {
    slug: 'gal-samurai',
    i: 2,
    aspect: 'aspect-[3/4]',
    kind: 'video',
    duration: '0:10',
  },
  {
    slug: 'gal-boxing',
    i: 3,
    aspect: 'aspect-square',
    kind: 'video',
    duration: '0:06',
  },
  {
    slug: 'gal-fashion',
    i: 4,
    aspect: 'aspect-[4/5]',
    kind: 'video',
    duration: '0:05',
  },
  {
    slug: 'gal-forest',
    i: 5,
    aspect: 'aspect-[3/4]',
    kind: 'video',
    duration: '0:09',
  },
  {
    slug: 'gal-robot',
    i: 6,
    aspect: 'aspect-square',
    kind: 'video',
    duration: '0:12',
  },
] as const;

/**
 * Gallery — masonry of clips "made on PavoAI", with model tags.
 */
export function Gallery() {
  return (
    <LandingGallery
      label={m['lp.gal.label']()}
      title={m['lp.gal.title']()}
      subtitle={m['lp.gal.sub']()}
      items={ITEMS.map(({ slug, i, aspect, kind, duration }) => ({
        src: `/imgs/generated/${slug}.jpg`,
        alt: tDynamic(`lp.gal.g${i}`),
        caption: tDynamic(`lp.gal.g${i}`),
        model: tDynamic(`lp.gal.g${i}m`),
        aspect,
        kind,
        duration,
      }))}
      cta={{ label: m['lp.gal.cta'](), href: '/#generator' }}
    />
  );
}
