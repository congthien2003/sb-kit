'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import ThemeToggle from '@/components/ThemeToggle';
import type { Locale } from '@/config/site';

const navigation = [
  { key: 'features', href: '#features' },
  { key: 'approach', href: '#approach' },
  { key: 'contact', href: '#contact' },
] as const;

export default function Header({ lang }: { lang: Locale }) {
  const t = useTranslations('Header');
  const [menuOpen, setMenuOpen] = useState(false);
  const nextLocale = lang === 'en' ? 'vi' : 'en';

  return (
    <header className="kit-header">
      <div className="kit-container kit-header-inner">
        <Link href={`/${lang}`} className="kit-wordmark" aria-label={t('home')}>
          <span aria-hidden="true">&gt;_</span> sb-kit
        </Link>
        <nav aria-label={t('primaryNavigation')} className="kit-nav">
          {navigation.map(({ key, href }) => <a key={key} href={href}>{t(key)}</a>)}
        </nav>
        <div className="kit-header-actions">
          <ThemeToggle />
          <Link
            href={`/${nextLocale}`}
            hrefLang={nextLocale}
            className="kit-icon-button kit-locale"
            aria-label={t('switchLanguage')}
            onClick={(event) => {
              if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              window.location.assign(`/${nextLocale}${window.location.search}${window.location.hash}`);
            }}
          >
            {nextLocale.toUpperCase()}
          </Link>
          <button
            type="button"
            className="kit-icon-button kit-menu"
            aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <nav id="mobile-navigation" aria-label={t('mobileNavigation')} hidden={!menuOpen} className="kit-container kit-mobile-nav">
        {navigation.map(({ key, href }) => (
          <a key={key} href={href} onClick={() => setMenuOpen(false)}>{t(key)}</a>
        ))}
      </nav>
    </header>
  );
}
