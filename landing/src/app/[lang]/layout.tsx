import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import type { ReactNode } from 'react';

import { locales } from '@/i18n/routing';
import { siteConfig } from '@/config/site';
import { LenisProvider } from '@/components/providers/LenisProvider';
import Footer from './common/footer';
import Header from './common/header';
import 'lenis/dist/lenis.css';
import './globals.css';

const manrope = localFont({
  src: [
    { path: '../../../public/fonts/Manrope-ExtraLight.ttf', weight: '200' },
    { path: '../../../public/fonts/Manrope-Light.ttf', weight: '300' },
    { path: '../../../public/fonts/Manrope-Regular.ttf', weight: '400' },
    { path: '../../../public/fonts/Manrope-Medium.ttf', weight: '500' },
    { path: '../../../public/fonts/Manrope-SemiBold.ttf', weight: '600' },
    { path: '../../../public/fonts/Manrope-Bold.ttf', weight: '700' },
    { path: '../../../public/fonts/Manrope-ExtraBold.ttf', weight: '800' },
  ],
  variable: '--font-manrope',
  display: 'swap',
});

const themeInit = `try {
  const theme = localStorage.getItem('sb-kit-theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {}`;

export const metadata: Metadata = {
  metadataBase: siteConfig.url,
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: 'A practical toolkit of agent skills and project workflows.',
  icons: {
    icon: '/favicon.svg',
  },
};

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: requestedLang } = await params;
  const lang = requestedLang === 'vi' ? 'vi' : 'en';
  setRequestLocale(lang);
  const [messages, t] = await Promise.all([
    getMessages(),
    getTranslations('Header'),
  ]);

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${manrope.variable} font-manrope antialiased`}>
        <NextIntlClientProvider locale={lang} messages={messages}>
          <LenisProvider>
            <a
              href="#main-content"
              className="sr-only z-[100] rounded-md bg-container px-4 py-3 text-neutral-0 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
              {t('skipToContent')}
            </a>
            <Header lang={lang} />
            <main id="main-content">{children}</main>
            <Footer lang={lang} />
          </LenisProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
