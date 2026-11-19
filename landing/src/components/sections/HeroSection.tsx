import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { projectLinks } from '@/config/project-links';
import HeroScene from './HeroScene';
import InstallCommand from './InstallCommand';

export default async function HeroSection() {
  const t = await getTranslations('Landing.Hero');

  return (
    <section id="top" className="kit-hero">
      <div className="kit-container kit-hero-grid">
        <div className="kit-hero-copy">
          <p className="kit-kicker">{t('eyebrow')}</p>
          <h1>{t('title')}</h1>
          <p className="kit-lead">{t('description')}</p>
          <InstallCommand />
          <div className="kit-actions">
            <a className="kit-button kit-button-primary" href="#approach">
              {t('primaryCta')} <ArrowDown size={16} aria-hidden="true" />
            </a>
            <a className="kit-button" href={projectLinks.source}>
              GitHub <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
        <HeroScene instruction={t('dockInstruction')} />
      </div>
    </section>
  );
}
