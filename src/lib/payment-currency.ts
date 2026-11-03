/** Keep native CNY-only methods out of USD package checkouts. */
export function paymentProviderSupportsCurrency(
  provider: string,
  currency: string
) {
  const code = currency.toLowerCase();
  if (provider === 'alipay' || provider === 'wechat') return code === 'cny';
  return provider !== 'creem' || ['usd', 'eur'].includes(code);
}
