import { cn } from '@/lib/utils';
import React, { JSX } from 'react';

export type TypographyVariant =
  | 'headline-1'
  | 'headline-2'
  | 'headline-3'
  | 'headline-4'
  | 'headline-5'
  | 'headline-6'
  | 'subheadline-1'
  | 'subheadline-2'
  | 'hero-description'
  | 'cta-description'
  | 'partner-description'
  | 'body-large'
  | 'body'
  | 'body-small'
  | 'big-button'
  | 'button'
  | 'description'
  | 'small-description'
  | 'caption'
  | 'overline'
  | 'label'
  | 'base'
  | 'footer-label'
  | 'subpage-description';

export type TypographyWeight = 'regular' | 'medium' | 'bold';

export interface TypographyProps {
  variant?: TypographyVariant;
  weight?: TypographyWeight;
  animated?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const variantClasses: Record<TypographyVariant, string> = {
  // ── Headlines ─────────────────────────────────────────────────────────
  'headline-1': 'text-headline-1 leading-tight font-bold',
  'headline-2': 'text-headline-2 leading-tight font-bold',
  'headline-3': 'text-headline-3 leading-tight font-bold',
  'headline-4': 'text-headline-4 leading-tight font-bold',
  'headline-5': 'text-headline-5 leading-tight font-bold',
  'headline-6': 'text-headline-6 leading-tight font-bold',

  // Subheadings
  'subheadline-1': 'text-lg md:text-xl font-medium',
  'subheadline-2': 'text-base md:text-lg font-medium',

  // ── Descriptions / Body ───────────────────────────────────────────────
  'hero-description': 'text-base md:text-xl font-normal text-neutral-300',
  'cta-description': 'text-base md:text-lg font-normal text-neutral-0',
  'subpage-description': 'text-base md:text-lg font-normal text-neutral-0',
  'partner-description': 'text-sm md:text-base font-normal text-neutral-0',
  'body-large': 'text-lg leading-relaxed',
  body: 'text-base leading-relaxed font-medium',
  'body-small': 'text-sm leading-relaxed',

  // ── Buttons ───────────────────────────────────────────────────────────
  'big-button': 'text-lg md:text-xl font-medium',
  button: 'text-sm md:text-base font-medium',

  // ── Semantic descriptions ─────────────────────────────────────────────
  description: 'text-base text-neutral-300',
  'small-description': 'text-sm',

  // ── Utility / UI ──────────────────────────────────────────────────────
  caption: 'text-xs',
  overline: 'text-xs font-medium uppercase tracking-wider',
  label: 'text-sm font-medium',
  base: 'text-base',
  'footer-label': 'text-sm',
};

const weightClasses: Record<TypographyWeight, string> = {
  regular: 'font-normal',
  medium: 'font-medium',
  bold: 'font-bold',
};

const defaultElements: Record<TypographyVariant, keyof JSX.IntrinsicElements> =
  {
    'headline-1': 'h1',
    'headline-2': 'h2',
    'headline-3': 'h3',
    'headline-4': 'h4',
    'headline-5': 'h5',
    'headline-6': 'h6',
    'subheadline-1': 'h4',
    'subheadline-2': 'h5',
    'hero-description': 'p',
    'cta-description': 'p',
    'subpage-description': 'p',
    'partner-description': 'p',
    'body-large': 'p',
    body: 'p',
    'body-small': 'p',
    'big-button': 'span',
    button: 'span',
    description: 'p',
    'small-description': 'p',
    caption: 'span',
    overline: 'span',
    label: 'label',
    base: 'span',
    'footer-label': 'span',
  };

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  (
    {
      variant = 'description',
      weight = 'regular',
      animated = false,
      as,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const Component = as || defaultElements[variant];

    // Don't apply weight class for headlines (Iciel Cubano) or if it's already in variant
    const shouldApplyWeight =
      !variant.includes('headline') && !variant.includes('button');

    return React.createElement(
      Component,
      {
        ref,
        className: cn(
          variantClasses[variant],
          shouldApplyWeight && weightClasses[weight],
          animated && 'fade-in',
          className,
        ),
        ...props,
      },
      children,
    );
  },
);

Typography.displayName = 'Typography';

export default Typography;
