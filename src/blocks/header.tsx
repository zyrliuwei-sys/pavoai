import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { LandingNav } from '@/components/landing/nav';

/**
 * Site header — wraps the PavoAI landing nav with i18n content.
 * Used by the homepage, /pricing and /blog routes.
 */
export function Header() {
  return (
    <LandingNav
      logoSrc={envConfigs.app_logo}
      appName={envConfigs.app_name}
      links={[
        { label: m['lp.nav.video'](), href: '/#gallery' },
        { label: m['lp.nav.image'](), href: '/#use-cases' },
        { label: m['lp.nav.tools'](), href: '/#tools' },
        { label: m['lp.nav.models'](), href: '/#whats-new' },
        { label: m['lp.nav.pricing'](), href: '/pricing' },
        { label: m['lp.nav.blog'](), href: '/blog' },
      ]}
      signInLabel={m['lp.nav.sign_in']()}
      signInHref="/sign-in"
      ctaLabel={m['lp.nav.cta']()}
      // P0-2: land on the in-page generator, not the sign-up wall.
      ctaHref="/#generator"
    />
  );
}
