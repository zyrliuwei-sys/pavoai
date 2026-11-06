import { Clapperboard, Image as ImageIcon } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import { LandingTools } from '@/components/landing/tools';

/** [toolIndex, icon, categoryKey] — categories come from the tab label. */
const GENERATE = [
  [1, Clapperboard],
  [2, ImageIcon],
] as const;

function tool(
  [i, icon]: readonly [number, typeof Clapperboard],
  category: string
) {
  return {
    icon,
    category,
    title: tDynamic(`lp.tools.t${i}`),
    description: tDynamic(`lp.tools.t${i}d`),
    features: [1, 2, 3].map((f) => tDynamic(`lp.tools.t${i}f${f}`)),
    openLabel: m['lp.tools.open'](),
    guideLabel: m['lp.tools.guide'](),
    href: `/?mode=${i === 2 ? 'image' : 'video'}#generator`,
    guideHref: '/blog/how-to-write-cinematic-video-prompts',
    available: i <= 2,
  };
}

/**
 * The two connected generation modes.
 */
export function Tools() {
  return (
    <LandingTools
      label={m['lp.tools.label']()}
      title={m['lp.tools.title']()}
      subtitle={m['lp.tools.sub']()}
      tabs={[
        {
          id: 'generate',
          label: m['lp.tools.tab_generate'](),
          tools: GENERATE.map((t) => tool(t, m['lp.tools.tab_generate']())),
        },
      ]}
    />
  );
}
