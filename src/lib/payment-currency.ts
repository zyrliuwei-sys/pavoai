/** Creem product prices support USD/EUR; never send a CNY pack to an old USD mapping. */
export function paymentProviderSupportsCurrency(
  provider: string,
  currency: string
) {
  return (
    provider !== 'creem' || ['usd', 'eur'].includes(currency.toLowerCase())
  );
}
