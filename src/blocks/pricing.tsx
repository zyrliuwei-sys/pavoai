import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Film, Image, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { authClient, useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { EVO_MODELS, evoCostCredits } from '@/config/ai-pricing';
import { pricingCatalog } from '@/config/pricing';
import { apiPost } from '@/lib/api-client';
import { getPricingDisplayAmounts } from '@/lib/pricing-display';
import { currentPathWithQuery } from '@/lib/redirect';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  PaymentProviderModal,
  type PaymentProvider,
} from '@/components/payment-provider-modal';
import {
  PricingTable,
  type PricingGroup,
  type PricingPlan,
} from '@/components/pricing-table';

const ALL_PROVIDERS: PaymentProvider[] = [
  'stripe',
  'creem',
  'paypal',
  'alipay',
  'wechat',
];

/** Prices, credits and checkout metadata come from the authoritative catalog. */
export function usePricingGroups(): PricingGroup[] {
  const number = new Intl.NumberFormat(getLocale());
  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const tiers = [
    {
      key: 'starter',
      name: m['landing.pricing.starter'](),
      description: m['landing.pricing.starter_desc'](),
    },
    {
      key: 'pro',
      name: m['landing.pricing.pro'](),
      description: m['landing.pricing.pro_desc'](),
    },
    {
      key: 'enterprise',
      name: m['landing.pricing.enterprise'](),
      description: m['landing.pricing.enterprise_desc'](),
    },
  ];
  const groups = [
    {
      key: 'monthly',
      label: m['landing.pricing.monthly'](),
      interval: m['landing.pricing.month_unit'](),
    },
    {
      key: 'yearly',
      label: m['landing.pricing.yearly'](),
      interval: m['landing.pricing.month_unit'](),
    },
    {
      key: 'lifetime',
      label: m['landing.pricing.lifetime'](),
      interval: undefined,
    },
  ];

  return groups.map((group) => ({
    key: group.key,
    label: group.label,
    plans: tiers.map((tier): PricingPlan => {
      const product = pricingCatalog[`${tier.key}_${group.key}`];
      const amounts = getPricingDisplayAmounts(product);
      const checkoutPrice = usd.format(amounts.checkoutPriceInCents / 100);
      const images = Math.floor(
        product.credits / evoCostCredits(EVO_MODELS['seedream-4'], '2K')
      );
      const videos = Math.floor(
        product.credits / evoCostCredits(EVO_MODELS['wan-2-7'], '720p')
      );
      return {
        id: `${tier.key}-${group.key}`,
        name: tier.name,
        description: tier.description,
        price: usd.format(amounts.displayPriceInCents / 100),
        checkoutPrice,
        billingNote: amounts.billedAnnually
          ? m['landing.pricing.billed_annually']({ amount: checkoutPrice })
          : undefined,
        interval: group.interval,
        featured: tier.key === 'pro',
        badge: tier.key === 'pro' ? m['landing.pricing.popular']() : undefined,
        features: [
          {
            icon: Sparkles,
            label: m['landing.pricing.feature_credits']({
              count: number.format(product.credits),
            }),
          },
          {
            icon: Image,
            label: m['landing.pricing.feature_images']({
              count: number.format(images),
            }),
          },
          {
            icon: Film,
            label: m['landing.pricing.feature_videos']({
              count: number.format(videos),
            }),
          },
          m['landing.pricing.feature_all_models'](),
        ],
        productId: product.productId,
        productName: product.productName,
        priceInCents: product.priceInCents,
        currency: product.currency,
        credits: product.credits,
        creditsValidDays: product.creditsValidDays,
        plan: product.plan,
        buttonText:
          group.key === 'lifetime'
            ? m['landing.pricing.buy_lifetime']()
            : undefined,
      };
    }),
  }));
}

/**
 * Shared checkout wiring for the pricing section and the landing paywall.
 * `redirect` is where the provider drops the user after payment.
 */
export function usePricingCheckout({
  redirect = '/settings/payments',
}: { redirect?: string } = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: configsData } = usePublicConfig();
  const configs = configsData ?? {};
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PricingPlan | null>(null);
  const [loadingProvider, setLoadingProvider] =
    useState<PaymentProvider | null>(null);

  const enabledProviders = useMemo<PaymentProvider[]>(
    () => ALL_PROVIDERS.filter((p) => configs[`${p}_enabled`] === 'true'),
    [configs]
  );

  const checkoutMutation = useMutation({
    mutationFn: ({
      plan,
      provider,
    }: {
      plan: PricingPlan;
      provider: PaymentProvider;
    }) =>
      apiPost<{ checkout_url?: string }>('/api/payment/checkout', {
        product_id: plan.productId,
        product_name: plan.productName || plan.name,
        plan_name: plan.plan?.name || plan.name,
        price: plan.priceInCents,
        currency: plan.currency || 'usd',
        type: plan.plan ? 'subscription' : 'one-time',
        description: plan.name,
        plan: plan.plan,
        credits: plan.credits,
        credits_valid_days: plan.creditsValidDays,
        payment_provider: provider,
        // Where the provider lands the user after paying.
        redirect,
        locale: getLocale(),
      }),
    onSuccess: (data) => {
      if (!data?.checkout_url) {
        toast.error('Checkout failed');
        setLoadingProvider(null);
        return;
      }
      window.location.href = data.checkout_url;
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Checkout failed');
      setLoadingProvider(null);
    },
  });

  function startCheckout(plan: PricingPlan, provider: PaymentProvider) {
    setLoadingProvider(provider);
    return checkoutMutation.mutateAsync({ plan, provider });
  }

  async function handleCheckout(plan: PricingPlan) {
    // Fresh session check: the cached useSession snapshot can lag behind a
    // just-created anonymous session (landing paywall) and would wrongly
    // bounce a paying guest to the sign-in page.
    const fresh = await authClient.getSession();
    if (!fresh.data?.user && !session?.user) {
      const callbackUrl = encodeURIComponent(currentPathWithQuery('/pricing'));
      router.push(`/sign-in?callbackUrl=${callbackUrl}`);
      return;
    }

    const selectEnabled = configs.select_payment_enabled === 'true';
    const defaultProvider = (configs.default_payment_provider ||
      enabledProviders[0] ||
      'stripe') as PaymentProvider;

    if (selectEnabled && enabledProviders.length > 1) {
      setPendingPlan(plan);
      setModalOpen(true);
      return;
    }

    await startCheckout(plan, defaultProvider);
  }

  function handleProviderSelect(provider: PaymentProvider) {
    if (!pendingPlan) return;
    if (checkoutMutation.isPending) return;
    void startCheckout(pendingPlan, provider).catch(() => {});
  }

  const providerModal = (
    <PaymentProviderModal
      open={modalOpen}
      onOpenChange={(open: boolean) => {
        setModalOpen(open);
        if (!open) {
          setPendingPlan(null);
          setLoadingProvider(null);
        }
      }}
      providers={enabledProviders.length ? enabledProviders : ['stripe']}
      loadingProvider={loadingProvider}
      onSelect={handleProviderSelect}
      planName={pendingPlan?.name}
      price={pendingPlan?.checkoutPrice ?? pendingPlan?.price}
    />
  );

  return {
    handleCheckout,
    providerModal,
    checkoutPending: checkoutMutation.isPending,
  };
}

export function Pricing({
  title,
  headingLevel = 2,
}: { title?: string; headingLevel?: 1 | 2 } = {}) {
  const groups = usePricingGroups();
  const { handleCheckout, providerModal } = usePricingCheckout();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  return (
    <section
      id="pricing"
      className="border-border border-t px-4 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-20 text-center">
          <Heading className="font-serif text-4xl font-normal tracking-tight sm:text-5xl">
            {title ?? m['landing.pricing.title']()}
          </Heading>
          <p className="mt-5 opacity-75">
            {m['landing.pricing.description']()}
          </p>
        </div>
        <PricingTable groups={groups} onCheckout={handleCheckout} />
        <p className="text-muted-foreground mt-5 text-center text-sm">
          {m['landing.pricing.usage_note']()}
        </p>
      </div>

      {providerModal}
    </section>
  );
}
