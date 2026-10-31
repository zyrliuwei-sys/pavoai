# PavoAI Landing Design System — extracted from kenerateai.com (2026-10-31)

Shared contract for all landing builders. Exact values from `getComputedStyle()`
on the live site at 1440px. All components are pure (props in, zero i18n).

## Fonts

- Inter only (already global `--font-sans`). No serif.

## Section rhythm (top→bottom)

1. Hero — **night** (#05060a, grain) — nav, headline, tabs, prompt bar, gallery, marquee at bottom
2. What's new — **white**
3. Comparison — **white**
4. Gallery "Made on PavoAI" — **night**
5. Use cases — **night**
6. Tools grid — **gray #f3f4f6**
7. How it works — **white**
8. Stats band — **night** (border-y)
9. FAQ — **white**
10. Blog — **night**
11. Footer — **white**

## Colors

| Token               | Value                                          |
| ------------------- | ---------------------------------------------- |
| Night bg            | `#05060a`                                      |
| Night heading       | `#f4f6fb`                                      |
| Night body          | `rgba(255,255,255,0.7)`                        |
| Night muted         | `rgba(255,255,255,0.6)`                        |
| Night card          | `bg-white/[0.06]` + `ring-1 ring-white/[0.07]` |
| Night pill border   | `border-white/15`                              |
| Light bg            | `#ffffff`                                      |
| Gray band           | `#f3f4f6`                                      |
| Light heading       | `#09090b`                                      |
| Light body          | `#3f3f46`                                      |
| Light muted         | `#5f5f68`                                      |
| Light border        | `#e4e4e7` (zinc-200)                           |
| Accent              | `#3b82f6` (blue-500), hover `#2563eb`          |
| Accent link (light) | `#1d4ed8` (blue-700)                           |

## Type

- H1: `text-[clamp(3rem,1.2rem+6.6vw,8.5rem)] font-semibold leading-[0.92] tracking-[-0.05em]` (=114px @1440)
- H2: `text-[clamp(2rem,1.1rem+2.6vw,4.2rem)] font-semibold leading-none tracking-[-0.04em]` (=67px @1440)
- Section eyebrow: `text-[13px] text-zinc-500` (light) / `text-white/60` (night)
- Body: `text-base leading-relaxed`; small `text-[13px]`
- Nav link: `text-sm font-medium px-3.5` white/70 (over night)

## Layout

- Section padding: `py-20 sm:py-28 lg:py-32`
- Container: `mx-auto w-full max-w-[1240px] px-6 sm:px-8`
- Card radius: `rounded-[20px]`; pills `rounded-full`; prompt bar `rounded-[18px]`

## Buttons (pill)

- Nav CTA: `h-10 rounded-full bg-[#3b82f6] px-4 text-[13.5px] font-semibold text-white hover:bg-[#2563eb]`
- Hero CTA: `h-12 rounded-full bg-[#3b82f6] px-6 text-[15px] font-semibold text-white hover:bg-[#2563eb]`
- Ghost/outline (night): `rounded-full ring-1 ring-white/15 text-white/85 hover:bg-white/[0.06]`

## Animations (already in globals.css — use the classes)

- `.sv-night` `.sv-grain` — dark section + noise overlay (needs `relative overflow-hidden` or `relative isolate`)
- `.sv-enter` — fade-up; set `style={{'--i': n}}` for stagger
- `.sv-hover-lift` `.sv-press` — card hover lift / press scale
- `.sv-marquee` (overflow-hidden wrapper) + `.sv-marquee-track` (list duplicated ×2, `--sv-marquee-gap`)
- `.sv-live` — pulsing green dot
- `.sv-fade-mask-x` — edge fade for marquees

## Rules

- Pure components under `src/components/landing/`: ALL content via props, no `m[]` imports, no `envConfigs`.
- `cn` from `@/lib/utils`; UI primitives from `@/components/ui/*`; icons from `lucide-react`.
- Internal navigation links are passed in as props (`href` strings) — components never hardcode routes.
- Responsive: works at 1440 / 768 / 390. Grids collapse `sm:grid-cols-2 lg:grid-cols-4` etc.
- Verify `npx tsc --noEmit` passes before finishing.
