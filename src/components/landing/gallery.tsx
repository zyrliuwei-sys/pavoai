import { Play } from 'lucide-react';

import { RevealSection } from '@/components/landing/reveal';

export interface GalleryItem {
  src: string;
  alt: string;
  caption?: string;
  model?: string;
  aspect?: string;
  kind?: 'video';
  duration?: string;
}

export interface LandingGalleryProps {
  label: string;
  title: string;
  subtitle: string;
  items: GalleryItem[];
  cta: { label: string; href: string };
}

/** Intrinsic size matching the card aspect ratio, for CLS-free rendering. */
function intrinsicSize(aspect?: string): { width: number; height: number } {
  const [w, h] = (aspect ?? '4/5').split('/').map(Number);
  const width = 800;
  return { width, height: Math.round((width * (h || 5)) / (w || 4)) };
}

export function LandingGallery({
  label,
  title,
  subtitle,
  items,
  cta,
}: LandingGalleryProps) {
  return (
    <RevealSection
      id="gallery"
      className="sv-day sv-grain relative overflow-hidden py-20 sm:py-28 lg:py-32"
    >
      <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-8">
        <p className="text-[13px] text-zinc-500">{label}</p>
        <h2 className="sv-display mt-3 text-[clamp(2rem,1.1rem+2.6vw,4.2rem)] leading-none">
          {title}
        </h2>
        <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-zinc-600">
          {subtitle}
        </p>

        <div className="sv-rv sv-rv-cards sv-rv-zoom mt-12 columns-2 gap-4 lg:columns-3 [&>*]:mb-4">
          {items.map((item, i) => {
            const size = intrinsicSize(item.aspect);
            return (
              <figure
                key={`${item.src}-${i}`}
                className="sv-hover-lift group relative mb-4 break-inside-avoid overflow-hidden rounded-[16px] bg-zinc-100 ring-1 ring-zinc-950/[0.08]"
                style={{ aspectRatio: item.aspect ?? '4/5' }}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  width={size.width}
                  height={size.height}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                {item.kind === 'video' && (
                  <span className="sv-meta absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur">
                    <Play size={10} />
                    {item.duration}
                  </span>
                )}
                {(item.caption || item.model) && (
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                    {item.caption && (
                      <figcaption className="text-[13px] font-medium text-white">
                        {item.caption}
                      </figcaption>
                    )}
                    {item.model && (
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-white/80 backdrop-blur">
                        {item.model}
                      </span>
                    )}
                  </div>
                )}
              </figure>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <a
            href={cta.href}
            className="sv-press inline-flex h-11 items-center rounded-full bg-white px-6 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-950/15 transition hover:bg-zinc-50"
          >
            {cta.label}
          </a>
        </div>
      </div>
    </RevealSection>
  );
}
