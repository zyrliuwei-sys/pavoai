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
import { landingVideos } from '@/config/landing-media';
import { m } from '@/paraglide/messages.js';
import { LandingUseCases } from '@/components/landing/use-cases';

const CASES = [
  { icon: Clapperboard, slug: 'user-crowd-portrait', i: 1 },
  { icon: Package, slug: 'product', i: 2 },
  { icon: Megaphone, slug: 'user-pendant-hook', i: 3 },
  { icon: Music, slug: 'user-pet-dance', i: 4 },
  { icon: Palette, slug: 'user-animated-pets', i: 5 },
  { icon: Smartphone, slug: 'social', i: 6 },
  { icon: UserRound, slug: 'avatar', i: 7 },
  { icon: Rocket, slug: 'user-story-transformation', i: 8 },
] as const;

/**
 * Use cases — eight video cards linking into the studio.
 */
export function UseCases() {
  return (
    <LandingUseCases
      label={m['lp.uc.label']()}
      title={m['lp.uc.title']()}
      subtitle={m['lp.uc.sub']()}
      playLabel={m['lp.hero.play']()}
      pauseLabel={m['lp.hero.pause']()}
      cases={CASES.map(({ icon, slug, i }) => ({
        title: tDynamic(`lp.uc.c${i}`),
        description: tDynamic(`lp.uc.c${i}d`),
        // Long-form visible caption (P1-4): model + flow + typical time.
        detail: tDynamic(`lp.uc.c${i}x`),
        video: landingVideos[slug],
        icon,
      }))}
      // P0-2 interim: try it in the on-page generator instead of a sign-up wall.
      href="/#generator"
    />
  );
}
