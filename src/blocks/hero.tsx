import { useRouter } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import type { GeneratorAsset } from '@/components/landing/generator';
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
 * Composer toolbar options per mode — model dropdown, aspect chips and
 * quality chips, mirroring the reference generator design.
 */
const VIDEO_MODELS = [
  { id: 'veo', label: 'Veo 3.1' },
  { id: 'kling', label: 'Kling 3.0' },
  { id: 'sora', label: 'Sora 2' },
  { id: 'hailuo', label: 'Hailuo 02' },
  { id: 'wan', label: 'Wan 3.0' },
  { id: 'seedance', label: 'Seedance 1.0' },
];
const IMAGE_MODELS = [
  { id: 'seedream', label: 'Seedream 4' },
  { id: 'flux', label: 'Flux.2' },
  { id: 'gemini-image', label: 'Gemini 3 Pro Image' },
  { id: 'ideogram', label: 'Ideogram 3' },
];
const AUDIO_MODELS = [
  { id: 'suno', label: 'Suno V5' },
  { id: 'udio', label: 'Udio v2' },
  { id: 'stable-audio', label: 'Stable Audio 2' },
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
  { id: '480p', label: '480p' },
  { id: '720p', label: '720p' },
  { id: '1080p', label: '1080p' },
];
const IMAGE_QUALITIES = [
  { id: '1k', label: '1K' },
  { id: '2k', label: '2K' },
  { id: '4k', label: '4K' },
];
const AUDIO_QUALITIES = [
  { id: '15s', label: '15s' },
  { id: '30s', label: '30s' },
  { id: '60s', label: '60s' },
];

/**
 * Demo results for the hero generator. Keywords are matched (en + zh,
 * lowercase, substring) against the prompt so a themed clip plays; prompts
 * with no hit fall back to a deterministic pick. Videos are pre-rendered
 * Ken Burns loops in /media, audio loops are synthesized (see /media).
 */
const VIDEO_ASSETS: GeneratorAsset[] = [
  {
    keywords: [
      'peacock',
      'feather',
      'bird',
      'iridescent',
      '孔雀',
      '开屏',
      '羽毛',
    ],
    src: '/media/hero-peacock.mp4',
    poster: '/imgs/generated/hero-peacock.jpg',
    model: 'Veo 3.1',
    meta: '0:08 · 640×360',
  },
  {
    keywords: [
      'neon',
      'car',
      'tokyo',
      'drift',
      'coupe',
      'rain',
      'cyber',
      '霓虹',
      '跑车',
      '东京',
      '漂移',
      '雨夜',
      '赛博',
    ],
    src: '/media/hero-neon-car.mp4',
    poster: '/imgs/generated/hero-neon-car.jpg',
    model: 'Kling 3.0',
    meta: '0:08 · 640×360',
  },
  {
    keywords: [
      'anime',
      'rooftop',
      'sunset',
      'girl',
      'hair',
      '动画',
      '动漫',
      '屋顶',
      '天台',
      '日落',
      '少女',
    ],
    src: '/media/hero-anime.mp4',
    poster: '/imgs/generated/hero-anime.jpg',
    model: 'Sora 2',
    meta: '0:08 · 640×360',
  },
  {
    keywords: [
      'perfume',
      'bottle',
      'product',
      'luxury',
      'gold',
      'splash',
      '香水',
      '产品',
      '金色',
      '特写',
    ],
    src: '/media/hero-perfume.mp4',
    poster: '/imgs/generated/hero-perfume.jpg',
    model: 'Hailuo 02',
    meta: '0:08 · 640×360',
  },
  {
    keywords: [
      'astronaut',
      'space',
      'stars',
      'galaxy',
      'cosmos',
      '宇航员',
      '太空',
      '星空',
      '宇宙',
    ],
    src: '/media/hero-astronaut.mp4',
    poster: '/imgs/generated/hero-astronaut.jpg',
    model: 'Wan 3.0',
    meta: '0:08 · 640×360',
  },
  {
    keywords: [
      'dragon',
      'fantasy',
      'fire',
      'magic',
      '龙',
      '奇幻',
      '魔法',
      '火焰',
    ],
    src: '/media/hero-dragon.mp4',
    poster: '/imgs/generated/hero-dragon.jpg',
    model: 'Seedance 1.0',
    meta: '0:08 · 640×360',
  },
  {
    keywords: [
      'dance',
      'dancer',
      'hip-hop',
      'street',
      'moves',
      '舞',
      '街舞',
      '舞者',
      '舞蹈',
    ],
    src: '/media/hero-dancer.mp4',
    poster: '/imgs/generated/hero-dancer.jpg',
    model: 'Runway Gen-4',
    meta: '0:08 · 640×360',
  },
  {
    keywords: [
      'city',
      'skyline',
      'timelapse',
      'night',
      'urban',
      'street',
      '城市',
      '夜景',
      '车流',
      '延时',
      '都市',
    ],
    src: '/media/hero-city.mp4',
    poster: '/imgs/generated/hero-city.jpg',
    model: 'Luma Ray 3',
    meta: '0:08 · 640×360',
  },
];

const IMAGE_ASSETS: GeneratorAsset[] = [
  {
    keywords: [
      'peacock',
      'feather',
      'bird',
      'iridescent',
      '孔雀',
      '开屏',
      '羽毛',
    ],
    src: '/imgs/generated/hero-peacock.jpg',
    model: 'Gemini 3 Pro Image',
  },
  {
    keywords: [
      'fashion',
      'outfit',
      'runway',
      'style',
      'dress',
      'model',
      '时尚',
      '时装',
      '穿搭',
      '模特',
      '连衣裙',
    ],
    src: '/imgs/generated/gal-fashion.jpg',
    model: 'Flux.2',
  },
  {
    keywords: ['samurai', 'warrior', 'katana', 'sword', '武士', '刀'],
    src: '/imgs/generated/gal-samurai.jpg',
    model: 'Ideogram 3',
  },
  {
    keywords: [
      'robot',
      'mecha',
      'android',
      'machine',
      '机器人',
      '机甲',
      '机械',
    ],
    src: '/imgs/generated/gal-robot.jpg',
    model: 'Seedream 4',
  },
  {
    keywords: [
      'forest',
      'nature',
      'mist',
      'trees',
      'woods',
      '森林',
      '自然',
      '雾',
    ],
    src: '/imgs/generated/gal-forest.jpg',
    model: 'Flux.2',
  },
  {
    keywords: [
      'boxing',
      'fight',
      'sport',
      'gym',
      'punch',
      '拳击',
      '格斗',
      '运动',
    ],
    src: '/imgs/generated/gal-boxing.jpg',
    model: 'Recraft V3',
  },
  {
    keywords: ['couple', 'love', 'wedding', 'romance', '情侣', '爱情', '婚礼'],
    src: '/imgs/generated/gal-couple.jpg',
    model: 'Gemini 3 Pro Image',
  },
  {
    keywords: ['dragon', 'fantasy', '龙', '奇幻'],
    src: '/imgs/generated/hero-dragon.jpg',
    model: 'Seedream 4',
  },
  {
    keywords: [
      'anime',
      'girl',
      'sunset',
      'rooftop',
      '动漫',
      '少女',
      '日落',
      '天台',
    ],
    src: '/imgs/generated/hero-anime.jpg',
    model: 'Flux.2',
  },
  {
    keywords: ['city', 'skyline', 'urban', 'night', '城市', '夜景', '都市'],
    src: '/imgs/generated/hero-city.jpg',
    model: 'Ideogram 3',
  },
];

const AUDIO_ASSETS: GeneratorAsset[] = [
  {
    keywords: [
      'cinematic',
      'epic',
      'trailer',
      'drone',
      'score',
      'orchestral',
      'atmosphere',
      '电影',
      '史诗',
      '预告',
      '氛围',
      '配乐',
      '大片',
    ],
    src: '/media/audio-cinematic.m4a',
    model: 'Suno V5',
    meta: '0:12',
  },
  {
    keywords: [
      'lofi',
      'chill',
      'study',
      'calm',
      'jazz',
      'relax',
      '轻音乐',
      '放松',
      '学习',
      '慢节奏',
    ],
    src: '/media/audio-lofi.m4a',
    model: 'Udio v2',
    meta: '0:12',
  },
  {
    keywords: [
      'upbeat',
      'pop',
      'energetic',
      'dance',
      'edm',
      'electro',
      'ad',
      'commercial',
      'ugc',
      '欢快',
      '节奏',
      '电子',
      '广告',
      '带感',
    ],
    src: '/media/audio-upbeat.m4a',
    model: 'Stable Audio 2',
    meta: '0:12',
  },
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
        {
          id: 'audio',
          label: m['lp.hero.tab_audio'](),
          placeholder: m['lp.hero.placeholder_audio'](),
          models: AUDIO_MODELS,
          qualities: AUDIO_QUALITIES,
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
      assets={{
        video: VIDEO_ASSETS,
        image: IMAGE_ASSETS,
        audio: AUDIO_ASSETS,
      }}
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
