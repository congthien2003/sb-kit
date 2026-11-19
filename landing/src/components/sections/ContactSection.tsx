import { ArrowUpRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { projectLinks } from '@/config/project-links';
import type { Locale } from '@/config/site';
import { getContactFormAvailability } from '@/lib/contact-form-config';
import ContactForm from './ContactForm';

export default async function ContactSection({ lang }: { lang: Locale }) {
  const t = await getTranslations('Contact');
  const availability = getContactFormAvailability(lang);

  return (
    <section id="contact" className="kit-section" aria-labelledby="contact-heading">
      <div className="kit-container">
        <div className="kit-contact">
          <div>
            <p className="kit-kicker">{t('eyebrow')}</p>
            <h2 id="contact-heading">{t('title')}</h2>
            <p className="kit-lead">{t('description')}</p>
          </div>
          <div className="kit-actions">
            <a className="kit-button kit-button-primary" href={projectLinks.issues}>
              {t('issues')} <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <a className="kit-button" href={projectLinks.npm}>
              npm <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
        {availability.enabled && (
          <div className="kit-contact-form">
            <ContactForm enabled privacyNotice={availability.privacyNotice} />
          </div>
        )}
      </div>
    </section>
  );
}
