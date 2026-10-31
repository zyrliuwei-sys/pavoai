import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';

export interface NavLink {
  label: string;
  href: string;
  badge?: boolean;
}

export interface LandingNavProps {
  logoSrc: string;
  appName: string;
  links: NavLink[];
  signInLabel: string;
  signInHref: string;
  ctaLabel: string;
  ctaHref: string;
}

export function LandingNav({
  logoSrc,
  appName,
  links,
  signInLabel,
  signInHref,
  ctaLabel,
  ctaHref,
}: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // Hide on scroll down, reveal on scroll up (not while the menu is open).
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setHidden(y > lastY + 4 && y > 160);
      lastY = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-all duration-300',
        scrolled
          ? 'border-white/[0.08] bg-[#080b11]/80 backdrop-blur-md'
          : 'border-transparent',
        hidden && !open && '-translate-y-full'
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-6 sm:px-8 lg:h-[72px]">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label={appName}
        >
          <img src={logoSrc} alt="" className="h-7 w-7 rounded-lg" />
          <span className="text-[15px] font-semibold text-white">
            {appName}
          </span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {link.label}
              {link.badge ? (
                <span
                  aria-hidden
                  className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500"
                />
              ) : null}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-1 lg:flex">
          <Link
            href={signInHref}
            className="sv-underline px-3 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            {signInLabel}
          </Link>
          <Link
            href={ctaHref}
            className="sv-press inline-flex h-10 items-center rounded-full bg-[var(--sv-iris-strong)] px-4 text-[13.5px] font-semibold text-white transition hover:bg-[var(--sv-iris-deep)]"
          >
            {ctaLabel}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-expanded={open}
          aria-label="Toggle navigation menu"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/[0.06] lg:hidden"
        >
          {open ? (
            <X aria-hidden className="h-5 w-5" />
          ) : (
            <Menu aria-hidden className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu panel — grid-rows animation */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out lg:hidden',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-b border-white/[0.08] bg-[#080b11] px-6 py-4">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3.5 py-2.5 text-[15px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {link.label}
                  {link.badge ? (
                    <span
                      aria-hidden
                      className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500"
                    />
                  ) : null}
                </Link>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href={signInHref}
                onClick={() => setOpen(false)}
                className="flex h-10 items-center justify-center rounded-full text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                {signInLabel}
              </Link>
              <Link
                href={ctaHref}
                onClick={() => setOpen(false)}
                className="sv-press inline-flex h-10 w-full items-center justify-center rounded-full bg-[var(--sv-iris-strong)] px-4 text-[13.5px] font-semibold text-white transition hover:bg-[var(--sv-iris-deep)]"
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
