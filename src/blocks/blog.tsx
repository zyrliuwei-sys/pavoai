import { tDynamic } from '@/core/i18n/dynamic';
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
        image: `/imgs/generated/blog-${['models', 'prompt', 'ugc'][i - 1]}.jpg`,
        href: `/blog/${FEATURED_SLUGS[i - 1]}`,
      }))}
      readLabel={m['lp.blog.read']()}
    />
  );
}
