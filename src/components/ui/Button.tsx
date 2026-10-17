import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

export interface ButtonProps extends ComponentProps<'button'>, ButtonStyleProps {}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-strong',
  secondary: 'border border-line bg-surface-2 text-fg hover:border-line-strong',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-4 text-sm',
  md: 'h-11 gap-2 px-5 text-sm',
  lg: 'h-13 gap-2 px-6 text-base',
  icon: 'size-10',
};

/** Button styles, also for links that should look like buttons */
export const buttonClassName = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonStyleProps = {}): string =>
  cn(
    'inline-flex shrink-0 items-center justify-center rounded-full font-medium transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:pointer-events-none disabled:opacity-40',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  );

export function Button({ variant, size, fullWidth, type = 'button', className, ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName({ variant, size, fullWidth, className })} {...props} />;
}
