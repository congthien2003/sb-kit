import type { MetadataRoute } from 'next';

import { siteConfig } from '@/config/site';
import { locales } from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: new URL(`/${locale}`, siteConfig.url).toString(),
    alternates: {
      languages: Object.fromEntries(
        locales.map((language) => [
          language,
          new URL(`/${language}`, siteConfig.url).toString(),
        ]),
      ),
    },
  }));
}
