'use client';

import { FileText, Play, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';

const revealIntervalMs = 520;
const recenterDurationMs = 360;
const recentering = -2;

type OutputFile = {
  path: string;
  description: string;
};

export default function IdeaDocsWorkflow({ files }: { files: OutputFile[] }) {
  const t = useTranslations('SkillExamples.idea');
  const outputId = useId();
  const [revealed, setRevealed] = useState(-1);
  const running = revealed === recentering || (revealed >= 0 && revealed < files.length);
  const complete = revealed === files.length;

  useEffect(() => {
    if (!running) return;
    const returning = revealed === recentering;
    const timer = window.setTimeout(
      () => setRevealed(returning ? 0 : revealed + 1),
      returning ? recenterDurationMs : revealIntervalMs,
    );
    return () => window.clearTimeout(timer);
  }, [revealed, running]);

  function runDemo() {
    if (running) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
      setRevealed(files.length);
      return;
    }
    setRevealed(complete ? recentering : 0);
  }

  const TriggerIcon = complete ? RotateCcw : Play;

  return (
    <div>
      <div className="kit-idea-graph" data-started={revealed >= 0 || undefined}>
        <button
          type="button"
          className="kit-button kit-button-primary kit-idea-trigger"
          aria-label={complete ? t('rerun') : t('run')}
          aria-controls={outputId}
          aria-disabled={running}
          onClick={runDemo}
        >
          <TriggerIcon size={16} aria-hidden="true" />
          Idea
        </button>
        <ul className="kit-idea-outputs" id={outputId} aria-label={t('outputs')} role="list">
          {files.map(({ path, description }, index) => {
            const visible = index < revealed;

            return (
              <li key={path} className="kit-idea-output" data-revealed={visible || undefined} aria-hidden={!visible}>
                <div className="kit-idea-file">
                  <div className="kit-idea-file-content">
                    <FileText size={20} aria-hidden="true" />
                    <div>
                      <code>{path}</code>
                      <p>{description}</p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="kit-idea-status" role="status">
        {running ? t('running') : complete ? t('complete') : t('hint')}
      </p>
    </div>
  );
}
