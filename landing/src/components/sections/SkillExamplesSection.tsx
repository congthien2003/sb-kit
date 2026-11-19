import { Boxes, GitPullRequest, MessageSquare } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { heroSkills } from '@/config/hero-skills';

import ExecuteWorkflow from './ExecuteWorkflow';
import IdeaDocsWorkflow from './IdeaDocsWorkflow';
import NextHonoDemo from './NextHonoDemo';

const steps = [
  { key: 'investigate', approval: false },
  { key: 'spec', approval: false },
  { key: 'approveSpec', approval: true },
  { key: 'plan', approval: false },
  { key: 'approvePlan', approval: true },
  { key: 'deliver', approval: false },
] as const;

const documents = [
  { key: 'overview', path: 'docs/overview.md' },
  { key: 'spec', path: 'docs/spec.md' },
  { key: 'plan', path: 'docs/implementation-plan.md' },
] as const;

export default async function SkillExamplesSection() {
  const t = await getTranslations('SkillExamples');

  return (
    <section id="skill-examples" className="kit-section" aria-labelledby="skill-examples-heading">
      <div className="kit-container">
        <div className="kit-section-heading kit-skill-heading">
          <h2 id="skill-examples-heading">{t('title')}</h2>
          <p>{t('description')}</p>
        </div>
        <div className="kit-skill-examples">
          <article className="kit-skill-demo kit-execute-demo" aria-labelledby={heroSkills[0].target}>
            <div className="kit-skill-intro">
              <p className="kit-kicker"><GitPullRequest aria-hidden="true" size={17} /> sk-excute</p>
              <h3 id={heroSkills[0].target} tabIndex={-1}>{t('execute.title')}</h3>
              <p>{t('execute.description')}</p>
            </div>
            <ExecuteWorkflow
              steps={steps.map(({ key, approval }) => ({
                key,
                approval,
                title: t(`execute.steps.${key}.title`),
                description: t(`execute.steps.${key}.description`),
              }))}
            />
          </article>

          <article className="kit-skill-demo kit-idea-demo" aria-labelledby={heroSkills[1].target}>
            <div className="kit-skill-intro">
              <p className="kit-kicker"><MessageSquare aria-hidden="true" size={17} /> sk-idea-to-docs</p>
              <h3 id={heroSkills[1].target} tabIndex={-1}>{t('idea.title')}</h3>
              <p>{t('idea.description')}</p>
            </div>
            <IdeaDocsWorkflow
              files={documents.map(({ key, path }) => ({ path, description: t(`idea.files.${key}`) }))}
            />
          </article>
          <article className="kit-skill-demo kit-execute-demo" aria-labelledby={heroSkills[2].target}>
            <div className="kit-skill-intro">
              <p className="kit-kicker"><Boxes aria-hidden="true" size={17} /> sk-start-next-hono</p>
              <h3 id={heroSkills[2].target} tabIndex={-1}>{t('nextHono.title')}</h3>
              <p>{t('nextHono.description')}</p>
            </div>
            <NextHonoDemo />
          </article>
        </div>
      </div>
    </section>
  );
}
