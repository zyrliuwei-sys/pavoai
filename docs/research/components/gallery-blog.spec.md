# B5 — LandingGallery + LandingBlog

## LandingGallery — `src/components/landing/gallery.tsx`

Night section (`sv-night sv-grain relative overflow-hidden`, standard padding).
Header: eyebrow `text-[13px] text-white/60` ("The proof") + H2 white "Made on PavoAI" + sub `mt-4 max-w-[520px] text-[15px] text-white/70`.
Masonry (mt-12): CSS columns `columns-2 lg:columns-3 gap-4 [&>*]:mb-4`; item: `group relative overflow-hidden rounded-[20px] ring-1 ring-white/[0.07] sv-hover-lift break-inside-avoid`; img `w-full object-cover` with per-item aspect from props (`aspect-[3/4]`, `aspect-square`, `aspect-[4/5]`…); overlay bottom gradient `from-black/70 via-black/0` with caption `p-4 text-[13px] font-medium text-white` + optional model tag chip `rounded-full bg-white/10 backdrop-blur px-2.5 py-0.5 text-[11px] text-white/80`. Video items get the same play chip as hero tiles.
Footer row (mt-8 flex justify-center): ghost CTA `h-11 rounded-full ring-1 ring-white/20 px-6 text-sm font-semibold text-white hover:bg-white/[0.06]`.
Props: `{ label, title, subtitle, items: { src, alt, caption?, model?, aspect?: string, kind?: 'video', duration?: string }[], cta: { label, href } }`.

## LandingBlog — `src/components/landing/blog.tsx`

Night section. Header row: eyebrow + H2 "Guides, model drops and prompt recipes" (+ optional "All articles" link text-blue-400 hover:underline).
Grid (mt-10): `grid sm:grid-cols-2 lg:grid-cols-3 gap-4`.
Card: `group relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-[20px] ring-1 ring-white/[0.07] sv-hover-lift` — background `<img class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]">` + dark overlay `bg-gradient-to-t from-black/80 via-black/30 to-black/10` + content `relative p-5`:

- meta row: category chip `rounded-full bg-white/10 backdrop-blur px-2.5 py-0.5 text-[11px] font-medium text-white/80` + date `text-[11px] text-white/60`
- title `mt-3 text-[17px] font-semibold leading-snug text-white` (2-line clamp)
- excerpt `mt-1.5 text-[13px] leading-relaxed text-white/60` (2-line clamp)
- read link `mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-blue-400` + ArrowRight.
  Props: `{ label, title, link?: { label, href }, posts: { title, excerpt, category, date, image, href }[], readLabel }`.

## Screenshots: `kengage-part1.jpeg` (gallery) / `kengage-part4.jpeg` (blog)
