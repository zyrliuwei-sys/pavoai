# B2 — LandingHero — `src/components/landing/hero.tsx`

The night hero (bg #05060a + .sv-grain + relative isolate overflow-hidden, min-h-svh, pt for fixed nav).
Center column max-w-[1040px], center aligned, px-6, pt-28 lg:pt-36.

1. **Eyebrow pill**: `inline-flex h-8 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 text-[12.5px] font-medium text-white/85 backdrop-blur-md` + `<span class="sv-live">` dot + text "PavoAI — AI video studio".
2. **H1** (mt-6): design-system clamp, white, center. Words appear staggered (map words with `.sv-enter` + `--i`). Content: "Make stunning videos with AI." Render as plain words; support an `emphasized` list of words rendered `italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-300` (subtle peacock accent on "videos").
3. **Sub** (mt-6): `max-w-[640px] text-[15px] sm:text-base leading-relaxed text-white/70`, center.
4. **Tabs** (mt-8): container `inline-flex rounded-full bg-white/[0.06] ring-1 ring-white/10 p-1 gap-1`; pill `h-9 px-4 rounded-full text-sm font-medium text-white/70`; active: `bg-white text-zinc-950` (or bg-[#3b82f6] text-white). Click switches `placeholder` of the prompt input. Default active = first tab.
5. **Prompt bar** (mt-4): `flex items-center w-full max-w-[640px] rounded-[18px] bg-white/[0.07] ring-1 ring-white/10 pl-4 pr-1.5 py-1.5 h-[60px]`; input transparent `text-[17px] text-white placeholder:text-white/40 flex-1`; right CTA `h-12 rounded-full bg-[#3b82f6] px-6 text-[15px] font-semibold text-white hover:bg-[#2563eb]` (sv-press).
6. **Trust line** (mt-4): `text-[12.5px] text-white/60` — "25 free credits · No card required · Commercial use · No watermark" (array joined by ·).
7. **Gallery grid** (mt-12 lg:mt-16): grid `grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4`; tiles: `relative aspect-video overflow-hidden rounded-[14px] ring-1 ring-white/[0.07] sv-hover-lift`; `<img class="h-full w-full object-cover">`; tiles with `kind==='video'` get a centered play chip `rounded-full bg-black/50 backdrop-blur px-2.5 py-1 text-[11px] text-white flex items-center gap-1` with Play icon + "0:08"-style label prop. `.sv-enter` stagger.
8. **Model marquee** (bottom of hero, mt-14, pb-10): row: `<p class="text-[12.5px] font-medium text-white/60">` + title "Every top model, one login" (may be two lines: "Every top model," / "one login"); then `.sv-marquee .sv-fade-mask-x` wrapper, `.sv-marquee-track` with models duplicated ×2; each item `flex items-center gap-2 text-sm font-medium text-white/70` with a `Sparkles` lucide icon (size 14, text-blue-400). Pause button: `ml-4 text-[11px] text-white/50 hover:text-white` Pause/Resume toggling `animation-play-state` via state.

Props:

```ts
interface HeroTab {
  id: string;
  label: string;
  placeholder: string;
}
interface HeroTile {
  src: string;
  alt: string;
  kind?: 'video';
  duration?: string;
}
interface HeroProps {
  eyebrow: string;
  words: { text: string; emphasized?: boolean }[]; // H1 split into words
  subtitle: string;
  tabs: HeroTab[];
  ctaLabel: string;
  trust: string[]; // joined with ·
  tiles: HeroTile[];
  marquee: { title: string; models: string[]; pauseLabel: string };
}
```

CTA is a form-submit lookalike `<button type="button">` (no navigation needed — decorative); onSubmit noop.

## Screenshot: `docs/design-references/kengage-part0.jpeg`
