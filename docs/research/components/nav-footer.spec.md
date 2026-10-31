# B1 — LandingNav + LandingFooter

## LandingNav — `src/components/landing/nav.tsx`

Fixed transparent nav over the dark hero (1440px: h-26/104px, px-8). No bg at top.
After scrolling >8px: bg #05060a/80 + backdrop-blur + border-b border-white/[0.08].
Inner: container max-w-[1240px], h-16 lg:h-[72px], flex justify-between items-center.
Left: `<img src={logoSrc} class="h-7 w-7 rounded-lg">` + `<span class="text-[15px] font-semibold text-white">PavoAI</span>` (appName prop).
Center (hidden lg:flex gap-1): links `text-sm font-medium text-white/70 hover:text-white px-3.5 py-2 rounded-full hover:bg-white/[0.06]`.
Links may carry `badge` ("New") → red dot or `text-[10px] font-semibold text-red-400`.
Right: Sign in `text-sm font-medium text-white/70 hover:text-white`; CTA pill `h-10 rounded-full bg-[#3b82f6] px-4 text-[13.5px] font-semibold text-white hover:bg-[#2563eb]`.
Mobile (lg:hidden): hamburger (Menu icon) toggles a panel: bg #05060a, links stacked, CTA full width. Animated max-h transition.
Props: `{ logoSrc, appName, links: { label, href, badge? }[], signInLabel, signInHref, ctaLabel, ctaHref }`.

## LandingFooter — `src/components/landing/footer.tsx`

White bg (light section). Structure top→bottom:

1. Top CTA row (optional prop `topCta?: { title, sub, label, href }`) — skip rendering when undefined.
2. Brand block + 3 mini feature cards: grid lg:grid-cols-[1.2fr_2fr], cards white border zinc-200 rounded-[20px] p-5, icon in blue-50 rounded-full.
3. Link columns: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8`; heading `text-[13px] font-semibold text-zinc-950`, links `text-[13px] text-zinc-500 hover:text-blue-700 py-1 block`.
4. Bottom bar: border-t zinc-200, `© {year} {appName}` + bottomLinks + social icons (lucide: Twitter→X use `Twitter`, Youtube, MessageCircle for Discord, Send for Telegram) + MUST render `<BuiltWithShipAny />` from `@/components/built-with-shipany` (required attribution, next to copyright).
   Props: `{ appName, logoSrc, tagline, description, features: { title, description, icon: LucideIcon }[], columns: { title, links: { label, href }[] }[], socials: { icon: LucideIcon, href, label }[], copyright, bottomLinks: { label, href }[] }`.

## Reference screenshot

`docs/design-references/kengage-part0.jpeg` (nav) · `kengage-part4.jpeg` (footer)
