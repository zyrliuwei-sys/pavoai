import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { publicPageHead } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { Pricing } from '@/blocks/pricing';

export const Route = createFileRoute('/pricing')({
  loader: () => {
    const locale = getLocale();
    return {
      title: `${m['landing.pricing.title']({}, { locale })} | ${envConfigs.app_name}`,
      locale,
      description: m['landing.pricing.description']({}, { locale }),
    };
  },
  head: ({ loaderData }) =>
    loaderData
      ? publicPageHead({
          ...loaderData,
          path: '/pricing',
        })
      : {},
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Pricing headingLevel={1} />
      </main>
      <Footer />
    </div>
  );
}
