import { PaymentInterval } from '@/core/payment/types';
import type { PricingProduct } from '@/config/pricing';

/** Monthly comparison prices never replace the catalog's checkout amount. */
export function getPricingDisplayAmounts(
  product: Pick<PricingProduct, 'priceInCents' | 'plan'>
) {
  const billedAnnually = product.plan?.interval === PaymentInterval.YEAR;
  const displayMonths = billedAnnually ? 12 * product.plan!.intervalCount : 1;

  return {
    displayPriceInCents: product.priceInCents / displayMonths,
    checkoutPriceInCents: product.priceInCents,
    billedAnnually,
  };
}
