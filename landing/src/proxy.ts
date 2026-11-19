import createIntlMiddleware from 'next-intl/middleware';

import { defaultLocale, locales } from './i18n/routing';

export default createIntlMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
  localePrefix: 'always',
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};
