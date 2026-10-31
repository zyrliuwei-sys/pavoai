import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';
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
  const { jsonLd } = Route.useLoaderData();

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-950">
      {/* Rich results: WebSite + Organization + SoftwareApplication + FAQPage,
          built in the loader so the strings match the active locale. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
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
    const title = m['common.metadata.title']({}, { locale });
    const description = m['common.metadata.description']({}, { locale });
    const siteUrl = envConfigs.app_url;
    // Self-referencing canonical per locale: / for en, /zh for zh.
    const canonical = localizeUrl(`${siteUrl}/`, { locale }).href;
    const ogImage = `${siteUrl}/imgs/generated/og-pavoai.jpg`;

    const faqs = [
      { q: m['lp.faq.q1']({}, { locale }), a: m['lp.faq.a1']({}, { locale }) },
      { q: m['lp.faq.q2']({}, { locale }), a: m['lp.faq.a2']({}, { locale }) },
      { q: m['lp.faq.q3']({}, { locale }), a: m['lp.faq.a3']({}, { locale }) },
      { q: m['lp.faq.q4']({}, { locale }), a: m['lp.faq.a4']({}, { locale }) },
      { q: m['lp.faq.q5']({}, { locale }), a: m['lp.faq.a5']({}, { locale }) },
      { q: m['lp.faq.q6']({}, { locale }), a: m['lp.faq.a6']({}, { locale }) },
      { q: m['lp.faq.q7']({}, { locale }), a: m['lp.faq.a7']({}, { locale }) },
      { q: m['lp.faq.q8']({}, { locale }), a: m['lp.faq.a8']({}, { locale }) },
    ];

    const jsonLd = JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: envConfigs.app_name,
        url: siteUrl,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: envConfigs.app_name,
        url: siteUrl,
        logo: `${siteUrl}/logo.svg`,
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'support@pavoai.net',
          contactType: 'customer support',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: envConfigs.app_name,
        url: siteUrl,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ]);

    return { title, description, canonical, ogImage, jsonLd };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: loaderData.title },
          { name: 'description', content: loaderData.description },
          { property: 'og:title', content: loaderData.title },
          { property: 'og:description', content: loaderData.description },
          { property: 'og:type', content: 'website' },
          { property: 'og:url', content: loaderData.canonical },
          { property: 'og:image', content: loaderData.ogImage },
          { property: 'og:site_name', content: envConfigs.app_name },
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'twitter:title', content: loaderData.title },
          { name: 'twitter:description', content: loaderData.description },
          { name: 'twitter:image', content: loaderData.ogImage },
        ]
      : [],
    links: loaderData ? [{ rel: 'canonical', href: loaderData.canonical }] : [],
  }),
  component: HomePage,
});
