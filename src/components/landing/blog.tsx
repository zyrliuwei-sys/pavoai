import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { RevealSection } from '@/components/landing/reveal';
import {
  VideoPreview,
  type PreviewVideo,
} from '@/components/landing/video-preview';

export interface BlogCardItem {
  title: string;
  excerpt: string;
  category: string;
  date: string;
  video: PreviewVideo;
  href: string;
}

export interface LandingBlogProps {
  label: string;
  title: string;
  link?: { label: string; href: string };
  posts: BlogCardItem[];
  readLabel: string;
  playLabel: string;
  pauseLabel: string;
}

export function LandingBlog({
  label,
  title,
  link,
  posts,
  readLabel,
  playLabel,
  pauseLabel,
}: LandingBlogProps) {
  return (
    <RevealSection className="sv-night relative py-20 sm:py-28 lg:py-32">
      <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[13px] text-white/60">{label}</p>
            <h2 className="sv-display mt-3 text-[clamp(2rem,1.1rem+2.6vw,4.2rem)] leading-none">
              {title}
            </h2>
          </div>
          {link && (
            <Link
              href={link.href}
              className="text-sm font-medium text-[var(--sv-iris-bright)] transition hover:underline"
            >
              {link.label}
            </Link>
          )}
        </div>

        <div className="sv-rv sv-rv-cards sv-rv-zoom mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <article
              key={post.title}
              className="sv-enter sv-hover-lift group relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-[16px] ring-1 ring-white/[0.07]"
              style={{ '--i': i } as CSSProperties}
            >
              <VideoPreview
                video={post.video}
                alt={post.title}
                playLabel={playLabel}
                pauseLabel={pauseLabel}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
              <Link
                href={post.href}
                className="relative p-5 focus-visible:outline-2 focus-visible:outline-white"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80 backdrop-blur">
                    {post.category}
                  </span>
                  <span className="text-[11px] text-white/60">{post.date}</span>
                </div>
                <h3 className="mt-3 line-clamp-2 text-[17px] leading-snug font-semibold text-white">
                  {post.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-white/60">
                  {post.excerpt}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--sv-iris-bright)]">
                  {readLabel}
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
