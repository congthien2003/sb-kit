'use client';

import { ArrowRight, Database, PanelsTopLeft, Server } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

const runtimes = [
  { key: 'node', label: 'Node.js' },
  { key: 'workers', label: 'Cloudflare Workers' },
] as const;

type Runtime = (typeof runtimes)[number];

export default function NextHonoDemo() {
  const t = useTranslations('SkillExamples.nextHono');
  const groupId = useId();
  const [runtime, setRuntime] = useState<Runtime>(runtimes[0]);

  return (
    <div className="kit-next-demo">
      <div className="kit-next-toolbar">
        <div className="kit-next-input">
          <p className="kit-kicker">{t('input')}</p>
          <code>npx sb-kit create next-hono my-app</code>
        </div>
        <fieldset className="kit-next-runtimes">
          <legend className="kit-kicker">{t('runtime')}</legend>
          {runtimes.map((option) => (
            <label key={option.key}>
              <input
                type="radio"
                name={groupId}
                value={option.key}
                checked={runtime.key === option.key}
                onChange={() => setRuntime(option)}
                className="sr-only"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <ol className="kit-workflow-nodes kit-next-stack" aria-label={t('diagram')} role="list">
        <li className="kit-workflow-node kit-next-node">
          <PanelsTopLeft size={21} aria-hidden="true" />
          <h4>Next.js client</h4>
          <p>{t('client')}</p>
          <ArrowRight className="kit-workflow-connector" size={21} aria-hidden="true" />
        </li>
        <li className="kit-workflow-node kit-next-node kit-next-server">
          <Server size={21} aria-hidden="true" />
          <h4>Hono API</h4>
          <div aria-live="polite" aria-atomic="true">
            <span className="kit-next-runtime-label">{runtime.label}</span>
            <p>{t(`server.${runtime.key}`)}</p>
          </div>
          <ArrowRight className="kit-workflow-connector" size={21} aria-hidden="true" />
        </li>
        <li className="kit-workflow-node kit-next-node">
          <Database size={21} aria-hidden="true" />
          <h4>PostgreSQL + Drizzle</h4>
          <p>{t('data')}</p>
        </li>
      </ol>

      <dl className="kit-next-options">
        <div>
          <dt>{t('authTitle')}</dt>
          <dd>{t('auth')}</dd>
        </div>
        <div>
          <dt>Cloudflare R2</dt>
          <dd>{t('storage')}</dd>
        </div>
      </dl>
    </div>
  );
}
