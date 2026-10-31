# B4 — LandingComparison — `src/components/landing/comparison.tsx`

White section. Header centered: eyebrow ("The math" style, text-[13px] text-zinc-500) + H2 "Stop paying for fifteen AI apps" + sub `mt-4 max-w-[560px] mx-auto text-[15px] text-zinc-500 leading-relaxed`.

Two panels grid (mt-12): `grid lg:grid-cols-2 gap-4 lg:gap-6 items-stretch`.

**Left (old way)**: `rounded-[24px] border border-zinc-200 bg-zinc-50 p-6 sm:p-8`:

- heading `text-[13px] font-semibold uppercase tracking-wider text-zinc-500` "The old way" + title `mt-2 text-xl font-semibold text-zinc-950` "15 apps, 15 logins, 15 bills" + note `mt-1 text-[13px] text-zinc-500`.
- grid `mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2`: item chips `rounded-xl border border-zinc-200 bg-white px-3 py-2.5` with name `text-[13px] font-medium text-zinc-900 truncate` + category `text-[11px] text-zinc-400`.

**Right (highlighted)**: `relative rounded-[24px] bg-[#05060a] p-6 sm:p-8 overflow-hidden` + subtle blue glow `bg-[radial-gradient(60%_50%_at_50%_0%,rgba(59,130,246,0.25),transparent)]`:

- heading `text-[13px] font-semibold uppercase tracking-wider text-blue-400` + title `mt-2 text-xl font-semibold text-white` "1 app, 1 login, 1 balance" + note text-white/60 text-[13px].
- pills grid `mt-6 flex flex-wrap gap-2`: `rounded-full bg-white/[0.08] ring-1 ring-white/10 px-3.5 py-1.5 text-[13px] font-medium text-white/85` (8 capability pills).
- price row `mt-6 text-sm text-white/70`: "From $15 one-time" bold white part.
- CTAs (mt-6 flex gap-3): primary `h-11 rounded-full bg-[#3b82f6] px-5 text-sm font-semibold text-white hover:bg-[#2563eb] sv-press` + secondary `h-11 rounded-full ring-1 ring-white/20 px-5 text-sm font-semibold text-white/85 hover:bg-white/[0.06]`.

Props:

```ts
interface CompareItem {
  name: string;
  category: string;
}
interface ComparisonProps {
  label: string;
  title: string;
  subtitle: string;
  oldWay: {
    kicker: string;
    heading: string;
    note: string;
    items: CompareItem[];
  };
  newWay: {
    kicker: string;
    heading: string;
    note: string;
    features: string[];
    pricePrefix: string;
    price: string;
    cta: { label; href };
    secondary: { label; href };
  };
}
```

## Screenshot: `kengage-part1.jpeg` (middle)
