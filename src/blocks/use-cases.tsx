import {
  Clapperboard,
  Megaphone,
  Music,
  Package,
  Palette,
  Rocket,
  Smartphone,
  UserRound,
} from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import { LandingUseCases } from '@/components/landing/use-cases';

const CASES = [
  { icon: Clapperboard, slug: 'uc-shortfilm', i: 1 },
  { icon: Package, slug: 'uc-product', i: 2 },
  { icon: Megaphone, slug: 'uc-ugc', i: 3 },
  { icon: Music, slug: 'uc-musicvideo', i: 4 },
  { icon: Palette, slug: 'uc-anime', i: 5 },
  { icon: Smartphone, slug: 'uc-social', i: 6 },
  { icon: UserRound, slug: 'uc-avatar', i: 7 },
  { icon: Rocket, slug: 'uc-trailer', i: 8 },
] as const;

/**
 * Use cases — eight image cards linking into the studio.
 */
export function UseCases() {
  return (
    <LandingUseCases
      label={m['lp.uc.label']()}
      title={m['lp.uc.title']()}
      subtitle={m['lp.uc.sub']()}
      cases={CASES.map(({ icon, slug, i }) => ({
        title: tDynamic(`lp.uc.c${i}`),
        description: tDynamic(`lp.uc.c${i}d`),
        image: `/imgs/generated/${slug}.jpg`,
        icon,
      }))}
      ctaLabel={m['lp.uc.cta']()}
      href="/sign-up"
    />
  );
}
