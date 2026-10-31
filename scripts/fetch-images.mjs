// Persistent retry loop for PavoAI landing imagery (Pollinations turbo, free tier).
// Re-runs until every image exists or MAX_MINUTES elapses. 20s between attempts.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = `${ROOT}public/imgs/generated`;
mkdirSync(OUT, { recursive: true });

const S =
  'cinematic lighting, film still, high detail, vivid color, no text, no watermark';
const JOBS = [
  [
    'hero-peacock',
    640,
    360,
    'a majestic peacock fanning iridescent teal and gold feathers, dramatic rim light on black background',
  ],
  [
    'hero-neon-car',
    640,
    360,
    'neon sports car drifting through rainy tokyo street at night, motion blur, pink and cyan reflections',
  ],
  [
    'hero-anime',
    640,
    360,
    'anime style girl standing on rooftop at golden sunset, wind in hair, city below, makoto shinkai style',
  ],
  [
    'hero-perfume',
    640,
    360,
    'luxury perfume bottle with golden liquid splash frozen mid air, macro product shot, black background',
  ],
  [
    'hero-astronaut',
    640,
    360,
    'astronaut dancing on mars red dust, earth visible in sky, cinematic wide shot',
  ],
  [
    'hero-dragon',
    640,
    360,
    'mythical ice dragon soaring over snowy mountain peaks at dawn, epic fantasy',
  ],
  [
    'hero-dancer',
    640,
    360,
    'street dancer frozen mid air in neon graffiti alley at night, purple lighting',
  ],
  [
    'hero-city',
    640,
    360,
    'hyperlapse city skyline at blue hour with car light trails, futuristic',
  ],
  [
    'uc-shortfilm',
    768,
    1024,
    'moody film noir detective scene, venetian blind shadows, smoke, 35mm',
  ],
  [
    'uc-product',
    768,
    1024,
    'sneaker product ad shot, dynamic studio lighting, floating with dramatic shadow, teal background',
  ],
  [
    'uc-ugc',
    768,
    1024,
    'young creator holding smartphone talking to camera, cozy bedroom warm light, authentic selfie style',
  ],
  [
    'uc-musicvideo',
    768,
    1024,
    'singer silhouette against massive glowing LED wall, concert haze, magenta and blue',
  ],
  [
    'uc-anime',
    768,
    1024,
    'anime action scene, sword fighter with speed lines, dramatic sky, cel shaded',
  ],
  [
    'uc-social',
    768,
    1024,
    'vertical food video shot, gourmet burger with melting cheese closeup, vibrant',
  ],
  [
    'uc-avatar',
    768,
    1024,
    'friendly digital human avatar talking, studio portrait, soft gradient background',
  ],
  [
    'uc-trailer',
    768,
    1024,
    'epic movie trailer still, giant wave crashing over lighthouse, storm, dramatic scale',
  ],
  [
    'gal-couple',
    800,
    1000,
    'cinematic couple kiss on rooftop at dusk, city bokeh, warm tones',
  ],
  [
    'gal-samurai',
    800,
    1000,
    'lone samurai walking through misty bamboo forest, cinematic fog',
  ],
  [
    'gal-boxing',
    800,
    1000,
    'boxing match moment, sweat flying, single spotlight, dark arena',
  ],
  [
    'gal-fashion',
    800,
    1000,
    'high fashion editorial, model in avant garde dress, bold orange studio background',
  ],
  [
    'gal-forest',
    800,
    1000,
    'bioluminescent fantasy forest at night, glowing blue plants, fireflies',
  ],
  [
    'gal-robot',
    800,
    1000,
    'cute round robot barista making coffee in cozy cafe, pixar style',
  ],
  [
    'blog-models',
    1280,
    720,
    'two film clapperboards facing off on dark stage, spotlights, comparison concept',
  ],
  [
    'blog-prompt',
    1280,
    720,
    'glowing holographic editing interface floating in dark studio, blue light, abstract',
  ],
  [
    'blog-ugc',
    1280,
    720,
    'smartphone on tripod filming a product unboxing scene, ring light, creator desk',
  ],
  [
    'how-mode',
    800,
    450,
    'professional film set with cinema camera and glowing monitors, dark studio, teal accent light',
  ],
  [
    'how-prompt',
    800,
    450,
    'single film slate with chalk writing under dramatic spotlight on black background',
  ],
  [
    'how-compare',
    800,
    450,
    'dark editing suite with multiple monitors showing different video takes, ambient glow',
  ],
  [
    'how-export',
    800,
    450,
    'cinema projector light beam cutting through dark room, dust particles, warm glow',
  ],
].map(([slug, w, h, p]) => ({ slug, w, h, p }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const have = (slug) => {
  const f = `${OUT}/${slug}.jpg`;
  return existsSync(f) && statSync(f).size > 20000;
};

const deadline = Date.now() + 40 * 60 * 1000;
let round = 0;
while (Date.now() < deadline) {
  const missing = JOBS.filter((j) => !have(j.slug));
  if (missing.length === 0) break;
  round++;
  for (const job of missing) {
    if (have(job.slug)) continue;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(job.p + ', ' + S)}?width=${job.w}&height=${job.h}&model=turbo&nologo=true&seed=${(round * 31 + job.slug.length * 7) % 99991}`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        signal: AbortSignal.timeout(150000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 20000) throw new Error(`small ${buf.length}`);
      writeFileSync(`${OUT}/${job.slug}.jpg`, buf);
      console.log(`ok ${job.slug} (${buf.length}B, round ${round})`);
    } catch (e) {
      console.log(
        `miss ${job.slug}: ${String(e.message).slice(0, 60)} (round ${round})`
      );
    }
    await sleep(20000);
  }
}

const manifest = {};
for (const j of JOBS)
  manifest[j.slug] = have(j.slug) ? `/imgs/generated/${j.slug}.jpg` : null;
writeFileSync(
  `${ROOT}docs/research/image-manifest.json`,
  JSON.stringify(manifest, null, 2)
);
const got = Object.values(manifest).filter(Boolean).length;
console.log(`FINAL ${got}/${JOBS.length}`);
if (got < JOBS.length) process.exitCode = 2;
