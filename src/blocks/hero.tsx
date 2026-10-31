import { m } from '@/paraglide/messages.js';
import { LandingHero } from '@/components/landing/hero';

const MODELS = [
  'Veo 3.1',
  'Kling 3.0',
  'Sora 2',
  'Hailuo 02',
  'Wan 3.0',
  'Seedance 1.0',
  'Runway Gen-4',
  'Luma Ray 3',
  'Pika 2.5',
  'Vidu Q2',
  'PixVerse V5',
  'MiniMax',
];

const TILES = [
  { slug: 'hero-peacock', duration: '0:08' },
  { slug: 'hero-neon-car', duration: '0:06' },
  { slug: 'hero-anime', duration: '0:10' },
  { slug: 'hero-perfume', duration: '0:05' },
  { slug: 'hero-astronaut', duration: '0:09' },
  { slug: 'hero-dragon', duration: '0:12' },
  { slug: 'hero-dancer', duration: '0:07' },
  { slug: 'hero-city', duration: '0:11' },
];

/**
 * Hero — the PavoAI opening section: headline, prompt bar and video tiles.
 */
export function Hero() {
  const headline = m['lp.hero.headline']();
  const emphasized = m['lp.hero.emphasized']();

  const words = headline
    .split(' ')
    .filter(Boolean)
    .map((text) => ({
      text,
      emphasized: !!emphasized && text.includes(emphasized),
    }));

  return (
    <LandingHero
      eyebrow={m['lp.hero.eyebrow']()}
      words={words}
      subtitle={m['lp.hero.subtitle']()}
      tabs={[
        {
          id: 'video',
          label: m['lp.hero.tab_video'](),
          placeholder: m['lp.hero.placeholder_video'](),
        },
        {
          id: 'image',
          label: m['lp.hero.tab_image'](),
          placeholder: m['lp.hero.placeholder_image'](),
        },
        {
          id: 'audio',
          label: m['lp.hero.tab_audio'](),
          placeholder: m['lp.hero.placeholder_audio'](),
        },
      ]}
      ctaLabel={m['lp.hero.cta']()}
      promptExamples={[
        m['lp.hero.pe1'](),
        m['lp.hero.pe2'](),
        m['lp.hero.pe3'](),
      ]}
      trust={[
        m['lp.hero.trust_1'](),
        m['lp.hero.trust_2'](),
        m['lp.hero.trust_3'](),
        m['lp.hero.trust_4'](),
      ]}
      tiles={TILES.map(({ slug, duration }) => ({
        src: `/imgs/generated/${slug}.jpg`,
        alt: m['lp.hero.tile_alt'](),
        kind: 'video' as const,
        duration,
      }))}
      marquee={{
        title: m['lp.hero.marquee_title'](),
        models: MODELS,
        pauseLabel: m['lp.hero.pause'](),
      }}
    />
  );
}
