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
import { LandingFooter } from '@/components/landing/footer';

/**
 * Site footer — wraps the PavoAI landing footer with i18n content.
 * Used by the homepage, /pricing and /blog routes.
 */
export function Footer() {
  const year = new Date().getFullYear();

  const legal = [
    { label: m['lp.footer.l51'](), href: '/privacy-policy' },
    { label: m['lp.footer.l52'](), href: '/terms-of-service' },
    { label: m['lp.footer.l53'](), href: '/pricing' },
    { label: m['lp.footer.l54'](), href: '/terms-of-service' },
  ];

  return (
    <LandingFooter
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
            { label: m['lp.footer.l11'](), href: '/#gallery' },
            { label: m['lp.footer.l12'](), href: '/#use-cases' },
            { label: m['lp.footer.l13'](), href: '/#tools' },
            { label: m['lp.footer.l14'](), href: '/#tools' },
          ],
        },
        {
          title: m['lp.footer.col2'](),
          links: [
            { label: m['lp.footer.l21'](), href: '/#tools' },
            { label: m['lp.footer.l22'](), href: '/#tools' },
            { label: m['lp.footer.l23'](), href: '/#tools' },
            { label: m['lp.footer.l24'](), href: '/#use-cases' },
          ],
        },
        {
          title: m['lp.footer.col3'](),
          links: [
            { label: m['lp.footer.l31'](), href: '/blog' },
            { label: m['lp.footer.l32'](), href: '/blog' },
            { label: m['lp.footer.l33'](), href: '/#whats-new' },
            { label: m['lp.footer.l34'](), href: '/blog' },
          ],
        },
        {
          title: m['lp.footer.col4'](),
          links: [
            { label: m['lp.footer.l41'](), href: '/pricing' },
            { label: m['lp.footer.l42'](), href: '/blog' },
            { label: m['lp.footer.l43'](), href: '/blog' },
            { label: m['lp.footer.l44'](), href: '/blog' },
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
