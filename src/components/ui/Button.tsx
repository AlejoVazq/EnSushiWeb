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

/** primary is the crema plate (one per screen); secondary is outlined; ghost is text */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-washi text-sumi hover:bg-washi/90',
  secondary: 'border border-hairline-strong text-washi hover:border-washi hover:bg-sumi-1',
  ghost: 'text-washi-muted hover:bg-sumi-2 hover:text-washi',
};

/** Every size is at least 44px tall, thumb-sized */
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-11 gap-1.5 rounded-[10px] px-3.5 text-sm',
  md: 'h-11 gap-2 rounded-[10px] px-4 text-sm',
  lg: 'h-14 gap-2 rounded-2xl px-6 text-base',
  icon: 'size-11 rounded-full',
};

/** Button styles, also for links that should look like buttons */
export const buttonClassName = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonStyleProps = {}): string =>
  cn(
    'inline-flex shrink-0 items-center justify-center font-bold transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi',
    'disabled:pointer-events-none disabled:opacity-40',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  );

export function Button({ variant, size, fullWidth, type = 'button', className, ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName({ variant, size, fullWidth, className })} {...props} />;
}
