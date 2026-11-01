import { useRouter } from '@/core/i18n/navigation';
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
 * Composer toolbar options per mode. Model ids are the EvoLink catalog keys
 * the /api/ai/generate route validates against — only wired models are
 * listed, so every dropdown entry really generates.
 */
const VIDEO_MODELS = [
  { id: 'seedance-2-0', label: 'Seedance 2.0' },
  { id: 'wan-2-7', label: 'Wan 2.7' },
];
const IMAGE_MODELS = [
  { id: 'nano-banana-2', label: 'Nano Banana 2' },
  { id: 'seedream-4', label: 'Seedream 4' },
];
const VIDEO_ASPECTS = [
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
  { id: '1:1', label: '1:1' },
];
const IMAGE_ASPECTS = [
  { id: '1:1', label: '1:1' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
];
const VIDEO_QUALITIES = [
  { id: '720p', label: '720p' },
  { id: '1080p', label: '1080p' },
];
const IMAGE_QUALITIES = [
  { id: '1k', label: '1K' },
  { id: '2k', label: '2K' },
  { id: '4k', label: '4K' },
];

/**
 * Hero — the PavoAI opening section: headline and the interactive generator
 * (mode tabs, prompt bar, in-place render preview) over video tiles.
 */
export function Hero() {
  const router = useRouter();
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
      // The result-card CTA carries the visitor's prompt (and picked mode)
      // into the sign-up flow instead of doing nothing.
      onSignUp={(prompt, tab) => {
        const params = new URLSearchParams({ mode: tab });
        if (prompt.trim()) params.set('prompt', prompt.trim());
        router.push(`/sign-up?${params.toString()}`);
      }}
      tabs={[
        {
          id: 'video',
          label: m['lp.hero.tab_video'](),
          placeholder: m['lp.hero.placeholder_video'](),
          models: VIDEO_MODELS,
          aspects: VIDEO_ASPECTS,
          qualities: VIDEO_QUALITIES,
        },
        {
          id: 'image',
          label: m['lp.hero.tab_image'](),
          placeholder: m['lp.hero.placeholder_image'](),
          models: IMAGE_MODELS,
          aspects: IMAGE_ASPECTS,
          qualities: IMAGE_QUALITIES,
        },
      ]}
      ctaLabel={m['lp.hero.cta']()}
      examplesLabel={m['lp.hero.examples_label']()}
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
      referenceLabel={m['lp.hero.reference']()}
      referenceHint={m['lp.hero.reference_hint']()}
      styleLabel={m['lp.hero.style']()}
      fastLabel={m['lp.hero.fast']()}
      stages={[
        m['lp.hero.stage_1'](),
        m['lp.hero.stage_2'](),
        m['lp.hero.stage_3'](),
        m['lp.hero.stage_4'](),
      ]}
      readyLabel={m['lp.hero.ready']()}
      againLabel={m['lp.hero.again']()}
      keepLabel={m['lp.hero.keep']()}
      demoNote={m['lp.hero.demo_note']()}
      playLabel={m['lp.hero.play']()}
      pauseLabel={m['lp.hero.pause']()}
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
