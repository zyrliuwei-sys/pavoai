import { usePathname } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { LandingNav } from '@/components/landing/nav';

/**
 * Site header — wraps the Pavo AI landing nav with i18n content.
 * Used by the homepage, /pricing and /blog routes.
 */
export function Header() {
  const pathname = usePathname();
  return (
    <LandingNav
      overlay={pathname === '/'}
      logoSrc={envConfigs.app_logo}
      appName={envConfigs.app_name}
      links={[
        { label: m['lp.nav.video'](), href: '/?mode=video#generator' },
        { label: m['lp.nav.image'](), href: '/?mode=image#generator' },
        { label: m['lp.nav.tools'](), href: '/#tools' },
        { label: m['lp.nav.models'](), href: '/#whats-new' },
        { label: m['lp.nav.pricing'](), href: '/pricing' },
        { label: m['lp.nav.blog'](), href: '/blog' },
      ]}
      signInLabel={m['lp.nav.sign_in']()}
      signInHref="/sign-in"
      menuLabel={m['lp.nav.menu']()}
    />
  );
}
