import {
  Github,
  MessagesSquare,
  Sparkles,
  Twitter,
  Wallet,
  Youtube,
} from 'lucide-react';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { FooterBadgeList } from '@/components/footer-badge-list';
import { LandingFooter } from '@/components/landing/footer';

/**
 * Site footer — wraps the Pavo AI landing footer with i18n content.
 * Used by the homepage, /pricing and /blog routes.
 */
export function Footer() {
  const year = new Date().getFullYear();

  const legal = [
    { label: m['lp.footer.l51'](), href: '/privacy-policy' },
    { label: m['lp.footer.l52'](), href: '/terms-of-service' },
  ];

  return (
    <LandingFooter
      badges={<FooterBadgeList className="mt-10" />}
      appName={envConfigs.app_name}
      logoSrc={envConfigs.app_logo}
      tagline={m['lp.footer.tagline']()}
      description={m['lp.footer.desc']()}
      features={[
        {
          title: m['lp.footer.f1'](),
          description: m['lp.footer.f1d'](),
          icon: Wallet,
        },
        {
          title: m['lp.footer.f2'](),
          description: m['lp.footer.f2d'](),
          icon: Sparkles,
        },
        {
          title: m['lp.footer.f3'](),
          description: m['lp.footer.f3d'](),
          icon: MessagesSquare,
        },
      ]}
      columns={[
        {
          title: m['lp.footer.col1'](),
          links: [
            { label: m['lp.footer.l11'](), href: '/?mode=video#generator' },
            {
              label: m['lp.footer.l12'](),
              href: '/?mode=video&model=seedance-2-0#generator',
            },
            {
              label: m['lp.footer.l13'](),
              href: '/?mode=video&model=wan-2-7#generator',
            },
            { label: m['lp.footer.l14'](), href: '/settings/works' },
          ],
        },
        {
          title: m['lp.footer.col2'](),
          links: [
            { label: m['lp.footer.l21'](), href: '/?mode=image#generator' },
            {
              label: m['lp.footer.l22'](),
              href: '/?mode=image&model=nano-banana-2#generator',
            },
            {
              label: m['lp.footer.l23'](),
              href: '/?mode=image&model=seedream-4#generator',
            },
            {
              label: m['lp.footer.l24'](),
              href: '/blog/how-to-write-cinematic-video-prompts',
            },
          ],
        },
        {
          title: m['lp.footer.col3'](),
          links: [
            { label: m['lp.footer.l31'](), href: '/blog' },
            {
              label: m['lp.footer.l32'](),
              href: '/blog/how-to-write-cinematic-video-prompts',
            },
            { label: m['lp.footer.l33'](), href: '/#whats-new' },
            { label: m['lp.footer.l34'](), href: '/changelog' },
          ],
        },
        {
          title: m['lp.footer.col4'](),
          links: [
            { label: m['lp.footer.l41'](), href: '/pricing' },
            { label: m['lp.footer.l42'](), href: '/about' },
            { label: m['lp.footer.l43'](), href: '/contact' },
            { label: m['lp.footer.l44'](), href: '/careers' },
          ],
        },
        { title: m['lp.footer.col5'](), links: legal },
      ]}
      socials={[
        { icon: Twitter, href: 'https://x.com', label: 'X' },
        { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
        { icon: Github, href: 'https://github.com', label: 'GitHub' },
      ]}
      copyright={`© ${year} ${m['lp.footer.copyright']()}`}
      bottomLinks={legal}
    />
  );
}
