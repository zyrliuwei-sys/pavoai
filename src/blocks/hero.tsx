import { useState } from 'react';

import { authClient } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { usePricingCheckout, usePricingGroups } from '@/blocks/pricing';
import {
  parkPendingGen,
  readPendingGen,
  type PendingGeneration,
} from '@/components/landing/generator';
import { LandingHero } from '@/components/landing/hero';
import { PaywallDialog } from '@/components/landing/paywall-dialog';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MODELS = [
  'Veo 3.1',
  'Kling 3.0',
  'Sora 2',
  'Hailuo 02',
  'Wan 3.0',
  'Seedance 1.0',
  'Runway Gen-4',
  'Luma Ray 3',
  'Pika 2.5',
  'Vidu Q2',
  'PixVerse V5',
  'MiniMax',
];

const TILES = [
  { slug: 'hero-peacock', duration: '0:08' },
  { slug: 'hero-neon-car', duration: '0:06' },
  { slug: 'hero-anime', duration: '0:10' },
  { slug: 'hero-perfume', duration: '0:05' },
  { slug: 'hero-astronaut', duration: '0:09' },
  { slug: 'hero-dragon', duration: '0:12' },
  { slug: 'hero-dancer', duration: '0:07' },
  { slug: 'hero-city', duration: '0:11' },
];

/**
 * Composer toolbar options per mode. Model ids are the EvoLink catalog keys
 * the /api/ai/generate route validates against — only wired models are
 * listed, so every dropdown entry really generates.
 */
const VIDEO_MODELS = [
  { id: 'seedance-2-0', label: 'Seedance 2.0' },
  { id: 'wan-2-7', label: 'Wan 2.7' },
];
const IMAGE_MODELS = [
  { id: 'nano-banana-2', label: 'Nano Banana 2' },
  { id: 'seedream-4', label: 'Seedream 4' },
];
const VIDEO_ASPECTS = [
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
  { id: '1:1', label: '1:1' },
];
const IMAGE_ASPECTS = [
  { id: '1:1', label: '1:1' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
];
const VIDEO_QUALITIES = [
  { id: '720p', label: '720p' },
  { id: '1080p', label: '1080p' },
];
const IMAGE_QUALITIES = [
  { id: '1k', label: '1K' },
  { id: '2k', label: '2K' },
  { id: '4k', label: '4K' },
];

/**
 * Hero — the PavoAI opening section: headline and the interactive generator
 * (mode tabs, prompt bar, in-place render preview) over video tiles.
 */
export function Hero() {
  const router = useRouter();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  // Optional delivery address from the paywall (where results are mailed).
  const [paywallEmail, setPaywallEmail] = useState('');

  // Paywall plans come from the shared pricing grid (monthly group).
  const groups = usePricingGroups();
  const monthlyPlans = groups.find((g) => g.key === 'monthly')?.plans ?? [];
  // After paying, land back on the generator instead of the payments page.
  const { handleCheckout, providerModal } = usePricingCheckout({
    redirect: '/',
  });

  // Brand-new visitors go straight to the paywall: they have no session,
  // and guests intentionally start with 0 credits — calling the API first
  // would only produce a guaranteed 402. An anonymous session is opened
  // (silently, fresh-checked) so checkout works without registration.
  const onFirstGenerate = async (
    prompt: string,
    tabId: string
  ): Promise<'run' | 'blocked'> => {
    const fresh = await authClient.getSession();
    if (fresh.data?.user) return 'run';
    const { error } = await authClient.signIn.anonymous();
    if (error) return 'run'; // let the API path handle it (401 → paywall)
    parkPendingGen({ prompt, tabId, auto: true });
    setPaywallOpen(true);
    return 'blocked';
  };

  // 401/402 mid-run (e.g. credits ran out): park the run and re-show the
  // paywall — generation auto-resumes after payment.
  const openPaywall = (prompt: string, tabId: string) => {
    parkPendingGen({ prompt, tabId, auto: true });
    setPaywallOpen(true);
  };

  const onPaywallCheckout = async (planId: string) => {
    const plan = monthlyPlans.find((p) => p.id === planId);
    if (!plan) return;
    // Merge the optional delivery email into the parked run before paying.
    const pending = readPendingGen();
    if (pending) {
      const email = paywallEmail.trim();
      parkPendingGen({
        ...pending,
        email: EMAIL_RE.test(email) ? email : '',
      });
    }
    setProcessingPlanId(planId);
    try {
      await handleCheckout(plan);
    } finally {
      setProcessingPlanId(null);
    }
  };

  const headline = m['lp.hero.headline']();
  const emphasized = m['lp.hero.emphasized']();

  const words = headline
    .split(' ')
    .filter(Boolean)
    .map((text) => ({
      text,
      emphasized: !!emphasized && text.includes(emphasized),
    }));

  return (
    <>
      <LandingHero
        eyebrow={m['lp.hero.eyebrow']()}
        words={words}
        subtitle={m['lp.hero.subtitle']()}
        // The result-card CTA carries the visitor's prompt (and picked mode)
        // into the sign-up flow instead of doing nothing.
        onSignUp={(prompt, tab) => {
          const params = new URLSearchParams({ mode: tab });
          if (prompt.trim()) params.set('prompt', prompt.trim());
          router.push(`/sign-up?${params.toString()}`);
        }}
        tabs={[
          {
            id: 'video',
            label: m['lp.hero.tab_video'](),
            placeholder: m['lp.hero.placeholder_video'](),
            models: VIDEO_MODELS,
            aspects: VIDEO_ASPECTS,
            qualities: VIDEO_QUALITIES,
          },
          {
            id: 'image',
            label: m['lp.hero.tab_image'](),
            placeholder: m['lp.hero.placeholder_image'](),
            models: IMAGE_MODELS,
            aspects: IMAGE_ASPECTS,
            qualities: IMAGE_QUALITIES,
          },
        ]}
        onFirstGenerate={onFirstGenerate}
        onPaywall={openPaywall}
        ctaLabel={m['lp.hero.cta']()}
        examplesLabel={m['lp.hero.examples_label']()}
        promptExamples={[
          m['lp.hero.pe1'](),
          m['lp.hero.pe2'](),
          m['lp.hero.pe3'](),
        ]}
        trust={[
          m['lp.hero.trust_1'](),
          m['lp.hero.trust_2'](),
          m['lp.hero.trust_3'](),
          m['lp.hero.trust_4'](),
        ]}
        styleLabel={m['lp.hero.style']()}
        fastLabel={m['lp.hero.fast']()}
        stages={[
          m['lp.hero.stage_1'](),
          m['lp.hero.stage_2'](),
          m['lp.hero.stage_3'](),
          m['lp.hero.stage_4'](),
        ]}
        readyLabel={m['lp.hero.ready']()}
        againLabel={m['lp.hero.again']()}
        keepLabel={m['lp.hero.keep']()}
        demoNote={m['lp.hero.demo_note']()}
        playLabel={m['lp.hero.play']()}
        pauseLabel={m['lp.hero.pause']()}
        tiles={TILES.map(({ slug, duration }) => ({
          src: `/imgs/generated/${slug}.jpg`,
          alt: m['lp.hero.tile_alt'](),
          kind: 'video' as const,
          duration,
        }))}
        marquee={{
          title: m['lp.hero.marquee_title'](),
          models: MODELS,
          pauseLabel: m['lp.hero.pause'](),
        }}
      />

      {/* Paywall — opened when generation is blocked by credits/auth. Guests
        pay against their anonymous session; no sign-up required. */}
      <PaywallDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title={m['lp.hero.paywall_title']()}
        description={m['lp.hero.paywall_desc']()}
        note={m['lp.hero.paywall_note']()}
        plans={monthlyPlans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          interval: plan.interval,
          description: plan.description,
          featured: plan.featured,
          featureLabels: plan.features.map((f) =>
            typeof f === 'string' ? f : f.label
          ),
        }))}
        onCheckout={onPaywallCheckout}
        processingId={processingPlanId}
        emailLabel={m['lp.hero.paywall_email_label']()}
        emailPlaceholder={m['lp.hero.paywall_email_placeholder']()}
        email={paywallEmail}
        onEmailChange={setPaywallEmail}
      />
      {providerModal}
    </>
  );
}
