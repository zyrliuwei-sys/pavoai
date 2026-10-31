import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { RevealSection } from '@/components/landing/reveal';

export interface WhatsNewCard {
  badge: string;
  tone: 'live' | 'new' | 'studio';
  title: string;
  description: string;
  image?: string;
}

export interface LandingWhatsNewProps {
  label: string;
  title: string;
  link?: { label: string; href: string };
  cards: WhatsNewCard[];
}

const badgeTones: Record<WhatsNewCard['tone'], string> = {
  live: 'bg-[#f7efe0] text-[#8a6a24]',
  new: 'bg-[#e9f4f2] text-[var(--sv-iris-strong)]',
  studio: 'bg-zinc-100 text-zinc-600',
};

export function LandingWhatsNew({
  label,
  title,
  link,
  cards,
}: LandingWhatsNewProps) {
  return (
    <RevealSection id="whats-new" className="bg-white py-20 sm:py-28 lg:py-32">
      <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-8">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[13px] text-zinc-500">{label}</p>
            <h2 className="mt-2 text-[clamp(2rem,1.1rem+2.6vw,4.2rem)] leading-none font-semibold tracking-[-0.04em] text-zinc-950">
              {title}
            </h2>
          </div>
          {link ? (
            <Link
              href={link.href}
              className="text-sm font-medium text-[var(--sv-iris-strong)] hover:underline"
            >
              {link.label}
            </Link>
          ) : null}
        </header>

        <div className="sv-rv sv-rv-cards mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, index) => (
            <article
              key={`${card.title}-${index}`}
              className="sv-enter sv-hover-lift group flex flex-col gap-3 rounded-[16px] border border-zinc-200 bg-white p-5"
              style={{ ['--i' as any]: index }}
            >
              <span
                className={cn(
                  'w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase',
                  badgeTones[card.tone]
                )}
              >
                {card.badge}
              </span>
              <h3 className="text-[15px] font-semibold text-zinc-950">
                {card.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-zinc-500">
                {card.description}
              </p>
              {card.image ? (
                <div className="mt-auto aspect-[16/10] w-full overflow-hidden rounded-xl">
                  <img
                    src={card.image}
                    alt={card.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
