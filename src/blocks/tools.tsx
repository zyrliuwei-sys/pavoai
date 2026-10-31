import {
  AudioWaveform,
  Captions,
  Clapperboard,
  Film,
  Flame,
  Image as ImageIcon,
  Languages,
  Maximize2,
  Megaphone,
  Mic,
  Music,
  Scissors,
  Shirt,
  UserRound,
  Video,
  Wand2,
} from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import { LandingTools } from '@/components/landing/tools';

/** [toolIndex, icon, categoryKey] — categories come from the tab label. */
const GENERATE = [
  [1, Clapperboard],
  [2, ImageIcon],
  [3, UserRound],
  [4, Wand2],
] as const;

const EDIT = [
  [5, Scissors],
  [6, Captions],
  [7, Maximize2],
  [8, Video],
] as const;

const STUDIOS = [
  [9, Megaphone],
  [10, Shirt],
  [11, Flame],
  [12, Film],
] as const;

const AUDIO = [
  [13, Music],
  [14, Mic],
  [15, Languages],
  [16, AudioWaveform],
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
    // P0-2 interim: try the generator on this page; once each studio gets
    // its own route (P1-5), point these at the real feature pages.
    href: '/#generator',
  };
}

/**
 * Tools — the 16-studio directory with four tabs.
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
        {
          id: 'edit',
          label: m['lp.tools.tab_edit'](),
          tools: EDIT.map((t) => tool(t, m['lp.tools.tab_edit']())),
        },
        {
          id: 'studios',
          label: m['lp.tools.tab_studios'](),
          tools: STUDIOS.map((t) => tool(t, m['lp.tools.tab_studios']())),
        },
        {
          id: 'audio',
          label: m['lp.tools.tab_audio'](),
          tools: AUDIO.map((t) => tool(t, m['lp.tools.tab_audio']())),
        },
      ]}
    />
  );
}
