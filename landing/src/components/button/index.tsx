import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Define button variants using CVA (Class Variance Authority)
const buttonVariants = cva(
  // Base styles - áp dụng cho tất cả variants
  'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-transparent',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-white border-transparent hover:opacity-90 active:opacity-80 hover:bg-white hover:border-primary hover:text-primary',
        secondary:
          'bg-secondary text-black border-transparent hover:border-secondary hover:opacity-90 active:bg-gray-50',
        white:
          'bg-white text-primary border-transparent hover:opacity-90 active:bg-gray-50',
        outline:
          'bg-transparent text-white border-white hover:opacity-90 active:bg-gray-20 hover:bg-primary hover:text-white',
        'outline-secondary':
          'bg-transparent text-white border-white hover:opacity-90 active:bg-gray-20 hover:bg-secondary hover:text-black',
        ghost:
          'bg-transparent text-primary border-transparent hover:bg-gray-100 active:bg-gray-200',
        danger:
          'bg-red-600 text-white border-transparent hover:bg-red-700 active:bg-red-800',
        'danger-outline':
          'bg-white text-red-600 border-red-600 hover:bg-red-50 active:bg-red-100',
        black:
          'bg-neutral-950 text-neutral-0 hover:bg-neutral-900 active:bg-neutral-950',
      },
      size: {
        sm: 'text-sm px-3 py-1.5',
        md: 'text-sm md:text-base px-4 py-2',
        lg: 'text-base md:text-lg px-5 py-3',
        icon: 'h-8 w-8 min-w-0 p-0 md:h-10 md:w-10',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-fit',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Nội dung bên trong button
   */
  children: React.ReactNode;
  /**
   * Icon hiển thị bên trái text
   */
  leftIcon?: React.ReactNode;
  /**
   * Icon hiển thị bên phải text
   */
  rightIcon?: React.ReactNode;
  /**
   * Trạng thái loading
   */
  isLoading?: boolean;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Thuộc tính as để render button như link hoặc element khác
   */
  asChild?: boolean;
}

/**
 * Button Component
 *
 * @example
 * ```tsx
 * // Primary button
 * <Button variant="primary">Click me</Button>
 *
 * // Secondary button với icon
 * <Button variant="secondary" leftIcon={<Icon />}>
 *   Submit
 * </Button>
 *
 * // Loading state
 * <Button isLoading>Processing...</Button>
 *
 * // Full width button
 * <Button fullWidth size="lg">Full Width</Button>
 * ```
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      children,
      leftIcon,
      rightIcon,
      isLoading = false,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}

        {/* <span className={`flex-1`}> */}
        {children}
        {/* </span> */}

        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
export { buttonVariants };
