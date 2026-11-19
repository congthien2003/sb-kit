'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('Error');
  const locale = useLocale();

  return (
    <section className="kit-section grid min-h-[65vh] place-items-center bg-layout px-5 text-center">
      <div className="max-w-2xl">
        <p className="kit-kicker">
          404
        </p>
        <h1 className="mt-5 font-manrope text-4xl font-medium tracking-[-0.04em] text-neutral-0 sm:text-5xl">
          {t('we-cant-find-that-page')}
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-neutral-300">
          {t(
            'sorry-the-page-you-are-looking-for-doesnt-exist-or-has-been-moved',
          )}
        </p>
        <Link
          href={`/${locale}`}
          className="kit-button kit-button-primary mt-8"
        >
          {t('take-me-home')}
        </Link>
      </div>
    </section>
  );
}
