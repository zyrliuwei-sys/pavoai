import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Blog } from '@/blocks/blog';
import { Comparison } from '@/blocks/comparison';
import { FAQ } from '@/blocks/faq';
import { Footer } from '@/blocks/footer';
import { Gallery } from '@/blocks/gallery';
import { Guide } from '@/blocks/guide';
import { Header } from '@/blocks/header';
import { Hero } from '@/blocks/hero';
import { HowItWorks } from '@/blocks/how-it-works';
import { Pricing } from '@/blocks/pricing';
import { Stats } from '@/blocks/stats';
import { SupportWidget } from '@/blocks/support-widget';
import { Tools } from '@/blocks/tools';
import { UseCases } from '@/blocks/use-cases';
import { WhatsNew } from '@/blocks/whats-new';

/**
 * PavoAI landing page — pure composition of i18n blocks.
 * Section rhythm mirrors the reference design: dark → white alternating.
 */
function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-950">
      <Header />
      <main>
        <Hero />
        <WhatsNew />
        <Gallery />
        <Comparison />
        <UseCases />
        <Guide />
        <Tools />
        <HowItWorks />
        <Stats />
        <Pricing />
        <FAQ />
        <Blog />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  );
}

export const Route = createFileRoute('/')({
  loader: () => {
    const locale = getLocale();
    return {
      title: m['common.metadata.title']({}, { locale }),
      description: m['common.metadata.description']({}, { locale }),
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: loaderData.title },
          { name: 'description', content: loaderData.description },
        ]
      : [],
  }),
  component: HomePage,
});
