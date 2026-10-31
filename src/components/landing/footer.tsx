import type { LucideIcon } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';

export interface FooterFeature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

export interface LandingFooterProps {
  appName: string;
  logoSrc: string;
  tagline: string;
  description: string;
  features: FooterFeature[];
  columns: FooterColumn[];
  socials: { icon: LucideIcon; href: string; label: string }[];
  copyright: string;
  bottomLinks: { label: string; href: string }[];
}

export function LandingFooter({
  appName,
  logoSrc,
  tagline,
  description,
  features,
  columns,
  socials,
  copyright,
  bottomLinks,
}: LandingFooterProps) {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-[1240px] px-6 py-14 sm:px-8">
        {/* Row 1: brand + feature cards */}
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.6fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img src={logoSrc} alt="" className="h-7 w-7 rounded-lg" />
              <span className="text-[15px] font-semibold text-zinc-950">
                {appName}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-zinc-950">
              {tagline}
            </h3>
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-zinc-500">
              {description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-[16px] border border-zinc-200 p-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9f4f2] text-[var(--sv-iris-strong)]">
                    <Icon aria-hidden className="h-5 w-5" />
                  </div>
                  <h4 className="mt-3 text-[13px] font-semibold text-zinc-950">
                    {feature.title}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 2: link columns */}
        <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="text-[13px] font-semibold text-zinc-950">
                {column.title}
              </h4>
              {column.links.map((link, li) => (
                <Link
                  key={`${column.title}-${li}`}
                  href={link.href}
                  className="mt-3 block py-1 text-[13px] text-zinc-500 transition-colors hover:text-[var(--sv-iris-strong)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-6 sm:flex-row">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-zinc-400">{copyright}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            {bottomLinks.map((link, index) => (
              <span
                key={`${link.label}-${index}`}
                className="flex items-center gap-2"
              >
                {index > 0 ? (
                  <span aria-hidden className="text-xs text-zinc-300">
                    &middot;
                  </span>
                ) : null}
                <Link
                  href={link.href}
                  className="text-xs text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  {link.label}
                </Link>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {socials.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.href}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  <Icon aria-hidden className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
