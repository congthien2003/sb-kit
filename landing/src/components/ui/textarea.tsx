'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Typography } from '@/components/typography';

const textareaVariants = cva(
  'w-full rounded-xl px-4 py-3 text-sm font-manrope text-neutral-0 placeholder:text-neutral-400 bg-container transition-colors duration-150 outline-none resize-y min-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      state: {
        default:
          'border border-neutral-800 hover:border-neutral-700 focus:border-primary-400 focus:ring-2 focus:ring-primary-500',
        error:
          'border border-red-500/70 hover:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/30',
        success:
          'border border-green-500/70 hover:border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/30',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  },
);

export interface TextareaProps
  extends
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  /** Label displayed above the textarea */
  label?: string;
  /** Error message displayed below the textarea */
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, state, label, error, id, ...props }, ref) => {
    const textareaState = error ? 'error' : state;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <Typography variant="label" className="text-neutral-100">
            {label}
          </Typography>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(textareaVariants({ state: textareaState }), className)}
          {...props}
        />
        {error && (
          <Typography variant="caption" as="span" className="text-red-400">
            {error}
          </Typography>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export default Textarea;
