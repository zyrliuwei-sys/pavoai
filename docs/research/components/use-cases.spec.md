# B6 — LandingUseCases — `src/components/landing/use-cases.tsx`

Night section, generous padding (py-20 sm:py-28 lg:py-32). id="use-cases".
Header: eyebrow `text-[13px] text-white/60` ("Use cases") + H2 white "Make any video you can imagine" (words may be staggered .sv-enter) + sub `mt-4 max-w-[560px] text-[15px] text-white/70`.

Grid (mt-12): `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`. 8 cards, each an `<a>`:
`group relative block aspect-[3/4] overflow-hidden rounded-[20px] ring-1 ring-white/[0.07] bg-[#0b0d13] sv-hover-lift sv-press`.

- background `<img class="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-100">`
- top-left icon chip: `m-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 backdrop-blur text-white` (lucide icon from prop)
- bottom overlay `absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 pt-16`:
  - title `text-[15px] font-semibold text-white`
  - description `mt-1 text-[13px] leading-relaxed text-white/65` (2-line clamp)
  - "Try it" link row `mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-blue-400` + ArrowRight (translate-x on group-hover)
    `.sv-enter` stagger with `--i` = index.

Props:

```ts
interface UseCase {
  title: string;
  description: string;
  image: string;
  icon: LucideIcon;
}
interface UseCasesProps {
  label: string;
  title: string;
  subtitle: string;
  cases: UseCase[];
  ctaLabel: string;
}
```

(whole card href comes from a single `href` prop on the section — all cards link there; or per-card `href?`.)

## Screenshot: `kengage-part2.jpeg` (top half)
