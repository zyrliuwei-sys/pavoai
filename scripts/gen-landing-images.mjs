// Batch-generate PavoAI landing imagery via the generate-image skill script
// (Pollinations.ai, free). Writes a manifest JSON next to the images.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GEN = `${ROOT}.claude/skills/generate-image/main.mjs`;
const OUT = `${ROOT}public/imgs/generated`;
mkdirSync(OUT, { recursive: true });

const S =
  'cinematic lighting, film still, high detail, vivid color, no text, no watermark, no captions';

const JOBS = [
  // hero gallery tiles (16:9)
  {
    slug: 'hero-peacock',
    w: 640,
    h: 360,
    p: `a majestic peacock fanning iridescent teal and gold feathers, dramatic rim light on black background, ${S}`,
  },
  {
    slug: 'hero-neon-car',
    w: 640,
    h: 360,
    p: `neon sports car drifting through rainy tokyo street at night, motion blur, pink and cyan reflections, ${S}`,
  },
  {
    slug: 'hero-anime',
    w: 640,
    h: 360,
    p: `anime style girl standing on rooftop at golden sunset, wind in hair, city below, makoto shinkai style, ${S}`,
  },
  {
    slug: 'hero-perfume',
    w: 640,
    h: 360,
    p: `luxury perfume bottle with golden liquid splash frozen mid air, macro product shot, black background, ${S}`,
  },
  {
    slug: 'hero-astronaut',
    w: 640,
    h: 360,
    p: `astronaut dancing on mars red dust, earth visible in sky, cinematic wide shot, ${S}`,
  },
  {
    slug: 'hero-dragon',
    w: 640,
    h: 360,
    p: `mythical ice dragon soaring over snowy mountain peaks at dawn, epic fantasy, ${S}`,
  },
  {
    slug: 'hero-dancer',
    w: 640,
    h: 360,
    p: `street dancer frozen mid air in neon graffiti alley at night, purple lighting, ${S}`,
  },
  {
    slug: 'hero-city',
    w: 640,
    h: 360,
    p: `hyperlapse city skyline at blue hour with car light trails, futuristic, ${S}`,
  },
  // use case cards (3:4 portrait)
  {
    slug: 'uc-shortfilm',
    w: 768,
    h: 1024,
    p: `moody film noir detective scene, venetian blind shadows, smoke, 35mm, ${S}`,
  },
  {
    slug: 'uc-product',
    w: 768,
    h: 1024,
    p: `sneaker product ad shot, dynamic studio lighting, floating with dramatic shadow, teal background, ${S}`,
  },
  {
    slug: 'uc-ugc',
    w: 768,
    h: 1024,
    p: `young creator holding smartphone talking to camera, cozy bedroom warm light, authentic selfie style, ${S}`,
  },
  {
    slug: 'uc-musicvideo',
    w: 768,
    h: 1024,
    p: `singer silhouette against massive glowing LED wall, concert haze, magenta and blue, ${S}`,
  },
  {
    slug: 'uc-anime',
    w: 768,
    h: 1024,
    p: `anime action scene, sword fighter with speed lines, dramatic sky, cel shaded, ${S}`,
  },
  {
    slug: 'uc-social',
    w: 768,
    h: 1024,
    p: `vertical food video shot, gourmet burger with melting cheese closeup, vibrant, ${S}`,
  },
  {
    slug: 'uc-avatar',
    w: 768,
    h: 1024,
    p: `friendly digital human avatar talking, studio portrait, soft gradient background, ${S}`,
  },
  {
    slug: 'uc-trailer',
    w: 768,
    h: 1024,
    p: `epic movie trailer still, giant wave crashing over lighthouse, storm, dramatic scale, ${S}`,
  },
  // gallery masonry
  {
    slug: 'gal-couple',
    w: 800,
    h: 1000,
    p: `cinematic couple kiss on rooftop at dusk, city bokeh, warm tones, ${S}`,
  },
  {
    slug: 'gal-samurai',
    w: 800,
    h: 1000,
    p: `lone samurai walking through misty bamboo forest, cinematic fog, ${S}`,
  },
  {
    slug: 'gal-boxing',
    w: 800,
    h: 1000,
    p: `boxing match moment, sweat flying, single spotlight, dark arena, ${S}`,
  },
  {
    slug: 'gal-fashion',
    w: 800,
    h: 1000,
    p: `high fashion editorial, model in avant garde dress, bold orange studio background, ${S}`,
  },
  {
    slug: 'gal-forest',
    w: 800,
    h: 1000,
    p: `bioluminescent fantasy forest at night, glowing blue plants, fireflies, ${S}`,
  },
  {
    slug: 'gal-robot',
    w: 800,
    h: 1000,
    p: `cute round robot barista making coffee in cozy cafe, pixar style, ${S}`,
  },
  // blog covers (16:9)
  {
    slug: 'blog-models',
    w: 1280,
    h: 720,
    p: `two film clapperboards facing off on dark stage, spotlights, comparison concept, ${S}`,
  },
  {
    slug: 'blog-prompt',
    w: 1280,
    h: 720,
    p: `glowing holographic text editing interface floating in dark studio, blue light, abstract, ${S}`,
  },
  {
    slug: 'blog-ugc',
    w: 1280,
    h: 720,
    p: `smartphone on tripod filming a product unboxing scene, ring light, creator desk, ${S}`,
  },
];

const manifest = {};
const existing = new Set(readdirSync(OUT));
for (const job of JOBS) {
  const already = [...existing].find(
    (f) => f.startsWith(job.slug + '-') && f.endsWith('.png')
  );
  if (already) {
    manifest[job.slug] = `/imgs/generated/${already}`;
    continue;
  }
  try {
    const args = JSON.stringify({
      prompt: job.p,
      width: job.w,
      height: job.h,
      slug: job.slug,
    });
    const out = execFileSync('node', [GEN], {
      input: args,
      encoding: 'utf8',
      timeout: 120000,
    });
    const parsed = JSON.parse(out.trim().split('\n').pop());
    if (parsed.url) {
      manifest[job.slug] = parsed.url;
      console.log('ok', job.slug, '->', parsed.url);
    } else {
      manifest[job.slug] = null;
      console.log('fail', job.slug, out.trim().slice(0, 120));
    }
  } catch (e) {
    manifest[job.slug] = null;
    console.log('error', job.slug, String(e.message).slice(0, 120));
  }
}
writeFileSync(
  `${ROOT}docs/research/image-manifest.json`,
  JSON.stringify(manifest, null, 2)
);
console.log(
  'DONE',
  Object.values(manifest).filter(Boolean).length + '/' + JOBS.length
);
