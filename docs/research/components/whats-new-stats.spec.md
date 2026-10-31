# B3 — WhatsNew + StatsBand

## LandingWhatsNew — `src/components/landing/whats-new.tsx`

White section (py-20 sm:py-28 lg:py-32, container per design system).
Header row: flex justify-between items-end; left: eyebrow `text-[13px] text-zinc-500` ("What's new") + H2 "Fresh on PavoAI"; right (optional link "All 20+ models" `text-sm font-medium text-blue-700 hover:underline`).
Grid (mt-10): `grid sm:grid-cols-2 lg:grid-cols-4 gap-4`.
Card: `group rounded-[20px] border border-zinc-200 bg-white p-5 sv-hover-lift flex flex-col gap-3`:

- badge pill: `text-[11px] font-semibold uppercase tracking-wide` — tone prop: 'live' (green-700 bg-green-50), 'new' (blue-700 bg-blue-50), 'studio' (purple-700 bg-purple-50)
- title `text-[15px] font-semibold text-zinc-950`
- description `text-[13px] leading-relaxed text-zinc-500`
- optional `image` renders mt-auto `aspect-[16/10] overflow-hidden rounded-xl` img object-cover
  Props: `{ label, title, link?: { label, href }, cards: { badge, tone: 'live'|'new'|'studio', title, description, image? }[] }`.
  Content (default demo in storybook sense — final copy comes via props): 4 cards.

## LandingStatsBand — `src/components/landing/stats-band.tsx`

Night band: `sv-night border-y border-white/[0.08]` + container `py-14`.
Grid `grid grid-cols-2 lg:grid-cols-4 gap-10 text-center lg:text-left`.
Value: `text-[clamp(2.5rem,2vw+1.5rem,4.16rem)] font-semibold leading-none tracking-[-0.045em] text-[#f4f6fb]` (66.56px@1440).
Label: `mt-3 text-[13px] text-white/60` — FIRST line of label is bold white/85 (e.g. "AI models" under "20+", "studios & tools" under "16"): render label as two parts `{ lead, rest }` — `text-white/85 font-medium` + rest normal white/60.
Props: `{ items: { value, lead, rest }[] }` — e.g. value "20+", lead "AI models", rest "".

## Screenshot: `kengage-part1.jpeg` (top) · `kengage-part3.jpeg` (stats band bottom)
