'use client';

import { Check, Play, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { heroSkills } from '@/config/hero-skills';
import ExecuteBoard, { stepDurationMs } from './ExecuteBoard';

type Step = {
  key: string;
  approval: boolean;
  title: string;
  description: string;
};

export default function ExecuteWorkflow({ steps }: { steps: Step[] }) {
  const t = useTranslations('SkillExamples.execute');
  const [playback, setPlayback] = useState({ position: -1, startedAt: 0 });
  const { position, startedAt } = playback;
  const active = steps[position];
  const complete = position === steps.length;
  const detail = active ?? (complete ? steps[steps.length - 1] : steps[0]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const item = legendRef.current?.children[position];
    if (!viewport || !item || viewport.scrollWidth <= viewport.clientWidth) return;
    const bounds = viewport.getBoundingClientRect();
    const step = item.getBoundingClientRect();
    if (step.left >= bounds.left && step.right <= bounds.right) return;
    viewport.scrollTo({
      left: viewport.scrollLeft + step.left - bounds.left - (viewport.clientWidth - step.width) / 2,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }, [position]);

  useEffect(() => {
    if (position < 0 || position >= steps.length) return;
    const remaining = Math.max(0, startedAt + stepDurationMs - performance.now());
    const timer = window.setTimeout(() => {
      setPlayback({ position: position + 1, startedAt: performance.now() });
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [position, startedAt, steps.length]);

  const RunIcon = complete ? RotateCcw : Play;

  return (
    <div className="kit-execute-player">
      <div className="kit-workflow-toolbar">
        <button
          type="button"
          className="kit-button kit-button-primary"
          aria-disabled={Boolean(active)}
          onClick={() => {
            if (!active) setPlayback({ position: 0, startedAt: performance.now() });
          }}
        >
          <RunIcon size={16} aria-hidden="true" />
          {active ? t('running') : complete ? t('rerun') : t('run')}
        </button>
        <p className="kit-workflow-status" role="status">
          {active
            ? t('progress', { step: position + 1, total: steps.length, title: active.title })
            : complete ? t('complete') : t('demoNote')}
        </p>
      </div>
      <div ref={viewportRef} className="kit-execution-viewport" role="region"
        tabIndex={0} aria-labelledby={heroSkills[0].target}>
        <div className="kit-execution-track">
          <ExecuteBoard steps={steps} playback={playback} />
          <ol ref={legendRef} className="kit-execution-legend" role="list"
            style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {steps.map(({ key, approval, title }, index) => {
              const isCurrent = position === index;
              const isDone = position > index;

              return (
                <li
                  key={key}
                  className="kit-execution-step"
                  data-state={isCurrent ? 'active' : isDone ? 'done' : 'idle'}
                  data-approval={approval || undefined}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className="kit-workflow-marker" aria-hidden="true">
                    {isDone ? <Check size={15} /> : index + 1}
                  </span>
                  <h4>{title}</h4>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      {detail && <p className="kit-execution-detail"><strong>{detail.title}</strong> {detail.description}</p>}
    </div>
  );
}
