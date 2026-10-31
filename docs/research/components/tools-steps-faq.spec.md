# B7 — LandingTools + LandingHowItWorks + LandingFaq

## LandingTools — `src/components/landing/tools.tsx`

Section bg `#f3f4f6` (bg-zinc-100), id="tools". Header centered: eyebrow ("The studio") + H2 "Generate. Edit. Finish." + sub.
Tabs (mt-8, centered): `inline-flex rounded-full border border-zinc-200 bg-white p-1 gap-1`; pill `h-9 px-4 rounded-full text-sm font-medium text-zinc-500 hover:text-zinc-900`; active `bg-zinc-950 text-white`. CLICK-driven state (default first tab).
Grid (mt-10): `grid sm:grid-cols-2 lg:grid-cols-4 gap-4`.
Tool card: `flex h-full flex-col rounded-[20px] border border-zinc-200 bg-white p-5 sv-hover-lift`:

- icon `h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center` (lucide from prop)
- category `mt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400`
- title `mt-1 text-[15px] font-semibold text-zinc-950`
- description `mt-1 text-[13px] leading-relaxed text-zinc-500`
- features `mt-3 space-y-1.5`: Check icon (size 13, text-emerald-500) + `text-[12.5px] text-zinc-600`
- links row `mt-4 pt-4 border-t border-zinc-100 flex gap-3`: `text-[12.5px] font-semibold text-blue-700` + guide `text-zinc-400 hover:text-zinc-600`.
  Props: `{ label, title, subtitle, tabs: { id, label, tools: ToolCardData[] }[] }`, `ToolCardData = { icon: LucideIcon; category; title; description; features: string[]; openLabel; guideLabel; href }`.

## LandingHowItWorks — `src/components/landing/how-it-works.tsx`

White section. Header centered: eyebrow ("How it works") + H2 "Four steps. That's it."
Grid (mt-12): `grid sm:grid-cols-2 lg:grid-cols-4 gap-6`. Each step:

- step number `flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-900`
- title `mt-4 text-[15px] font-semibold text-zinc-950`, description `mt-1 text-[13px] leading-relaxed text-zinc-500`
- mini mockup card (mt-4) `rounded-[16px] border border-zinc-200 bg-zinc-50 p-3.5` — build 4 small HTML mockups by `mock` key:
  1. `studio` — chips row: 3 rounded-full chips (one dark active) `text-[11px]`
  2. `prompt` — fake input: rounded-xl bg-white border zinc-200 p-2.5 text-[11px] text-zinc-400 + blue send dot
  3. `compare` — two mini tiles side by side labeled "Take 1"/"Take 2", one with blue ring-2 ring-blue-500 + Check badge
  4. `download` — file card: FileVideo icon, "MP4 · 4K · no watermark", Download icon chip
     Props: `{ label, title, subtitle?, steps: { title, description, mock: 'studio'|'prompt'|'compare'|'download' }[] }`.

## LandingFaq — `src/components/landing/faq.tsx`

White section, id="faq". Header centered: eyebrow ("FAQ") + H2 "Good things to know".
Grid (mt-10): `grid lg:grid-cols-2 gap-x-8 gap-y-2`. Use shadcn Accordion (`@/components/ui/accordion`, type="multiple" or single per column split — simplest: one Accordion with all items, split visually by grid on even/odd via order).
Item: AccordionItem `border-b border-zinc-200` — trigger `py-4 text-left text-[15px] font-semibold text-zinc-950 hover:no-underline` (chevron rotates via shadcn); content `text-[13.5px] leading-relaxed text-zinc-500 pb-4`.
Distribute items column-wise: first half column 1, second half column 2 (two separate Accordion instances so each column collapses independently).
Props: `{ label, title, items: { q, a }[] }`.

## Screenshots: `kengage-part2.jpeg` (tools) · `kengage-part3.jpeg` (steps+stats) · `kengage-part4.jpeg` (FAQ)
