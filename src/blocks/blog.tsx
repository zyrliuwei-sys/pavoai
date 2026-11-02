import { tDynamic } from '@/core/i18n/dynamic';
import { landingVideos } from '@/config/landing-media';
import { m } from '@/paraglide/messages.js';
import { LandingBlog } from '@/components/landing/blog';

/**
 * Blog — three featured cards on night. Cards deep-link to the local MDX
 * posts in `src/content/posts/` (keep in sync with BLOG_POST_SLUGS).
 */
const FEATURED_SLUGS = [
  'veo-3-1-vs-kling-3-0',
  'how-to-write-cinematic-video-prompts',
  'ugc-ads-with-ai-prompts',
] as const;

const FEATURED_VIDEOS = [
  landingVideos['user-supercar'],
  landingVideos['sunset-couple'],
  landingVideos.creator,
];

export function Blog() {
  return (
    <LandingBlog
      label={m['lp.blog.label']()}
      title={m['lp.blog.title']()}
      link={{ label: m['lp.blog.link'](), href: '/blog' }}
      posts={[1, 2, 3].map((i) => ({
        title: tDynamic(`lp.blog.p${i}t`),
        excerpt: tDynamic(`lp.blog.p${i}x`),
        category: tDynamic(`lp.blog.p${i}c`),
        date: tDynamic(`lp.blog.p${i}d`),
        video: FEATURED_VIDEOS[i - 1],
        href: `/blog/${FEATURED_SLUGS[i - 1]}`,
      }))}
      readLabel={m['lp.blog.read']()}
      playLabel={m['lp.hero.play']()}
      pauseLabel={m['lp.hero.pause']()}
    />
  );
}
