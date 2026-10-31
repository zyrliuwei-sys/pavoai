import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import { LandingBlog } from '@/components/landing/blog';

/**
 * Blog — three featured cards on night. v1 uses curated i18n posts;
 * swap in loader posts from `getBlogPostsFn` when the blog has content.
 */
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
        href: '/blog',
      }))}
      readLabel={m['lp.blog.read']()}
    />
  );
}
