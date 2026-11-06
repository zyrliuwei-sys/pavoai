import { envConfigs } from '@/config';
import {
  baseLocale,
  getLocale,
  locales,
  localizeUrl,
} from '@/paraglide/runtime.js';

/** Keep canonical, language alternatives and share cards on the same page. */
export function publicPageHead({
  title,
  description,
  path,
  locale,
  image = '/imgs/generated/og-pavoai.jpg',
  type = 'website',
}: {
  title: string;
  description: string;
  path: string;
  locale: ReturnType<typeof getLocale>;
  image?: string;
  type?: 'website' | 'article';
}) {
  const urlFor = (language: typeof locale) =>
    localizeUrl(new URL(path, envConfigs.app_url), { locale: language }).href;
  const canonical = urlFor(locale);
  const imageUrl = new URL(image, envConfigs.app_url).href;
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { property: 'og:url', content: canonical },
      { property: 'og:image', content: imageUrl },
      { property: 'og:site_name', content: envConfigs.app_name },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: imageUrl },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      ...locales.map((language) => ({
        rel: 'alternate',
        hrefLang: language,
        href: urlFor(language),
      })),
      { rel: 'alternate', hrefLang: 'x-default', href: urlFor(baseLocale) },
    ],
  };
}
