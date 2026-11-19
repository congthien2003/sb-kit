'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Typography } from '@/components/typography';

const inputVariants = cva(
  // Base styles
  'w-full rounded-xl px-4 py-3 text-sm font-manrope text-neutral-0 placeholder:text-neutral-400 bg-container transition-colors duration-150 outline-none disabled:opacity-50 disabled:cursor-not-allowed',
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

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Label displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Icon element rendered inside the input (left side) */
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, state, label, error, icon, id, ...props }, ref) => {
    const inputState = error ? 'error' : state;
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <Typography variant="label" className="text-neutral-100">
            {label}
          </Typography>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              inputVariants({ state: inputState }),
              icon ? 'pl-11' : '',
              className,
            )}
            {...props}
          />
        </div>
        {error && (
          <Typography variant="caption" as="span" className="text-red-400">
            {error}
          </Typography>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
