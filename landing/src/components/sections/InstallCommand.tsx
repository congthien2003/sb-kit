'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const command = 'npx sb-kit install';

export default function InstallCommand() {
  const t = useTranslations('Landing.Hero');
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <div>
      <div className="kit-command">
        <span aria-hidden="true">$</span>
        <code>{command}</code>
        <button type="button" onClick={copyCommand} aria-label={t('copy')} title={t('copy')}>
          {status === 'copied' ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
        </button>
      </div>
      <p className="kit-copy-status" role="status">
        {status === 'copied' ? t('copied') : status === 'failed' ? t('copyFailed') : null}
      </p>
    </div>
  );
}
