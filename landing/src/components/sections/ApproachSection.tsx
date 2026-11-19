import { ArrowUpRight, Square, SquareCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { projectLinks } from '@/config/project-links';

const stepKeys = ['focus', 'explain', 'update', 'invite'] as const;
const pickerExample = [
  { name: 'sk-excute', selected: true },
  { name: 'sk-idea-to-docs', selected: true },
  { name: 'sk-start-next-hono', selected: false },
] as const;

export default async function ApproachSection() {
  const t = await getTranslations('Landing.Approach');

  return (
    <section id="approach" className="kit-section kit-section-alt" aria-labelledby="approach-heading">
      <div className="kit-container kit-workflow">
        <div>
          <p className="kit-kicker">{t('eyebrow')}</p>
          <h2 id="approach-heading">{t('title')}</h2>
          <p className="kit-lead">{t('requirements')}</p>
          <div className="kit-install-picker">
            <div className="kit-install-command">
              <span aria-hidden="true">$</span>
              <code>npx sb-kit install</code>
            </div>
            <div className="kit-install-body">
              <h3>{t('picker.title')}</h3>
              <ul className="kit-install-options" aria-label={t('picker.example')} role="list">
                {pickerExample.map(({ name, selected }) => {
                  const Marker = selected ? SquareCheck : Square;

                  return (
                    <li key={name} className="flex items-center gap-2" data-selected={selected || undefined}>
                      <Marker size={17} className="shrink-0" aria-hidden="true" />
                      <code>{name}</code>
                      <span className="sr-only"> {t(selected ? 'picker.selected' : 'picker.unselected')}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="kit-install-hint">{t('picker.description')}</p>
          </div>
          <a className="kit-button" href={`${projectLinks.source}#installation`}>
            {t('readme')} <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <ol className="kit-steps">
          {stepKeys.map((key) => (
            <li key={key}>
              <p className="kit-kicker">{t(`items.${key}.label`)}</p>
              <h3><code>{t(`items.${key}.title`)}</code></h3>
              <p>{t(`items.${key}.description`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
