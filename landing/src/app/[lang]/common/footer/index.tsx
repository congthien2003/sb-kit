import { getTranslations } from 'next-intl/server';

import { projectLinks } from '@/config/project-links';

export default async function Footer({ lang }: { lang: string }) {
  const t = await getTranslations('Footer');

  return (
    <footer className="kit-footer">
      <div className="kit-container kit-footer-inner">
        <div>
          <a href={`/${lang}`} className="kit-wordmark"><span aria-hidden="true">&gt;_</span> sb-kit</a>
          <p>{t('description')}</p>
        </div>
        <nav aria-label={t('navigation')} className="kit-footer-links">
          <a href={projectLinks.source}>GitHub</a>
          <a href={projectLinks.npm}>npm</a>
          <a href="#top">{t('top')}</a>
        </nav>
      </div>
    </footer>
  );
}
