import { Boxes, Layers3, ScanLine } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const features = [
  { key: 'clarity', Icon: Layers3, command: 'sb-kit install' },
  { key: 'context', Icon: ScanLine, command: 'sb-kit doctor / update' },
  { key: 'action', Icon: Boxes, command: 'sb-kit create next-hono' },
] as const;

export default async function FeatureSection() {
  const t = await getTranslations('Landing.Features');

  return (
    <section id="features" className="kit-section" aria-labelledby="features-heading">
      <div className="kit-container">
        <div className="kit-section-heading">
          <div>
            <p className="kit-kicker">{t('eyebrow')}</p>
            <h2 id="features-heading">{t('title')}</h2>
          </div>
          <p>{t('description')}</p>
        </div>
        <div className="kit-feature-grid">
          {features.map(({ key, Icon, command }) => (
            <article key={key} className="kit-card">
              <Icon size={25} aria-hidden="true" />
              <h3>{t(`items.${key}.title`)}</h3>
              <p>{t(`items.${key}.description`)}</p>
              <code>{command}</code>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
