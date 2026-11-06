import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { authClient, useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { EVO_MODELS, evoCostCredits } from '@/config/ai-pricing';
import { landingVideos } from '@/config/landing-media';
import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { useOperations } from '@/hooks/use-operations';
import { usePricingCheckout, usePricingGroups } from '@/blocks/pricing';
import {
  parkPendingGen,
  readPendingGen,
  type GenerationSelection,
  type PendingGeneration,
} from '@/components/landing/generator';
import { LandingHero } from '@/components/landing/hero';
import { PaywallDialog } from '@/components/landing/paywall-dialog';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MODELS = Object.values(EVO_MODELS).map((model) => model.label);

const TILES = [
  'user-neon-drive',
  'user-astronaut',
  'user-watch',
  'user-dragon',
  'user-pixel-run',
  'user-couture',
  'user-sky-train',
  'user-crystal-whale',
] as const;

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
  { id: '1K', label: '1K' },
  { id: '2K', label: '2K' },
  { id: '4K', label: '4K' },
];

/**
 * Hero — the Pavo AI opening section: headline and the interactive generator
 * (mode tabs, prompt bar, in-place render preview) over video tiles.
 */
export function Hero() {
  const operations = useOperations();
  const { data: session } = useSession();
  const registered = !!session?.user && !session.user.isAnonymous;
  const availability = useQuery({
    queryKey: ['generation-availability'],
    queryFn: () =>
      apiGet<{ storage: boolean; email: boolean }>('/api/ai/availability'),
    staleTime: 30_000,
  });
  const router = useRouter();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState(0);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  // Optional delivery address from the paywall (where results are mailed).
  const [paywallEmail, setPaywallEmail] = useState('');

  // First purchases use one-time packs from the same catalog as the pricing page.
  const groups = usePricingGroups();
  const creditPacks = (groups.find((g) => g.key === 'lifetime')?.plans ?? [])
    .filter((plan) => (plan.credits ?? 0) >= requiredCredits)
    .sort((a, b) => (a.priceInCents ?? 0) - (b.priceInCents ?? 0));
  // After paying, land back on the generator instead of the payments page.
  const { handleCheckout, providerModal } = usePricingCheckout({
    redirect: '/?checkout=returned#generator',
  });

  // Brand-new visitors go straight to the paywall: they have no session,
  // and guests intentionally start with 0 credits — calling the API first
  // would only produce a guaranteed 402. An anonymous session is opened
  // (silently, fresh-checked) so checkout works without registration.
  const onFirstGenerate = async (
    prompt: string,
    tabId: string,
    selection: GenerationSelection
  ): Promise<'run' | 'blocked'> => {
    operations.record('generate_clicked');
    const available = await apiGet<{ storage: boolean; email: boolean }>(
      '/api/ai/availability'
    );
    const fresh = await authClient.getSession();
    if (
      fresh.data?.user &&
      !fresh.data.user.isAnonymous &&
      !available.storage
    ) {
      toast.error(m['works.storage_unavailable']());
      return 'blocked';
    }
    if (
      paywallEmail.trim() &&
      (!EMAIL_RE.test(paywallEmail.trim()) || paywallEmail.trim().length > 200)
    ) {
      toast.error(m['works.invalid_email']());
      return 'blocked';
    }
    if (fresh.data?.user) return 'run';
    const { error } = await authClient.signIn.anonymous();
    if (error) return 'run'; // let the API path handle it (401 → paywall)
    openPaywall(prompt, tabId, selection);
    return 'blocked';
  };

  // 401/402 mid-run (e.g. credits ran out): park the run and re-show the
  // paywall — generation auto-resumes after payment.
  const openPaywall = (
    prompt: string,
    tabId: string,
    selection: GenerationSelection
  ) => {
    const model = EVO_MODELS[selection.modelId];
    setRequiredCredits(
      model ? evoCostCredits(model, selection.quality, selection.fast) : 0
    );
    parkPendingGen({ prompt, tabId, auto: true, selection });
    setPaywallOpen(true);
    operations.record('paywall_viewed');
  };

  const onPaywallCheckout = async (planId: string) => {
    if (
      !registered &&
      paywallEmail.trim() &&
      !EMAIL_RE.test(paywallEmail.trim())
    ) {
      toast.error(m['works.invalid_email']());
      return;
    }
    const plan = creditPacks.find((p) => p.id === planId);
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
        delivery={{
          registered,
          email: paywallEmail,
          onEmailChange: setPaywallEmail,
          emailAvailable: availability.data?.email === true,
          emailLabel: m['lp.hero.paywall_email_label'](),
          emailPlaceholder: m['lp.hero.paywall_email_placeholder'](),
          hint: registered
            ? m['works.account_hint']()
            : availability.data?.email
              ? m['works.guest_hint']()
              : m['works.guest_no_email_hint'](),
          downloadLabel: m['works.download'](),
          accountResult: m['works.account_result'](),
          emailResult: m['works.email_result'](),
          temporaryResult: m['works.temporary_result'](),
          retryLabel: m['works.retrying'](),
          worksLabel: m['works.title'](),
        }}
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
        creditLabel={m['works.credits']()}
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
        tiles={TILES.map((slug) => ({
          video: landingVideos[slug],
          alt: m['lp.hero.tile_alt'](),
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
        title={m['landing.pricing.buy_lifetime']()}
        description={m['landing.pricing.one_time_payment']()}
        note={
          registered
            ? m['works.account_hint']()
            : availability.data?.email
              ? m['works.guest_hint']()
              : m['works.guest_no_email_hint']()
        }
        showEmail={!registered && availability.data?.email === true}
        plans={creditPacks.map((plan, index) => ({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          interval: plan.interval,
          description: plan.billingNote,
          featured: index === 0,
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
