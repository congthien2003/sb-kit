'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ThemeToggle() {
  const t = useTranslations('Header');

  function toggleTheme() {
    const root = document.documentElement;
    const current = getComputedStyle(root).colorScheme;
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;

    try {
      window.localStorage.setItem('sb-kit-theme', next);
    } catch {
      // The current page still switches when storage is unavailable.
    }
  }

  return (
    <button type="button" className="kit-icon-button" onClick={toggleTheme} aria-label={t('toggleTheme')} title={t('toggleTheme')}>
      <Moon className="kit-theme-moon" size={18} aria-hidden="true" />
      <Sun className="kit-theme-sun" size={18} aria-hidden="true" />
    </button>
  );
}
