import type { MetadataRoute } from 'next';

import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    host: siteConfig.url.origin,
    sitemap: new URL('/sitemap.xml', siteConfig.url).toString(),
  };
}
